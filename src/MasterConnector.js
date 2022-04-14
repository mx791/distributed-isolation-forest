const WebSocket = require('ws');

module.exports = class MasterConnector {

    constructor(masterAdress) {
        this.masterAdress = masterAdress;
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve) => {
           this.connection = new WebSocket(this.masterAdress);
           this.connection.on("open", () => {
               this.connected = true
               resolve()
           });
        });
    }

    resetDataset() {
        if (!this.connected) {
            throw "Not connected !"
        }

        this.connection.send(JSON.stringify({
            type: "reset-dataset"
        }))
    }

    sendDatasetLine(line) {
        if (!this.connected) {
            throw "Not connected !"
        }
        this.connection.send(JSON.stringify({
            type: "add-dataset-line",
            content: line
        }))   
    }


    async trainIsolationForest(useExtended, nTress, subDatasetSize) {
        const uid = Math.floor(Math.random()*10000)
        return new Promise((resolve) => {
            this.connection.send(JSON.stringify({
                type: "train-isolation-forest",
                extended: useExtended,
                n_trees: nTress,
                n_samples: subDatasetSize,
                uid
            }));

            this.connection.on("message", (msg) => {
                try {
                    const parsedMsg = JSON.parse(msg);
                    if (parsedMsg["type"] == "trained-isolation-forest-" + uid) {
                        resolve(parsedMsg["content"])
                    }
                } 
                catch(e) {}
            })
        })
    }

    async performIsolationForest(trees) {
        return new Promise((resolve) => {
            this.connection.send(JSON.stringify({
                type: "perform-isolation-forest",
                trees: trees
            }));

            this.connection.on("message", (msg) => {
                try {
                    const parsedMsg = JSON.parse(msg.toString());
                    if (parsedMsg["type"] == "performed-isolation-forest") {
                        resolve(parsedMsg["predictions"])
                    }
                } catch(e) {}   
            });
        });
    }


    async performIsolationForestOnNewDatas(trees, datas) {
        return new Promise((resolve) => {
            this.connection.send(JSON.stringify({
                type: "perform-isolation-forest",
                trees: trees,
                datas: datas
            }));

            this.connection.on("message", (msg) => {
                try {
                    const parsedMsg = JSON.parse(msg);
                    if (parsedMsg["type"] == "performed-isolation-forest") {
                        resolve(parsedMsg["predictions"])
                    }
                } catch(e) {}
            });
        });
    }


}