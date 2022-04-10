const iTree = require("../src/isolationTree");
const modelEval = require("../src/modelEvaluation");
const linearize = require("../src/Preprocessing");
const fs = require("fs")
const { parse } = require('csv-parse');

const dataset = [];
const EXTENDED = true;
const nb_samples = 256;
let regDatas = [];
let irDatas = [];
let first = true;

var t2train = 0;
var t1train = 0 ;
var t1test = 0;



fs.createReadStream("../datas/ForestCover.csv")
.pipe(parse({delimiter: ','}))
.on('data', function(csvrow) {
    if (first) {
        first = false;
        return;
    }
    const vector = csvrow.map(value => parseFloat(value))
    const isAnomalies = vector[10]
    const vector2 = vector.slice(0,10)
    if (isAnomalies){
        irDatas.push(vector2)
    }
    else {
        regDatas.push(vector2)
    }
    dataset.push(vector2)
})
.on('end',function() {
    var t1 = performance.now();
    console.log("données chargées")

    const new_dataset = linearize.linearizeDataset(dataset);
    irDatas = linearize.linearizeDataset(irDatas);
    regDatas = linearize.linearizeDataset(regDatas);


    console.log("données normalisées")

    console.log(regDatas.length, irDatas.length)
    //console.log(new_dataset[0])
   


    let trees = [];
    for (let i=0; i<10; i++) {
        
        t1train = performance.now()
        for (let e=0; e<10; e++) {
            const newDatas = iTree.buildSubSample(nb_samples, new_dataset);
            trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
        }
        t2train = performance.now()
        const anomaliesPreds = iTree.predict(trees, EXTENDED, irDatas);
        const regPreds = iTree.predict(trees, EXTENDED, regDatas);
        t1test = performance.now()
        console.log(trees.length, modelEval.AUC(regPreds, anomaliesPreds))

    }
    
    console.log("Temps train", t2train-t1train)
    console.log("Temps test", t1test-t2train)
});
