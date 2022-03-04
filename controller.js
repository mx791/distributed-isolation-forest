const WebSocket = require('ws');
const fs = require('fs'); 
const { parse } = require('csv-parse');

const url = 'ws://localhost:8080'
const connection = new WebSocket(url)

const dataset = [];

connection.on("open", () => {

    console.log("Connected to cluster")
    connection.send(JSON.stringify({
        type: "reset-dataset"
    }));

    // chargement du csv
    fs.createReadStream("./winequality-red.csv")
    .pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
        // on envoie les données au cluster
        connection.send(JSON.stringify({
            type: "add-dataset-line",
            content: csvrow.map(value => parseFloat(value))
        }))   
    })
    .on('end',function() {
        console.log("dataset envoyé au master")
        // entrainement du modèle
        connection.send(JSON.stringify({
            type: "train-isolation-forest",
            extended: false,
            n_trees: 200
        }));
    });
});

connection.on("message", msg => {
    const parsedMsg = JSON.parse(msg);

    if (parsedMsg["type"] == "node-count") {
        console.log(parsedMsg["content"] + " noeuds connectés");
    }

});