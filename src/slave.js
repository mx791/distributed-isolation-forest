const os = require("os")
const WebSocket = require('ws');
const { splitDataset, buildIsolationTree, buildSubSample, getTreeAverageDepth, getTreesPrediction, scoreTreePrediction } = require("./isolationTree");

const cpuData = os.cpus()

const url = process.env.clusterAdress ?? 'ws://localhost:8080';
const connection = new WebSocket(url)

let dataset = [];
let trees = [];
let useExtended = false;

connection.on("open", () => {
    console.log("Connected to cluster")
    connection.send(JSON.stringify({
        type: "node-connect"
    }));
});


connection.on("message", (msg) => {

    let parsedMsg = null;
    
    try {
        parsedMsg = JSON.parse(msg);
    } catch(e) {
        return;
    }

    if (parsedMsg['type'] == "reset-dataset") {
        dataset = [];
        console.log("reset du dataset")
    }

    if (parsedMsg['type'] == "add-dataset-line") {
        dataset.push(parsedMsg['content']);
        console.log("ajout d'une ligne au dataset")
        console.log("taille du dataset : " + dataset.length)
    }

    if (parsedMsg['type'] == "train-isolation-forest") {
        console.log("creation d'un arbre d'isolation")
        useExtended = parsedMsg['extended'];
        const tree = buildIsolationTree(
            buildSubSample(
                Math.min(parsedMsg['n_samples'], dataset.length), dataset
            ), useExtended
        );
        console.log(tree)
        trees.push(tree);
        connection.send(JSON.stringify({
            type: "trained-isolation-forest",
            tree
        }));
        console.log("trainned tree")
    }

    if (parsedMsg['type'] == "perform-isolation-forest") {

        const trees = parsedMsg['trees'];
        const datas = parsedMsg["datas"] ?? dataset;

        let treesDepth = 0;
        let predictions = {};

        for (let i=0; i<trees.length; i++) {
            treesDepth += getTreeAverageDepth(trees[i]);
            for (let e=0; e<datas.length; e++) {
                predictions[e] = typeof predictions[e] == "undefined" ? 0 : predictions[e];
                const pred = getTreesPrediction(trees[i], datas[e], useExtended);
                predictions[e] += pred;
            }
        }

        for (let e=0; e<datas.length; e++) {
            predictions[e] = scoreTreePrediction(predictions[e], treesDepth)
        }

        connection.send(JSON.stringify({
            type: "performed-isolation-forest",
            predictions: predictions
        }));
    }
})
