const { MongoConnect } = require('./mongo.js');
const moment = require('moment');

let lastChecked = moment().format("YYYY-MM-DD HH:mm:ss");

MonitorChanges = async(req, res) => {
    try {
        const db = await MongoConnect();
        const collection = db.collection("consultas");
        setInterval(async () => {
            const changes = await collection.find({ fecha_hora_actualizacion: { $gt: lastChecked } }).toArray();
            if (changes.length > 0) {
                console.log(`Detected Changes (${lastChecked}): `, changes);
                lastChecked = moment().format("YYYY-MM-DD HH:mm:ss");
            }
        }, 2000);
    } catch (error) {
        console.error(error);
    }
}

module.exports = { MonitorChanges };