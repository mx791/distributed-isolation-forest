System.register([], function (exports_1, context_1) {
    "use strict";
    var buildSubSample, splitDataset, splitDatasetExtended, areFirstRowsEquals, cleanDoubles, buildIsolationTree, getTreeAverageDepth, getTreesPrediction, scoreTreePrediction, modelEvaluation, IsolationTree;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            buildSubSample = function (samplesCount, dataset) {
                var subDataset = [];
                var ids = [];
                while (subDataset.length < samplesCount) {
                    var index = Math.floor(Math.random() * dataset.length);
                    if (!ids.includes(index)) {
                        subDataset.push(dataset[index]);
                        ids.push(index);
                    }
                }
                return subDataset;
            };
            exports_1("buildSubSample", buildSubSample);
            splitDataset = function (x) {
                var _a = [[], []], a = _a[0], b = _a[1];
                var splitFeartureId = -1;
                var splitValue = 0;
                x = cleanDoubles(x);
                if (x.length < 2) {
                    return null;
                }
                while ((a.length == 0 || b.length == 0)) {
                    a = [];
                    b = [];
                    splitFeartureId = Math.floor(Math.random() * x[0].length);
                    var extremums = [x[0][splitFeartureId], x[0][splitFeartureId]];
                    for (var i = 0; i < x.length; i++) {
                        if (x[i][splitFeartureId] > extremums[1]) {
                            extremums[1] = x[i][splitFeartureId];
                        }
                        else if (x[i][splitFeartureId] < extremums[0]) {
                            extremums[0] = x[i][splitFeartureId];
                        }
                    }
                    splitValue = Math.random() * (x[1][splitFeartureId] - x[0][splitFeartureId]) + x[0][splitFeartureId];
                    for (var i = 0; i < x.length; i++) {
                        if (x[i][splitFeartureId] > splitValue) {
                            a.push(x[i]);
                        }
                        else {
                            b.push(x[i]);
                        }
                    }
                }
                return [a, b, [splitFeartureId, splitValue]];
            };
            exports_1("splitDataset", splitDataset);
            splitDatasetExtended = function (x) {
                var _a = [[], []], a = _a[0], b = _a[1];
                var normalVector = [];
                var intercept = 0;
                while (a.length == 0 || b.length == 0) {
                    a = [];
                    b = [];
                    normalVector = [];
                    for (var i = 0; i < x[0].length; i++) {
                        normalVector.push(Math.random() - 0.5);
                    }
                    var point = x[Math.floor(Math.random() * x.length)];
                    intercept = 0;
                    for (var i = 0; i < point.length; i++) {
                        intercept += -point[i] * normalVector[i];
                    }
                    for (var i = 0; i < x.length; i++) {
                        var value = 0;
                        for (var e = 0; e < normalVector.length; e++) {
                            value += normalVector[e] * x[i][e];
                        }
                        if (value > intercept) {
                            a.push(x[i]);
                        }
                        else {
                            b.push(x[i]);
                        }
                    }
                }
                return [a, b, [normalVector, intercept]];
            };
            exports_1("splitDatasetExtended", splitDatasetExtended);
            areFirstRowsEquals = function (x) {
                if (x.length < 2) {
                    return false;
                }
                for (var i = 0; i < x[0].length; i++) {
                    if (x[1][i] != x[0][i]) {
                        return false;
                    }
                }
                return true;
            };
            cleanDoubles = function (x) {
                while (areFirstRowsEquals(x) && x.length > 1) {
                    x = x.slice(1, x.length);
                }
                return x;
            };
            buildIsolationTree = function (x, useExtended) {
                if (x.length <= 1) {
                    return null;
                }
                var result = useExtended ? splitDatasetExtended(x) : splitDataset(x);
                if (result == null) {
                    return null;
                }
                var a = result[0], b = result[1], splitMethod = result[2];
                return {
                    split: splitMethod,
                    ifTrue: buildIsolationTree(a, useExtended),
                    ifFalse: buildIsolationTree(b, useExtended)
                };
            };
            exports_1("buildIsolationTree", buildIsolationTree);
            getTreeAverageDepth = function (tree) {
                var sum = 0;
                var count = 0;
                var depth = 1;
                var nextNodes = [tree];
                var _loop_1 = function () {
                    var nextNodes2 = [];
                    nextNodes.map(function (node) {
                        count += 1;
                        sum += depth;
                        if (node.ifTrue != null) {
                            nextNodes2.push(node.ifTrue);
                        }
                        if (node.ifFalse != null) {
                            nextNodes2.push(node.ifFalse);
                        }
                    });
                    nextNodes = nextNodes2;
                    depth += 1;
                };
                while (nextNodes.length != 0) {
                    _loop_1();
                }
                return sum / count;
            };
            exports_1("getTreeAverageDepth", getTreeAverageDepth);
            getTreesPrediction = function (tree, value, useExtended) {
                var depth = 0;
                var nextNode = tree;
                while (nextNode != null) {
                    var right = true;
                    if (useExtended) {
                        var planValue = 0;
                        var _a = nextNode.split, normalVector = _a[0], intercept = _a[1];
                        for (var e = 0; e < normalVector.length; e++) {
                            planValue += normalVector[e] * value[e];
                        }
                        right = planValue > intercept;
                    }
                    else {
                        right = value[nextNode.split[0]] > nextNode.split[1];
                    }
                    if (right) {
                        nextNode = nextNode.ifTrue;
                    }
                    else {
                        nextNode = nextNode.ifFalse;
                    }
                    depth += 1;
                }
                return depth;
            };
            exports_1("getTreesPrediction", getTreesPrediction);
            scoreTreePrediction = function (computedDepth, averageDepth) {
                return Math.pow(2, -computedDepth / averageDepth);
            };
            exports_1("scoreTreePrediction", scoreTreePrediction);
            modelEvaluation = function (trees, useExtended, regularDatas, anomalies) {
                var avgDepth = trees.map(function (tree) { return getTreeAverageDepth(tree); }).reduce(function (acc, value) { return acc + value; });
                var regularPredictions = regularDatas.map(function (values) {
                    var pred = trees
                        .map(function (tree) { return getTreesPrediction(tree, values, useExtended); })
                        .reduce(function (acc, value) { return acc + value; }, 0);
                    return scoreTreePrediction(pred, avgDepth);
                }).sort();
                var anomaliesPredictions = anomalies.map(function (values) {
                    var pred = trees
                        .map(function (tree) { return getTreesPrediction(tree, values, useExtended); })
                        .reduce(function (acc, value) { return acc + value; }, 0);
                    return scoreTreePrediction(pred, avgDepth);
                }).sort().reverse();
                console.log("moyenne des anomalies:", anomaliesPredictions.reduce(function (acc, value) { return acc + value; }, 0) / anomalies.length);
                console.log("moyenne des données régulières:", regularPredictions.reduce(function (acc, value) { return acc + value; }, 0) / regularDatas.length);
            };
            exports_1("modelEvaluation", modelEvaluation);
            IsolationTree = (function () {
                function IsolationTree(dataset, useExtended) {
                    this.node = null;
                    this.useExtended = false;
                    this.useExtended = useExtended;
                    this.node = buildIsolationTree(dataset, useExtended);
                }
                IsolationTree.prototype.getDepth = function () {
                    return getTreeAverageDepth(this.node);
                };
                IsolationTree.prototype.getPrediction = function (value) {
                    return getTreesPrediction(this.node, value, this.useExtended);
                };
                return IsolationTree;
            }());
            exports_1("IsolationTree", IsolationTree);
        }
    };
});
//# sourceMappingURL=isolationTree.js.map