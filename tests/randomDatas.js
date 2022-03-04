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
            value, 0.5 - value*0.3 + Math.random()*NOISE
        ])
    }

    // anomalies
    for (let i=0; i<150; i++) {
        master.sendDatasetLine([
            Math.random(), Math.random()
        ])
    }

    let trees = await master.trainIsolationForest(false, 1, 10)
    console.log(trees)
}


main()