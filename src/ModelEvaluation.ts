import { IsolationTree } from "./isolationTree";

type ConfusionMatrix = {
    trueNegatives: number,
    truePositives: number,
    falseNegatives: number, 
    falsePositives: number
}

/**
 * Calcule la matrice de confusion sur les predictions en fonction du seuil de classification
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

const computeAccuracy = (regularDatasScores: number[], anomaliesScore: number[], treshold: number): number => {

    let acc = 0;

    for (let i=0; i<regularDatasScores.length; i++) {
        acc += regularDatasScores[i] < treshold;
    }

    for (let i=0; i<anomaliesScore.length; i++) {
        acc += regularDatasScores[i] > treshold;
    }

    return acc / (anomaliesScore.length + regularDatasScores.length);
}

const AUC = (regularDatasScores: number[], anomaliesScore: number[]) => {
    let splits = 20;
    let 
}