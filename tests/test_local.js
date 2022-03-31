const iTree = require("../src/isolationTree");


const EXTENDED = true;

const datasReg = [];
const datas = [];
for (let i=0; i<1500; i++) {
    let value = Math.random()
    const line = [
        value, 0.5 - value*0.3 + Math.random()*0.1
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
for (let i=0; i<100; i++) {
    const newDatas = iTree.buildSubSample(256, datas);
    trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
}

iTree.modelEvaluation(trees, EXTENDED, datasReg, datasIr)

