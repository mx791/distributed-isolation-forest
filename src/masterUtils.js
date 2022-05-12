module.exports = {
    getNextUid: function () {
        const lastIndex = global.UID ?? 0;
        global.UID = lastIndex + 1;
        return global.UID;
    },
    writeLog: function(enventType, content) {
        console.log(new Date(), enventType, content);
    },
    checkNodesAndController: function (nodePool, controllers) {
        Object.keys(nodePool).map(key => {
            try {
                nodePool[key].send("test")
            } catch (e) {
                delete nodePool[key]
            }
        });
        controllers = controllers.filter((con) => {
            try {
                con.send("test");
                return true
            } catch (e) {
                return false
            }
        });
    }

}