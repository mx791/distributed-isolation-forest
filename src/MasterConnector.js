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
        return new Promise((resolve) => {
            this.connection.send(JSON.stringify({
                type: "train-isolation-forest",
                extended: useExtended,
                n_trees: nTress,
                n_samples: subDatasetSize
            }));

            this.connection.on("message", (msg) => {
                try {
                    const parsedMsg = JSON.parse(msg);

                    if (parsedMsg["type"] == "trained-isolation-forest") {
                        resolve(parsedMsg["content"])
                    }
                } catch(e) {}
            })
        })
    }


}