const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const wsm = new WebSocket.Server({ port: 8090 });
let nodeCounter = 0;

console.log("Serveur running on port 8080")

const nodePool = {};

let dataset = [];
const USE_DATASET_REPLICATION = process.env.USE_DATASET_REPLICATION ?? true; // est ce que les données sont sur plusieurs noeuds
const REPLICATION_FACTOR = process.env.REPLICATION_FACTOR ?? 1 // pourcentage du dataset présent sur chaque noeud

let isolationForestParameters = {};
let trees = [];

let predictions = {}
let predictionsCounter = {}
let predictionsCount = 0;

let controllers = [];

let tempDatas = [];

function checkNodesAndController() {
    Object.keys(nodePool).map(key => {
        try {
            nodePool[key].send("test")
        } catch (e) {
            delete nodePool[key]
        }
    });

    controllers = controllers.filter((con) => {
        try {
            con.send("test");
            return true
        } catch (e) {
            return false
        }
    });
}

// connexion au master
wsm.on("connection", async (masterWs) => {

    controllers.push(masterWs)

    masterWs.on("message", async (msg) => {
        let parsedMsg = {};
        checkNodesAndController();

        try {
            parsedMsg = JSON.parse(msg);
        } catch (e) {
            return;
        }

        // re-init du jeu de données
        if (parsedMsg['type'] == "reset-dataset") {
            dataset = [];
            Object.keys(nodePool).map(connection => nodePool[connection].send(msg))
        }

        // ajout d'une ligne au DS
        if (parsedMsg['type'] == "add-dataset-line") {
            if (USE_DATASET_REPLICATION) {
                // la ligne est copié sur tous les noeuds
                dataset.push(parsedMsg['content']);
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

            console.log("je lance l'entrainement")
            const trees = await trainTrees(
                isolationForestParameters['n_trees'],
                isolationForestParameters['n_samples'],
                isolationForestParameters['extended']
            );
            console.log("c'est fait")

            // tous les arbres ont été entrainé --> on envoie les arbres au controller
            console.log("send trees to controller")
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
    console.log("Nouveau noeud connecté !");
    console.log("nom du noeud: ", nodeId)
    console.log(Object.keys(nodePool).length + " noeuds en ligne");


    ws.on("close", () => {
        delete nodePool[nodeId];
        console.log("Noeud " + nodeId + " déconnecté")
        console.log(Object.keys(nodePool).length + " noeuds en ligne");
    });

    ws.on("message", (msg) => {
        checkNodesAndController();
    })
});

async function performIsolationForest(trees, datas = null) {
    return new Promise((resolve) => {
        const randomUid = Math.floor(Math.random()*10000);
        if (typeof datas == "undefined" || datas == null) {
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "perform-isolation-forest",
                trees: trees,
                callbackUid: randomUid
            })));
    
        } else {
            let batchSize = Math.floor(datas.length / nodePool.length);
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
        let predictions = {};

        Object.keys(nodePool).map((connection, i) => {
            try {
                const parsed = JSON.parse(msg);
                if (parsed["type"] == "performed-isolation-forest-" + randomUid) {
                    let currentPreds = parsed['predictions']
                    predictionsCount += 1;
        
                    Object.keys(currentPreds).map((key) => {
                        predictions[key] = currentPreds[key]
                    });
        
                    console.log("performed isolation forest " + predictionsCount + "/" + Object.keys(nodePool).length);
        
                    if (predictionsCount == Object.keys(nodePool).length) {
                        resolve(predictions);
                    }
                    
                }
            } catch (e) {}
        });
    })
}

async function trainTrees(n_trees, n_samples, use_extended, refetchDatas = true) {

    return new Promise((resolve, reject) => {

        let trees = [];
        const randomUid = Math.floor(Math.random()*10000);

        Object.keys(nodePool).map(async (connection) => {

            if (refetchDatas) {
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
            

            nodePool[connection].on("message", async (msg) => {

                try {
                    const parsed = JSON.parse(msg);
                    if (parsed["type"] == "trained-isolation-forest-" + randomUid) {

                        console.log("trained tree, " + trees.length + "/" + n_trees)
                        trees.push(parsed["tree"]);

                        if (trees.length >= n_trees) {
                            resolve(trees);
                        } else {
                            if (refetchDatas) {
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
                        }
                    }
                }
                catch (e) {}
            });
        });
    })
}

async function createSubDataset(sampleCount) {
    return new Promise((resolve, rej) => {
        let val = Math.floor(sampleCount / Object.keys(nodePool).length + 1);
        let nodesDatas = [];
        const randomUid = Math.floor(Math.random()*10000);
        console.log("demande de données");
        Object.keys(nodePool).map((connection, index) => {
            nodePool[connection].send(JSON.stringify({
                type: "ask-for-datas",
                value: val,
                callbackUid: randomUid
            }));
            nodePool[connection].on("message", (msg) => {
                try {
                    const parsedMsg = JSON.parse(msg);
                    if (parsedMsg["type"] == "dataset-sub-sample-" + randomUid) {
                        nodesDatas = [...nodesDatas, ...parsedMsg["datas"]];
                        console.log("les noeuds m'ont renvoyé les données (" + nodesDatas.length + "/" + sampleCount + ")")
                        if (nodesDatas.length >= sampleCount) {
                            resolve(nodesDatas);
                        }
                    }
                } catch (e) {}
            })
        })
    });
}