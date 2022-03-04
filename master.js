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

wss.on("connection", (ws) => {

    const nodeId = nodeCounter;
    nodeCounter += 1;
    nodePool[nodeId] = ws;
    console.log("Nouveau noeud connecté !");
    console.log(Object.keys(nodePool).length + " noeuds en ligne");

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

        if (parsedMsg['type'] == "reset-dataset") {
            dataset = [];
            Object.keys(nodePool).map(connection => nodePool[connection].send(msg))
        }

        if (parsedMsg['type'] == "add-dataset-line") {
            dataset.push(parsedMsg['content']);
            Object.keys(nodePool).map(connection => nodePool[connection].send(msg))
        }

        if (parsedMsg['type'] == "train-isolation-forest") {

            isolationForestParameters['n_trees'] = parsedMsg['n_trees'] ?? 200;
            isolationForestParameters['n_samples'] = parsedMsg['n_samples'] ?? Math.min(256, dataset.length);
            isolationForestParameters['extended'] = parsedMsg['extended'] ?? true;

            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "train-isolation-forest",
                ...isolationForestParameters
            })));
        }

        if (parsedMsg['type'] == "trained-isolation-forest") {
            trees.push(parsedMsg['tree']);
            console.log("entrainement de l'isolation forest : " + trees.length + "/" + isolationForestParameters.n_trees);
            if (trees.length < isolationForestParameters.n_trees) {
                ws.send(JSON.stringify({
                    type: "train-isolation-forest",
                    ...isolationForestParameters
                }));
            } else {
                Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                    type: "perform-isolation-forest"
                })));
            }
        }
        
        if (parsedMsg['type'] == "perform-isolation-forest") {
            predictions = {};
            predictionsCounter = {}
            Object.keys(nodePool).map(connection => nodePool[connection].send(JSON.stringify({
                type: "perform-isolation-forest"
            })));
        }

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
