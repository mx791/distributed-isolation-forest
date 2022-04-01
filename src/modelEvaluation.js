
/**
 * Calcul la matrice de confusion sur les predictions
 */
const computeConfusionMatrix = (regularDatasScores, anomaliesScore, treshold) => {
    
    let newConfusionMatrix = {
        trueNegatives: 0,
        truePositives: 0,
        falseNegatives: 0, 
        falsePositives: 0
    };

    for (let i=0; i<regularDatasScores.length; i++) {
        if (regularDatasScores[i] > treshold) {
            newConfusionMatrix.falsePositives += 1;
        } else {
            newConfusionMatrix.trueNegatives += 1;
        }
    }

    for (let i=0; i<anomaliesScore.length; i++) {
        if (anomaliesScore[i] > treshold) {
            newConfusionMatrix.truePositives += 1;
        } else {
            newConfusionMatrix.falseNegatives += 1;
        }
    }

    return newConfusionMatrix;
}

/**
 * Calcul l'AUC pour deux vecteurs de résultat
 */
const AUC = (regularDatasScores, anomaliesScore) => {
    let goodClassified = 0;
    for (let regularIndex=0; regularIndex<regularDatasScores.length; regularIndex++) {
        for (let irrIndex=0; irrIndex<anomaliesScore.length; irrIndex++) {
            goodClassified += regularDatasScores[regularIndex] < anomaliesScore[irrIndex] ? 1 : 0;
        }
    }
    const auc = goodClassified / (regularDatasScores.length * anomaliesScore.length);
    return auc > 0.5 ? auc : 1 - auc;
}

module.exports = {
    AUC, computeConfusionMatrix
}