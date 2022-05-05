const MasterConnector = require("../../src/MasterConnector");
const fs = require("fs")
const { parse } = require('csv-parse');

async function main() {
    const con = new MasterConnector('ws://localhost:8090');
    await con.connect();
    await con.resetDataset();

    console.log("connected")

    const X = [];

    fs.createReadStream("./datas/ForestCover.csv")
    .pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
        if (X.length > 3600) {
            return
        }
        console.log(X.length)
        const line = csvrow.slice(0, 9).map(value => parseFloat(value))
        con.sendDatasetLine(line)
        X.push(line);
        
    })
    .on('end', async function() {
        console.log("train")
        const trees = await con.trainIsolationForest(false, 100, 128);
        console.log(trees)
    });
}

main();