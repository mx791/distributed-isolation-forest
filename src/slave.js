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
        console.log("reset du dataset");
    }

    if (parsedMsg['type'] == "add-dataset-line") {
        dataset.push(parsedMsg['content']);
        //console.log("ajout d'une ligne au dataset")
        //console.log("taille du dataset : " + dataset.length)
    }

    if (parsedMsg['type'] == "train-isolation-forest") {
        const uid = parsedMsg["callbackUid"];
        useExtended = parsedMsg['extended'];
        const nTrees = parsedMsg['nTrees'] ?? 1;
        let trees = [];
        let startTime = performance.now();
        console.log("entrainement des arbres")
        for (let i=0; i<nTrees; i++) {
            const datas = typeof parsedMsg['datas'] != "undefined" ? parsedMsg['datas'] : buildSubSample(
                Math.min(parsedMsg['n_samples'], dataset.length), dataset
            );
            const tree = buildIsolationTree(datas, useExtended);
            trees.push(tree);
            console.log("trainned tree")
        }
        let end = performance.now();
        console.log("trained " + nTrees + " in " + (end-startTime))
        connection.send(JSON.stringify({
            type: "trained-isolation-forest-" + uid,
            tree: trees
        }));
        console.log("trees sent")
    }

    if (parsedMsg['type'] == "perform-isolation-forest") {

        const trees = parsedMsg['trees'];
        const datas = parsedMsg["datas"] ?? dataset;
        const uid = parsedMsg["callbackUid"];

        let treesDepth = 0;
        let predictions = {};

        console.log("Perform isolation forest with " + trees.length + " trees on " + datas.length + " lines")

        for (let i=0; i<trees.length; i++) {
            treesDepth += getTreeAverageDepth(trees[i]);
            for (let e=0; e<datas.length; e++) {
                predictions[e] = typeof predictions[e] == "undefined" ? 0 : predictions[e];
                let dataVector = datas.map(line => line.vector)
                const pred = getTreesPrediction(trees[i], dataVector[e], useExtended);
                predictions[e] += pred;
            }
            console.log("performed with trees " + (i+1) + "/" + trees.length);
        }

        console.log("done")

        let finalDatasWithScore = Object.keys(predictions).map((key, id) => {
            return {
                id: datas[key].id,
                score: scoreTreePrediction(predictions[key], treesDepth),
                vector: datas[id].vector
            }
        });

        connection.send(JSON.stringify({
            type: "performed-isolation-forest-" + uid,
            predictions: finalDatasWithScore
        }));
    }

    if (parsedMsg['type'] == "ask-for-datas") {
        const count = parsedMsg["value"];
        const uid = parsedMsg["callbackUid"];
        const subDatas = buildSubSample(count, dataset);
        connection.send(JSON.stringify({
            type: "dataset-sub-sample-" + uid,
            datas: subDatas
        }));
    }
})
