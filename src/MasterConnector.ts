import { WebSocket } from "ws";
import { Tree } from "./types";

export class MasterConnector {

    private masterAdress: string = "";
    private connected: boolean = false;
    private connection: WebSocket

    constructor(masterAdress: string) {
        this.masterAdress = masterAdress;
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve) => {
           this.connection = new WebSocket(this.masterAdress);
           this.connection.on("open", () => {
               this.connected = true
               resolve(null)
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

    sendDatasetLine(line: number[][]) {
        if (!this.connected) {
            throw "Not connected !"
        }
        this.connection.send(JSON.stringify({
            type: "add-dataset-line",
            content: line
        }))   
    }


    async trainIsolationForest(useExtended: boolean, nTress: number, subDatasetSize: number) {
        return new Promise((resolve) => {
            this.connection.send(JSON.stringify({
                type: "train-isolation-forest",
                extended: useExtended,
                n_trees: nTress,
                n_samples: subDatasetSize
            }));

            this.connection.on("message", (msg: string) => {
                try {
                    const parsedMsg = JSON.parse(msg);

                    if (parsedMsg["type"] == "trained-isolation-forest") {
                        resolve(parsedMsg["content"])
                    }
                } catch(e) {}
            })
        })
    }

    async performIsolationForest(trees: Tree[]) {
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


    async performIsolationForestOnNewDatas(trees: Tree[], datas: number[][]) {
        return new Promise((resolve) => {
            this.connection.send(JSON.stringify({
                type: "perform-isolation-forest",
                trees: trees,
                datas: datas
            }));

            this.connection.on("message", (msg: string) => {
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