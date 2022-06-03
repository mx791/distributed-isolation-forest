// créer un sous-échantillon d'un jeu de données
const buildSubSample = (samplesCount, dataset) => {
    let subDataset = [];
    const ids = [];
    while (subDataset.length < samplesCount) {
        const index = Math.floor(Math.random()*dataset.length);
        if (!ids.includes(index)) {
            subDataset.push(dataset[index].vector)
            ids.push(index)
        }
    }
    return subDataset;
}

// Isolation Forest
// créer un split en chsoisissant une variable et un seuil
const splitDataset = (x) => {
    let [a, b] = [[], []];
    let splitFeartureId = -1;
    let splitValue = 0;

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
const splitDatasetExtended = (x) => {

    let [a, b] = [[], []];
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
        const pointId = Math.floor(Math.random()*x.length);
        const point = x[pointId];
        intercept = 0;
        for (let i=0; i<point.length; i++) {
            intercept += point[i] * normalVector[i]
        }

        if (x.length == 2) {
            return [[x[0]], [x[1]], [normalVector, intercept]]
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
const areFirstRowsEquals = (x) => {
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
const cleanDoubles = (x) => {
    while (areFirstRowsEquals(x) && x.length > 1) {
        x = x.slice(1, x.length)
    }
    return x
}

// entrainement d'un arbre d'isolation sur un jeu de données
const buildIsolationTree = (x, useExtended) => {

    if (x.length <= 1) { // plus qu'une valeur dans le ds -> noeud terminal
        return null;
    }

    const result = useExtended ? splitDatasetExtended(x) : splitDataset(x);

    // si null : jeu de donnée identique -> noeud terminal
    if (result == null) {
        return result;
    }

    const [a, b, splitMethod] = result;

    return {
        split: splitMethod,
        ifTrue: buildIsolationTree(a, useExtended),
        ifFalse: buildIsolationTree(b, useExtended)
    }
}

// calcul la profondeur moyennes des noeuds d'un arbre
const getTreeAverageDepth = (tree) => {
    let sum = 0;
    let count = 0;
    let depth = 1;
    let nextNodes = [tree];

    while (nextNodes.length != 0) {
        let nextNodes2 = [];
        nextNodes.map((node) => {
            //count += 1
            //sum += depth
            if (node.ifTrue != null) {
                nextNodes2.push(node.ifTrue)
            }
            if (node.ifFalse != null) {
                nextNodes2.push(node.ifFalse)
            }
            if (node.ifFalse == null && node.ifTrue == null) {
                sum += depth;
                count += 1;
            }
        })
        nextNodes = nextNodes2
        depth += 1
    }
    return sum / count
}

// caclul le score d'isolation d'un arbre pour une nouvelle ligne de données
const getTreesPrediction = (tree, value, useExtended) => {
    let depth = 1;
    let nextNode = tree;

    while (nextNode != null && typeof nextNode.split != "undefined") {
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

const scoreTreePrediction = (computedDepth, averageDepth) => {
    //return 1 - computedDepth/averageDepth;
    return Math.pow(2, - computedDepth / averageDepth)
}

const predict = (trees, useExtended, datas) => {
    let avgDepth = trees.map(tree => getTreeAverageDepth(tree)).reduce((acc, value) => acc + value, 0) / trees.length;
    return datas.map((values) => {
        let pred = trees
            .map(tree => getTreesPrediction(tree, values, useExtended))
            .reduce((acc, value) => acc + value, 0) / trees.length;
        return scoreTreePrediction(pred, avgDepth)
    });
}

// calcul les score d'anomalies moyens sur deux jeux de données
const modelEvaluation = (trees, useExtended, regularDatas, anomalies) => {
    let avgDepth = trees.map(tree => getTreeAverageDepth(tree)).reduce((acc, value) => acc + value);
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

module.exports = { 
    buildIsolationTree,
    buildSubSample,
    splitDatasetExtended,
    splitDataset,
    getTreeAverageDepth,
    getTreesPrediction,
    scoreTreePrediction,
    modelEvaluation,
    predict
}
