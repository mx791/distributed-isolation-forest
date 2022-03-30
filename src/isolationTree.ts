import { Tree } from "./types";

// créer un sous-échantillon d'un jeu de données
const buildSubSample = (samplesCount: number, dataset: number[][]) : number[][] => {
    let subDataset = [];
    const ids: number[] = [];
    while (subDataset.length < samplesCount) {
        const index: number = Math.floor(Math.random()*dataset.length);
        if (!ids.includes(index)) {
            subDataset.push(dataset[index])
            ids.push(index)
        }
    }
    return subDataset;
}

// Isolation Forest
// créer un split en chsoisissant une variable et un seuil
const splitDataset = (x: number[][]): [number[][], number[][], Array<any>] => {
    let [a, b]: [number[][], number[][]] = [[], []];
    let splitFeartureId: number = -1;
    let splitValue: number = 0;

    x = cleanDoubles(x);

    if (x.length < 2) {
        return null;
    }    

    while (
        (a.length == 0 || b.length == 0)
    ) {

        a = [];
        b = [];

        splitFeartureId = Math.floor(Math.random()*x[0].length);

        // gestion min et max
        const extremums = [x[0][splitFeartureId], x[0][splitFeartureId]];

        for (let i=0; i<x.length; i++) {
            if (x[i][splitFeartureId] > extremums[1]) {
                extremums[1] = x[i][splitFeartureId];
            } else if (x[i][splitFeartureId] < extremums[0]) {
                extremums[0] = x[i][splitFeartureId];
            }
        }

        // split du dataset
        splitValue = Math.random()*(x[1][splitFeartureId] - x[0][splitFeartureId]) + x[0][splitFeartureId];

        for (let i=0; i<x.length; i++) {
            if (x[i][splitFeartureId] > splitValue) {
                a.push(x[i]);
            } else {
                b.push(x[i])
            }
        }
    }

    return [a, b, [splitFeartureId, splitValue]];
}

// Extended Isolation Forest
// Split en créant un hyperplan
const splitDatasetExtended = (x: number[][]): [number[][], number[][], Array<any>] => {

    let [a, b]: [number[][], number[][]] = [[], []];
    let normalVector = [];
    let intercept = 0;

    while (a.length == 0 || b.length == 0) {

        a = [];
        b = [];
        // creation du vecteur normal
        normalVector = [];
        for (let i=0; i<x[0].length; i++) {
            normalVector.push(Math.random()-0.5);
        }

        // point d'intersection
        const point = x[Math.floor(Math.random()*x.length)];
        intercept = 0;
        for (let i=0; i<point.length; i++) {
            intercept += - point[i] * normalVector[i]
        }

        // split du dataset
        for (let i=0; i<x.length; i++) {
            let value = 0;
            for (let e=0; e<normalVector.length; e++) {
                value += normalVector[e] * x[i][e]
            }
            if (value > intercept) {
                a.push(x[i]);
            } else {
                b.push(x[i]);
            }
        }
    }
    return [a, b, [normalVector, intercept]]
}

// vérifie si les deux prmeières lignes d'un jeu de données sont égales
// si ce n'est pas le cas, le jeu de données contient au moins deux lignes diffférentes -> pas isolé
const areFirstRowsEquals = (x: number[][]): boolean => {
    if (x.length < 2) {
        return false;
    }
    for (let i=0; i<x[0].length; i++) {
        if (x[1][i] != x[0][i]) {
            return false;
        }
    }
    return true;
}

// suppression des doublons sur les premières lignes
const cleanDoubles = (x: number[][]): number[][] => {
    while (areFirstRowsEquals(x) && x.length > 1) {
        x = x.slice(1, x.length)
    }
    return x
}

