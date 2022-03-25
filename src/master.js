const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const wsm = new WebSocket.Server({ port: 8090 });
let nodeCounter = 0;

console.log("Serveur running on port 8080")

const nodePool = {};

let dataset = [];
const USE_DATASET_REPLICATION = process.env.USE_DATASET_REPLICATION ?? true; // est ce que les données sont sur plusieurs noeuds
const REPLICATION_FACTOR = process.env.REPLICATION_FACTOR ?? 1/2; // pourcentage du dataset présent sur chaque noeud

let isolationForestParameters = {};
let trees = [];

let predictions = {}
let predictionsCounter = {}

let controllers = [];

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
wsm.on("connection", (masterWs) => {

    controllers.push(masterWs)

    masterWs.on("message", (msg) => {
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
                    if (Math.random() > REPLICATION_FACTOR) {
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

            // on extrait les params
            isolationForestParameters['n_trees'] = parsedMsg['n_trees'] ?? 200;
            isolationForestParameters['n_samples'] = parsedMsg['n_samples'] ?? 256;
            isolationForestParameters['extended'] = parsedMsg['extended'] ?? true;

            // repartit les calculs sur les noeuds connectés
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "train-isolation-forest",
                ...isolationForestParameters
            })));
        }


        // on test les arbres sur le DS
        if (parsedMsg['type'] == "perform-isolation-forest") {
            predictions = {};
            predictionsCounter = {}
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "perform-isolation-forest"
            })));
        }
    })
})

// en cas de nouvelle connexion d'un noeud
wss.on("connection", (ws) => {

    let nodeId = nodeCounter;
    // on envoie les données au nouveau noeud
    if (USE_DATASET_REPLICATION) {
        dataset.map(line => ws.send(JSON.stringify({
            type: "add-dataset-line",
            content: line
        })));
    }
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

        let parsedMsg = {};

        try {
            parsedMsg = JSON.parse(msg);
        } catch (e) {
            return;
        }

        // un noeud a renvoyé un arbre
        if (parsedMsg['type'] == "trained-isolation-forest") {
            trees.push(parsedMsg['tree']);
            console.log("entrainement de l'isolation forest : " + trees.length + "/" + isolationForestParameters.n_trees);
            // si il manquent des arbres --> on relance l'entrainement d'un arbre
            if (trees.length < isolationForestParameters.n_trees) {
                ws.send(JSON.stringify({
                    type: "train-isolation-forest",
                    ...isolationForestParameters
                }));
            } else {
                // tous les arbres ont été entrainé --> on envoie les arbres au controller
                console.log("send trees to controller")
                controllers.map(connection => connection.send(JSON.stringify({
                    type: "trained-isolation-forest",
                    content: trees
                })));
            }
        }

        // l'algo a été testé
        if (parsedMsg['type'] == "performed-isolation-forest") {
            let currentPreds = parsedMsg['predictions']
            Object.keys(currentPreds).map((key) => {
                if (predictions[key] == null) {
                    predictions[key] = 0;
                    count[key] = 0
                }
                predictions[key] +=  currentPreds[key]
                predictionsCounter[key] += 1
            });
        }

    })
});
