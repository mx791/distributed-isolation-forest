const iTree = require("../../src/isolationTree");
const modelEval = require("../../src/modelEvaluation");
const linearize = require("../../src/Preprocessing");
const fs = require("fs")
const { parse } = require('csv-parse');

let regDatas = [];
let iregDatas = [];
const EXTENDED = false;

fs.createReadStream("./datas/ForestCover.csv")
.pipe(parse({delimiter: ','}))
.on('data', function(csvrow) {
    if (csvrow[10] == "0") {
        regDatas.push(csvrow.slice(0, 9).map(value => parseFloat(value)))
    } else {
        iregDatas.push(csvrow.slice(0, 9).map(value => parseFloat(value)))
    }
})
.on('end',function() {

    console.log("données chargées --> pas de normalisation")
    console.log(regDatas.length, iregDatas.length)

    let timeCounter = 0;

    let trees = [];
    for (let i=0; i<15; i++) {

        let start = (new Date()).getMilliseconds();
        for (let e=0; e<10; e++) {
            const newDatas = iTree.buildSubSample(128, regDatas);
            trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
        }
        let end = (new Date()).getMilliseconds();
        timeCounter += (end - start);
    
        start = (new Date()).getMilliseconds();
        const anomaliesPreds = iTree.predict(trees, EXTENDED, iregDatas);
        const regPreds = iTree.predict(trees, EXTENDED, regDatas);
        const auc = modelEval.AUC(regPreds, anomaliesPreds);
        end = (new Date()).getMilliseconds();
        console.log(trees.length, auc, timeCounter, (end-start));
    }

    new_dataset = linearize.linearizeDataset([...regDatas, ...iregDatas])
    regDatas = new_dataset.slice(0, regDatas.length)
    let irDatas = new_dataset.slice(regDatas.length, new_dataset.length)

    console.log("\ndonnées normalisées")

    console.log(regDatas.length, irDatas.length)
    timeCounter = 0;

    trees = [];
    for (let i=0; i<15; i++) {
        let start = (new Date()).getMilliseconds();
        for (let e=0; e<10; e++) {
            const newDatas = iTree.buildSubSample(128, new_dataset);
            trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
        }
        let end = (new Date()).getMilliseconds();
        timeCounter += (end - start);
    
        start = (new Date()).getMilliseconds();
        const anomaliesPreds = iTree.predict(trees, EXTENDED, irDatas);
        const regPreds = iTree.predict(trees, EXTENDED, regDatas);
        const auc = modelEval.AUC(regPreds, anomaliesPreds);
        end = (new Date()).getMilliseconds();
        
        console.log(trees.length, auc, timeCounter, (end-start))
    }

});