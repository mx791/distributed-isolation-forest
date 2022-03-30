System.register([], function (exports_1, context_1) {
    "use strict";
    var computeConfusionMatrix, AUC;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            computeConfusionMatrix = function (regularDatasScores, anomaliesScore, treshold) {
                var newConfusionMatrix = {
                    trueNegatives: 0,
                    truePositives: 0,
                    falseNegatives: 0,
                    falsePositives: 0
                };
                for (var i = 0; i < regularDatasScores.length; i++) {
                    if (regularDatasScores[i] > treshold) {
                        newConfusionMatrix.falsePositives += 1;
                    }
                    else {
                        newConfusionMatrix.trueNegatives += 1;
                    }
                }
                for (var i = 0; i < anomaliesScore.length; i++) {
                    if (anomaliesScore[i] > treshold) {
                        newConfusionMatrix.truePositives += 1;
                    }
                    else {
                        newConfusionMatrix.falseNegatives += 1;
                    }
                }
                return newConfusionMatrix;
            };
            AUC = function (regularDatasScores, anomaliesScore) {
                var splits = 20;
                let;
            };
        }
    };
});
//# sourceMappingURL=ModelEvaluation.js.map