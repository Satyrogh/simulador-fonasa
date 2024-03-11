const { MongoClient } = require('mongodb');
const moment = require('moment');

// Acceso
const uri = "mongodb://localhost:27017";

// Connect to MongoDB
MongoConnect = async (dbName = "fonasa") => {
    try {
        const client = await MongoClient.connect(uri, { });
        return client.db(dbName);
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        throw err; 
    }
}

CustomUpdateOne = async (collection, search, updateData) => {
    const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
    const customUpdatedDoc = {
        $set:{
            ...updateData,
            fecha_hora_actualizacion: currentDate,
        }
    };

    console.log("customUpdatedDoc", customUpdatedDoc)
  
    const result = await collection.updateOne(search, customUpdatedDoc);
    return result;
}


CustomUpdateMany = async (collection, filter, updateData) => {
    const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
    const customUpdatedDoc = {
        $set: {
          ...updateData,
          fecha_hora_actualizacion: currentDate,
        },
    };
    const result = await collection.updateMany(filter, customUpdatedDoc);
    return result;
}

module.exports = {
    MongoConnect,
    CustomUpdateOne,
    CustomUpdateMany
};