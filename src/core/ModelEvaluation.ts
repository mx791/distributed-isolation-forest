import { IsolationTree } from "./isolationTree";

type ConfusionMatrix = {
    trueNegatives: number,
    truePositives: number,
    falseNegatives: number, 
    falsePositives: number
}

/**
 * Calcul al matrice de confusion sur les predictions
 */
const computeConfusionMatrix = (regularDatasScores: number[], anomaliesScore: number[], treshold: number): ConfusionMatrix => {
    
    let newConfusionMatrix = {
        trueNegatives: 0,
        truePositives: 0,
        falseNegatives: 0, 
        falsePositives: 0
    }

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

const AUC = (regularDatasScores: number[], anomaliesScore: number[]) => {
    let splits = 20;
    let 
}