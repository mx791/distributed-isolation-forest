const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let nodeCounter = 1;

console.log("Serveur running on port 8080")

const nodePool = {};

let dataset = [];

let isolationForestParameters = {};
let trees = [];

let predictions = {}
let predictionsCounter = {}

// en cas de nouvelle connexion
wss.on("connection", (ws) => {

    const nodeId = nodeCounter;
    nodeCounter += 1;
    nodePool[nodeId] = ws;
    console.log("Nouveau noeud connecté !");
    console.log(Object.keys(nodePool).length + " noeuds en ligne");

    // on envoie les données au nouveau noeud
    dataset.map(line => ws.send(JSON.stringify({
        type: "add-dataset-line",
        content: line
    })));

    ws.on("close", () => {
        delete nodePool[nodeId];
        console.log("Noeud " + nodeId + " déconnecté")
        console.log(Object.keys(nodePool).length + " noeuds en ligne");
    })

    ws.on("message", (msg) => {

        let parsedMsg = {};

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
            dataset.push(parsedMsg['content']);
            Object.keys(nodePool).map(connection => nodePool[connection].send(msg))
        }

        // declenche l'entrainement de l'IF
        if (parsedMsg['type'] == "train-isolation-forest") {

            // on extrait les params
            isolationForestParameters['n_trees'] = parsedMsg['n_trees'] ?? 200;
            isolationForestParameters['n_samples'] = parsedMsg['n_samples'] ?? Math.min(256, dataset.length);
            isolationForestParameters['extended'] = parsedMsg['extended'] ?? true;

            // repartit les calculs sur les noeuds connectés
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "train-isolation-forest",
                ...isolationForestParameters
            })));
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
                // tous les arbres ont été entrainé --> on test le modèle
                Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                    type: "perform-isolation-forest"
                })));
            }
        }
        
        // on test les arbres sur le DS
        if (parsedMsg['type'] == "perform-isolation-forest") {
            predictions = {};
            predictionsCounter = {}
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "perform-isolation-forest"
            })));
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
