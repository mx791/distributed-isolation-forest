const MasterConnector = require("../../src/MasterConnector");
const fs = require("fs")
const { parse } = require('csv-parse');

async function main() {
    const con = new MasterConnector('ws://localhost:30080');
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
        con.sendDatasetLine(line)
        X.push(line);
        
    })
    .on('end', async function() {
        // on attent un peut pour etre sur
        setTimeout(async () => {
            const start = performance.now();
            console.log("train")
            const trees = await con.trainIsolationForest(false, 100, 256);
            const end = performance.now()
            //console.log(trees)
            console.log(end-start)

            const startTest = performance.now();
            const datas = await con.performIsolationForest(trees);
            console.log("test: " + (performance.now()-startTest));
        }, 5000) 
    });
}

main();