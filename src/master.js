const WebSocket = require('ws');
const { getNextUid, writeLog, checkNodesAndController } = require("./masterUtils");

const wss = new WebSocket.Server({ port: 8080 });
const wsm = new WebSocket.Server({ port: 8090 });
let nodeCounter = 0;

console.log("Serveur running on port 8080")

const nodePool = {};

let dataset = [];

const USE_DATASET_REPLICATION = process.env.USE_DATASET_REPLICATION ?? false; // est ce que les données sont sur plusieurs noeuds
const REPLICATION_FACTOR = process.env.REPLICATION_FACTOR ?? 1 // nombre d'occurance d'une ligne
const REFETCH_DATAS = process.env.REFETCH_DATAS ?? false

let isolationForestParameters = {};
let controllers = [];

let routeListeners = [];
let routesToBeRemoved = [];

// connexion au master --> controller
wsm.on("connection", async (masterWs) => {

    controllers.push(masterWs)
    masterWs.on("message", async (msg) => {
        let parsedMsg = {};
        checkNodesAndController(nodePool, controllers);
        
        try {
            parsedMsg = JSON.parse(msg);
        } catch (e) {
            return;
        }

        // re-init du jeu de données
        if (parsedMsg['type'] == "reset-dataset") {
            dataset = [];
            writeLog("dataset-reset", "Réinitialisation du jeu de données")
            Object.keys(nodePool).map(connection => nodePool[connection].send(msg))
        }

        // ajout d'une ligne au DS
        if (parsedMsg['type'] == "add-dataset-line") {
            if (USE_DATASET_REPLICATION) {
                // la ligne est copié sur tous les noeuds
                dataset.push(parsedMsg['content']);
                for (let i=0; i<REPLICATION_FACTOR; i++) {
                    let indx = Math.floor(Math.random()*Object.keys(nodePool).length);
                    nodePool[connection].send(msg)
                }
                Object.keys(nodePool).map(connection => {
                    if (Math.random() < REPLICATION_FACTOR) {
                        nodePool[connection].send(msg)
                    }
                });
            } else {
                // la ligne est transmise à un seul noeud choisi au hasard
                if (Object.keys(nodePool).length == 0) {
                    return;
                }
                while (true) {
                    const indx = Math.floor(Math.random()*Object.keys(nodePool).length);
                    if (typeof nodePool[indx] != "undefined") {
                        nodePool[indx].send(msg);
                        return;
                    }
                }
            }
        }

        // declenche l'entrainement de l'IF
        if (parsedMsg['type'] == "train-isolation-forest") {

            const uid = parsedMsg["uid"];
            // on extrait les params
            isolationForestParameters['n_trees'] = parsedMsg['n_trees'] ?? 200;
            isolationForestParameters['n_samples'] = parsedMsg['n_samples'] ?? 256;
            isolationForestParameters['extended'] = parsedMsg['extended'] ?? true;

            writeLog("train-isolation-forest", "Entrainement de "
                + isolationForestParameters['n_trees'] + " arbres avec n=" + 
                isolationForestParameters['n_samples'] + (isolationForestParameters['extended'] ? " en mode extended" : ""))

            const trees = await trainTrees(
                isolationForestParameters['n_trees'],
                isolationForestParameters['n_samples'],
                isolationForestParameters['extended']
            );
            writeLog("train-isolation-forest", "entrainememnt terminé")

            // tous les arbres ont été entrainé --> on envoie les arbres au controller
            controllers.map(connection => connection.send(JSON.stringify({
                type: "trained-isolation-forest-" + uid,
                content: trees
            })));
        }

        // on test les arbres sur le DS
        if (parsedMsg['type'] == "perform-isolation-forest") {
            predictions = {};
            predictionsCounter = {}
            let trees = parsedMsg['trees'];
            predictionsCount = 0;

            const results = await performIsolationForest(trees, parsedMsg["datas"]);

            controllers.map(connection => connection.send(JSON.stringify({
                type: "performed-isolation-forest",
                predictions: results
            })));
        }
    })
})

// en cas de nouvelle connexion d'un noeud
wss.on("connection", (ws) => {

    let nodeId = nodeCounter;
    nodeCounter += 1;
    nodePool[nodeId] = ws;
    writeLog("node-connection", "Nouveau noeud connecté, total: " + Object.keys(nodePool).length);

    ws.on("close", () => {
        delete nodePool[nodeId];
        console.log("Noeud " + nodeId + " déconnecté")
        console.log(Object.keys(nodePool).length + " noeuds en ligne");
    });

    ws.on("message", (msg) => {
        // a chaque msg on verifie si les noeuds sont tjrs connectés
        checkNodesAndController(nodePool, controllers);

        const parsed = JSON.parse(msg);

        // clean des listeners
        routeListeners = routeListeners.filter((itm) => !routesToBeRemoved.includes(itm.msgType))
        routeListeners.map(async (itm, i) => {
            if (itm.msgType !== parsed["type"]) {
                return true;
            }
            const shouldKeep = await itm.callable(parsed, ws);
            if (!shouldKeep) {
                routesToBeRemoved.push(itm.msgType)
            }
        });
    })
});

