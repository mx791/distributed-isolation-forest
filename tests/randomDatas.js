const MasterConnector = require("../src/MasterConnector");

async function main() {

    const master = new MasterConnector('ws://localhost:8090')
    await master.connect()

    master.resetDataset()

    // generation de 1500 données "legit"
    // distribution autour d'une droite
    const NOISE = 0.1
    for (let i=0; i<1500; i++) {
        let value = Math.random()
        master.sendDatasetLine([
            value, 0.5 - value*0.3
        ]);
    }

    // anomalies
    for (let i=0; i<100; i++) {
        master.sendDatasetLine([
            Math.random()*1.3, Math.random()*1.3
        ])
    }

    let trees = await master.trainIsolationForest(true, 100, 256)
    console.log(trees)

    let preds = await master.performIsolationForest(trees);
    console.log(preds)
}


main()