const buildSubSample = (samplesCount, dataset) => {
    let subDataset = [];
    const ids = [];
    while (subDataset.length < samplesCount) {
        const index = Math.floor(Math.random()*dataset.length);
        if (!ids.includes(index)) {
            subDataset.push(dataset[index])
            ids.push(index)
        }
    }
    return subDataset;
}

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
        const point = x[Math.floor(Math.random()*x.length)];
        intercept = 0;
        for (let i=0; i<point.length; i++) {
            intercept += point[i] * normalVector[i]
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

const cleanDoubles = (x) => {
    while (areFirstRowsEquals(x) && x.length > 1) {
        x = x.slice(1, x.length)
    }
    return x
}

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
        ifTrue: buildIsolationTree(a),
        ifFalse: buildIsolationTree(b)
    }
}

const getTreesAverageDepth = (tree) => {
    let sum = 0;
    let count = 0;
    let depth = 1;
    let nextNodes = [tree];

    while (nextNodes.length != 0) {
        let nextNodes2 = [];
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

const getTreesPrediction = (tree, value, useExtended) => {
    let depth = 1;
    let nextNode = tree;

    while (nextNode != null) {
        let right = true;
        if (useExtended) {

            let value = 0;
            let [normalVector, intercept] = nextNode.split
            for (let e=0; e<normalVector.length; e++) {
                value += normalVector[e] * x[i][e]
            }
            right = value > intercept

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

const scoreTreePrediction = (averageDepth, computedDepth) => {
    return Math.pow(2, -averageDepth/computedDepth)
}

module.exports = { 
    buildIsolationTree,
    buildSubSample,
    splitDatasetExtended,
    splitDataset,
    getTreesAverageDepth,
    getTreesPrediction,
    scoreTreePrediction
}