// entrainement d'un arbre d'isolation sur un jeu de données
const buildIsolationTree = (x: number[][], useExtended: boolean): Tree|null => {

    if (x.length <= 1) { // plus qu'une valeur dans le ds -> noeud terminal
        return null;
    }

    const result = useExtended ? splitDatasetExtended(x) : splitDataset(x);

    // si null : jeu de donnée identique -> noeud terminal
    if (result == null) {
        return null;
    }

    const [a, b, splitMethod] = result;

    return {
        split: splitMethod,
        ifTrue: buildIsolationTree(a, useExtended),
        ifFalse: buildIsolationTree(b, useExtended)
    }
}

// calcul la profondeur moyennes des noeuds d'un arbre
const getTreeAverageDepth = (tree: Tree): number => {
    let sum = 0;
    let count = 0;
    let depth = 1;
    let nextNodes = [tree];

    while (nextNodes.length != 0) {
        let nextNodes2: Tree[] = [];
        nextNodes.map((node) => {
            count += 1
            sum += depth
            if (node.ifTrue != null) {
                nextNodes2.push(node.ifTrue)
            }
            if (node.ifFalse != null) {
                nextNodes2.push(node.ifFalse)
            }
        })
        nextNodes = nextNodes2
        depth += 1
    }
    return sum / count
}

// caclul le score d'isolation d'un arbre pour une nouvelle ligne de données
const getTreesPrediction = (tree: Tree, value: number[], useExtended: boolean): number => {
    let depth = 0;
    let nextNode = tree;

    while (nextNode != null) {
        let right = true;
        if (useExtended) {

            let planValue = 0;
            let [normalVector, intercept] = nextNode.split
            for (let e=0; e<normalVector.length; e++) {
                planValue += normalVector[e] * value[e]
            }
            right = planValue > intercept

        } else {
            right = value[nextNode.split[0]] > nextNode.split[1]
        }

        if (right) {
            nextNode = nextNode.ifTrue
        } else {
            nextNode = nextNode.ifFalse
        }
        depth += 1
    }
    return depth
}

const scoreTreePrediction = (computedDepth: number, averageDepth: number): number => {
    return Math.pow(2, -computedDepth/averageDepth)
}

// calcul les score d'anomalies moyens sur deux jeux de données
const modelEvaluation = (trees: Tree[], useExtended: boolean, regularDatas: number[][], anomalies: number[][]) => {
    let avgDepth: number = trees.map(tree => getTreeAverageDepth(tree)).reduce((acc, value) => acc + value);
    let regularPredictions = regularDatas.map((values) => {
        let pred = trees
            .map(tree => getTreesPrediction(tree, values, useExtended))
            .reduce((acc, value) => acc + value, 0);
        return scoreTreePrediction(pred, avgDepth)
    }).sort();

    let anomaliesPredictions = anomalies.map((values) => {
        let pred = trees
            .map(tree => getTreesPrediction(tree, values, useExtended))
            .reduce((acc, value) => acc + value, 0);
        return scoreTreePrediction(pred, avgDepth)
    }).sort().reverse();

    console.log("moyenne des anomalies:", anomaliesPredictions.reduce((acc, value) => acc+value, 0) / anomalies.length)    
    console.log("moyenne des données régulières:", regularPredictions.reduce((acc, value) => acc+value, 0) / regularDatas.length)    
};

// surcouche objet des opération de base sur un arbre d'isolation
class IsolationTree {

    private node: Tree = null;
    private useExtended: boolean = false;

    constructor(dataset: number[][], useExtended: boolean) {
        this.useExtended = useExtended;
        this.node = buildIsolationTree(dataset, useExtended);
    }

    public getDepth(): number {
        return getTreeAverageDepth(this.node);
    }

    public getPrediction(value: number[]) {
        return getTreesPrediction(this.node, value, this.useExtended)
    }
}

export { 
    buildIsolationTree,
    buildSubSample,
    splitDatasetExtended,
    splitDataset,
    getTreeAverageDepth,
    getTreesPrediction,
    scoreTreePrediction,
    modelEvaluation,
    IsolationTree
}