/**
 * Test des données avec les arbres
 */
async function performIsolationForest(trees, datas = null) {
    writeLog("perform-isolation-forest", "");
    let start = performance.now()
    return new Promise((resolve) => {
        const randomUid = getNextUid();
        if (typeof datas == "undefined" || datas == null) {
            // si les aucune donnée n'est fournie, les noeuds utilisent leur dataset
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "perform-isolation-forest",
                trees: trees,
                callbackUid: randomUid
            })));
    
        } else {
            let batchSize = Math.floor(datas.length / nodePool.length);
            // surcharge les données des noeuds
            Object.keys(nodePool).map((connection, i) => {
                const subDatas = i == datas.slice(i*batchSize, (i+1)*batchSize);
                connection.send(JSON.stringify({
                    type: "perform-isolation-forest",
                    trees: trees,
                    datas: subDatas,
                    callbackUid: randomUid
                }));
            });
        }

        let predictionsCount = 0;
        let predictions = [];

        routeListeners.push({
            msgType: "performed-isolation-forest-" + randomUid,
            callable: (parsed) => {
                let currentPreds = parsed['predictions']
                predictionsCount += 1;

                currentPreds.map((value, i) => {
                    predictions.push(value)
                });
    
                writeLog("performed-isolation-forest", predictionsCount + "/" + Object.keys(nodePool).length)
                
                if (predictionsCount == Object.keys(nodePool).length) {
                    resolve(predictions);
                    let end = performance.now()
                    writeLog("performed-isolation-forest ", (end-start) + "ms")
                    return false;
                }
                return true;
            }
        })
    })
}

/**
 * Entraine les arbre d'isolation
 */
async function trainTrees(n_trees, n_samples, use_extended) {
    return new Promise((resolve, reject) => {
        let trees = [];
        const randomUid = getNextUid();
        let start = performance.now();
        Object.keys(nodePool).map(async (connection) => {

            if (REFETCH_DATAS) {
                // cas où les données sont récupérés des noeuds à chaque arbre
                const datas = await createSubDataset(n_samples);
                nodePool[connection].send(JSON.stringify({
                    type: "train-isolation-forest",
                    n_samples,
                    extended: use_extended,
                    callbackUid: randomUid,
                    datas
                }));
            } else {
                nodePool[connection].send(JSON.stringify({
                    type: "train-isolation-forest",
                    n_samples,
                    extended: use_extended,
                    callbackUid: randomUid
                }));
            }
        });

        routeListeners.push({
            msgType: "trained-isolation-forest-" + randomUid,
            callable: async (parsed, connection) => {
                trees.push(parsed["tree"][0]);
                writeLog("trained-tree", trees.length + "/" + n_trees);

                if (trees.length >= n_trees) {
                    resolve(trees);
                    let end = performance.now()
                    writeLog("trained-isolation-forest", (end-start) + "ms")
                    return false;
                }
                const trainParameters = {
                    type: "train-isolation-forest",
                    n_samples,
                    extended: use_extended,
                    callbackUid: randomUid
                };

                if (REFETCH_DATAS) {
                    const datas = await createSubDataset(n_samples);
                    trainParameters["datas"] = datas;
                }

                connection.send(JSON.stringify(trainParameters));
                return true;
            }
        });        
    })
}

/**
 * Créer un jeu de données de taille n
 * Demande des données à tous les noeuds et attend la réponse
 */
async function createSubDataset(sampleCount) {
    return new Promise((resolve, rej) => {
        // combien de données par noeud
        let val = Math.floor(sampleCount / Object.keys(nodePool).length);
        let nodesDatas = [];
        const randomUid = getNextUid();
        writeLog("ask-for-data", "n=" + sampleCount);
        Object.keys(nodePool).map((connection, index) => {
            // demande les données
            nodePool[connection].send(JSON.stringify({
                type: "ask-for-datas",
                value: val+1,
                callbackUid: randomUid
            }));
        });
        // attente de la réponse
        routeListeners.push({
            msgType: "dataset-sub-sample-" + randomUid,
            callable: async (parsedMsg) => {
                nodesDatas = [...nodesDatas, ...parsedMsg["datas"]];
                writeLog("node-sent-datas", nodesDatas.length + "/" + sampleCount)
                if (nodesDatas.length >= sampleCount) {
                    // si tout est là on renvoie le tableau
                    resolve(nodesDatas);
                    return false;
                }
                return true;
            }
        });
    });
}