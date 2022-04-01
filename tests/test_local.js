const iTree = require("../src/isolationTree");
const modelEval = require("../src/modelEvaluation");

const EXTENDED = true;

const datasReg = [];
const datas = [];
for (let i=0; i<1500; i++) {
    let value = Math.random()
    const line = [
        value, 0.5 - value*0.3
    ];
    datas.push(line);
    datasReg.push(line)
}

// anomalies
const datasIr = [];
for (let i=0; i<35; i++) {
    const line = [
        Math.random(), Math.random()
    ];
    datas.push(line);
    datasIr.push(line);
}

let trees = [];
for (let i=0; i<15; i++) {
    for (let e=0; e<10; e++) {
        const newDatas = iTree.buildSubSample(256, datas);
        trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
    }

    const anomaliesPreds = iTree.predict(trees, EXTENDED, datasIr);
    const regPreds = iTree.predict(trees, EXTENDED, datasReg);
    console.log(trees.length, modelEval.AUC(regPreds, anomaliesPreds))

}

iTree.modelEvaluation(trees, EXTENDED, datasReg, datasIr)


const anomaliesPreds = iTree.predict(trees, EXTENDED, datasIr);
const regPreds = iTree.predict(trees, EXTENDED, datasReg);
console.log(modelEval.AUC(regPreds, anomaliesPreds))

console.log(modelEval.computeConfusionMatrix(regPreds, anomaliesPreds, 0.48))