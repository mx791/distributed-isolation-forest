const MasterConnector = require("../../src/MasterConnector");
const fs = require("fs")
const { parse } = require('csv-parse');
const { AUC } = require("../../src/modelEvaluation");

let count = 0;
let regIds = [];
let iregIds = [];

async function main() {
    const con = new MasterConnector('ws://localhost:8090');
    await con.connect();
    await con.resetDataset();

    console.log("connected")

    const X = [];

    fs.createReadStream("./datas/ForestCover.csv")
    .pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
        if (X.length > 25000) {
            return
        }
        const line = csvrow.slice(0, 9).map(value => parseFloat(value))
        if (csvrow[10] == "1") {
            iregIds.push(count)
        } else {
            regIds.push(count)
        }
        con.sendDatasetLine({
            id: count,
            vector: line
        });
        X.push(line);
        count += 1;
        
    })
    .on('end', async function() {
        // on attent un peut pour etre sur
        setTimeout(async () => {
            const start = performance.now();
            console.log("train")
            const trees = await con.trainIsolationForest(false, 100, 256);
            const end = performance.now()
            console.log(end-start)

            const startTest = performance.now();
            const datas = await con.performIsolationForest(trees);
            console.log("test: " + (performance.now()-startTest));
            
            let iregScores = [];
            let regScores = [];

            datas.map((line) => {
                if (iregIds.includes(line.id)) {
                    iregScores.push(line.score)
                } else {
                    regScores.push(line.score)
                }
            });
            console.log(AUC(regScores, iregScores))
        }, 1500) 
    });
}

main();