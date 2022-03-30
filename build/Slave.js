System.register(["os", "ws", "./isolationTree"], function (exports_1, context_1) {
    "use strict";
    var _a, os_1, ws_1, isolationTree_1, cpuData, url, connection, dataset, trees, useExtended;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (os_1_1) {
                os_1 = os_1_1;
            },
            function (ws_1_1) {
                ws_1 = ws_1_1;
            },
            function (isolationTree_1_1) {
                isolationTree_1 = isolationTree_1_1;
            }
        ],
        execute: function () {
            cpuData = os_1["default"].cpus();
            url = (_a = process.env.clusterAdress) !== null && _a !== void 0 ? _a : 'ws://localhost:8080';
            connection = new ws_1["default"](url);
            dataset = [];
            trees = [];
            useExtended = false;
            connection.on("open", function () {
                console.log("Connected to cluster");
                connection.send(JSON.stringify({
                    type: "node-connect"
                }));
            });
            connection.on("message", function (msg) {
                var _a;
                var parsedMsg = null;
                try {
                    parsedMsg = JSON.parse(msg);
                }
                catch (e) {
                    return;
                }
                if (parsedMsg['type'] == "reset-dataset") {
                    dataset = [];
                    console.log("reset du dataset");
                }
                if (parsedMsg['type'] == "add-dataset-line") {
                    dataset.push(parsedMsg['content']);
                    console.log("ajout d'une ligne au dataset");
                    console.log("taille du dataset : " + dataset.length);
                }
                if (parsedMsg['type'] == "train-isolation-forest") {
                    console.log("creation d'un arbre d'isolation");
                    useExtended = parsedMsg['extended'];
                    var tree = isolationTree_1.buildIsolationTree(isolationTree_1.buildSubSample(Math.min(parsedMsg['n_samples'], dataset.length), dataset), useExtended);
                    console.log(tree);
                    trees.push(tree);
                    connection.send(JSON.stringify({
                        type: "trained-isolation-forest",
                        tree: tree
                    }));
                    console.log("trainned tree");
                }
                if (parsedMsg['type'] == "perform-isolation-forest") {
                    var trees_1 = parsedMsg['trees'];
                    var datas = (_a = parsedMsg["datas"]) !== null && _a !== void 0 ? _a : dataset;
                    var treesDepth = 0;
                    var predictions = {};
                    for (var i = 0; i < trees_1.length; i++) {
                        treesDepth += isolationTree_1.getTreeAverageDepth(trees_1[i]);
                        for (var e = 0; e < datas.length; e++) {
                            predictions[e] = typeof predictions[e] == "undefined" ? 0 : predictions[e];
                            var pred = isolationTree_1.getTreesPrediction(trees_1[i], datas[e], useExtended);
                            predictions[e] += pred;
                        }
                    }
                    for (var e = 0; e < datas.length; e++) {
                        predictions[e] = isolationTree_1.scoreTreePrediction(predictions[e], treesDepth);
                    }
                    connection.send(JSON.stringify({
                        type: "performed-isolation-forest",
                        predictions: predictions
                    }));
                }
            });
        }
    };
});
//# sourceMappingURL=Slave.js.map