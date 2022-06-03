const iTree = require("../src/isolationTree");
const modelEval = require("../src/modelEvaluation");
const linearize = require("../src/Preprocessing");
const fs = require("fs")
const { parse } = require('csv-parse');

const dataset = [];
const EXTENDED = false;

let first = true;

fs.createReadStream("./datas/winequality-red.csv")
.pipe(parse({delimiter: ','}))
.on('data', function(csvrow) {
    if (first) {
        first = false;
        return;
    }
    dataset.push({id: dataset.length, vector: csvrow.map(value => parseFloat(value))})
})
.on('end',function() {

    console.log("données chargées")

    const new_dataset = dataset // linearize.linearizeDataset(dataset);
    const regDatas = dataset // linearize.linearizeDataset(dataset);
    const irDatas = [];

    console.log("données normlisées")

    for (let i=0; i<850; i++) {
        let fakeData = [];
        for (let e=0; e<new_dataset[0].vector.length; e++) {
            fakeData.push(Math.random());
        }
        let newLine = {id: new_dataset.length, vector: fakeData};
        irDatas.push(newLine);
        new_dataset.push(newLine);
    }

    console.log(regDatas.length, irDatas.length)

    let trees = [];
    for (let i=0; i<15; i++) {

        for (let e=0; e<10; e++) {
            const newDatas = iTree.buildSubSample(76, new_dataset);
            trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
        }
    
        const anomaliesPreds = iTree.predict(trees, EXTENDED, irDatas.map(val => val.vector));
        const regPreds = iTree.predict(trees, EXTENDED, regDatas.map(val => val.vector));
        console.log(trees.length, modelEval.AUC(regPreds, anomaliesPreds))
    }

    const anomaliesPreds = iTree.predict(trees, EXTENDED, irDatas.map(val => val.vector));
    const regPreds = iTree.predict(trees, EXTENDED, regDatas.map(val => val.vector));
    console.log(anomaliesPreds)
    console.log(regPreds)

});