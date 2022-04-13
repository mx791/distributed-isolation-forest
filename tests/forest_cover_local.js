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

fs.createReadStream("./datas/ForestCover.csv")
.pipe(parse({delimiter: ','}))
.on('data', function(csvrow) {
    if (first) {
        first = false;
        return;
    }
    const vector = csvrow.map(value => parseFloat(value))
    const isAnomalies = vector[10]
    const vector2 = vector.slice(0,9)
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
    console.log("Données chargées")

    const new_dataset = linearize.linearizeDataset(dataset);
    irDatas = linearize.linearizeDataset(irDatas);
    regDatas = linearize.linearizeDataset(regDatas);


    console.log("Données normalisées")

    console.log("Taille du Dataset :", regDatas.length, "Nombre d'anomalies :", irDatas.length)
    //console.log(new_dataset[0])

    let trees = [];
    for (let i=0; i<10; i++) {

        for (let e=0; e<10; e++) {
            const newDatas = iTree.buildSubSample(nb_samples, new_dataset);
            trees.push(iTree.buildIsolationTree(newDatas, EXTENDED));
        }

        const anomaliesPreds = iTree.predict(trees, EXTENDED, irDatas);
        const regPreds = iTree.predict(trees, EXTENDED, regDatas);

        /*const treeslen = trees.length;
        const scoreAUC = modelEval.AUC(regPreds, anomaliesPreds);
        var obj = {treeslen, scoreAUC};

        console.log(obj)
        const fs = require('fs');
        fs.writeFile("./Results/test forest cover.txt", JSON.stringify(obj), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });*/
        console.log(trees.length, modelEval.AUC(regPreds, anomaliesPreds))
        var t_inter = performance.now()
        var cumulTime = t_inter-t1
        console.log(cumulTime, trees.length)
    }
    var t2 = performance.now();
    console.log("Temps d'exécution :", t2-t1 + " ms")

    // Enregistrement de la matrice de confusion dans ./Results/Forest cover
    const anomaliesPreds = iTree.predict(trees, EXTENDED, irDatas);
    const regPreds = iTree.predict(trees, EXTENDED, regDatas);
    var confusionMatrix = modelEval.computeConfusionMatrix(regPreds, anomaliesPreds, 0.5)
    console.log("Confusion Matrix : ", confusionMatrix)
    const fs = require('fs');
            fs.writeFile("./Results/Forest cover/Confusion matrix forest cover.txt", JSON.stringify(confusionMatrix), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The confusion matrix was saved!");
            });
});