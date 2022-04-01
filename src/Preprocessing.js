const { computeConfusionMatrix } = require("./modelEvaluation");

const linearizeDataset = (dataset) => {
    const mins = JSON.parse(JSON.stringify(dataset[0]));
    const maxs = JSON.parse(JSON.stringify(dataset[0]));

    dataset.map((line) => {
        line.map((value, i) => {
            mins[i] = mins[i] < value ? mins[i] : value;
            maxs[i] = maxs[i] > value ? maxs[i] : value;
        })
    });

    return dataset.map((line) => {
        return line.map((value, i) => {
            return (value - mins[i]) / (maxs[i] - mins[i]);
        });
    });
};


module.exports = {
    linearizeDataset
}