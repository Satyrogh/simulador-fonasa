
const { MongoConnect, CustomUpdateOne } = require('./mongo.js'); 

const moment = require('moment');
var atencionOptimizada = false;

ListarPacientesMayorRiesgo = async (req, res) => {
    try{
        const db = await MongoConnect();

        console.log(req.body.id_historia_clinica);
        const paciente = await db.collection("pacientes").findOne({
            "id_historia_clinica": parseInt(req.body.id_historia_clinica),
            $or: [
                { "estado_atencion": "En espera" },
                { "estado_atencion": "Pendiente" }
            ]
        })

        var pacientesMayorRiesgo = {};
        if(paciente){
            pacientesMayorRiesgo = await db.collection("pacientes").find(
                { "riesgo": { "$gt": paciente["riesgo"] } }
            ).toArray();

            if(pacientesMayorRiesgo.length > 0){
                res.status(201).send(pacientesMayorRiesgo);
            }else{
                console.log("No se encontraron pacientes con mayor riesgo");
                res.status(201).send({message:"No se encontraron pacientes con mayor riesgo"});
            }
        }
        else{
            console.log("No se encontró paciente con ese número de historia clínica");
            res.status(201).send({message:"No se encontró paciente con ese número de historia clínica"});
        }
    }catch(ex){
        console.error("Error en MongoDB: ", err);
        res.status(500).send("Error");
    }
    
}

IngresoPaciente = async (req, res) => {
    try{
        const db = await MongoConnect();
        var collectionName = "historias_clinicas";
        const historiasClinicas = db.collection(collectionName);
        const pacientes = db.collection("pacientes");

        let historiaClinicaNumero = await historiasClinicas.countDocuments({}) + 1; // Auto incremento

        let { nombre, edad, peso, estatura, fumador, años_fumador, dieta_asignada } = req.body;

        const historiaEncontrada = await historiasClinicas.findOne({"nombre": nombre});

        if(historiaEncontrada){
            historiaClinicaNumero = historiaEncontrada["id_historia_clinica"];
        } else {
            console.log('No se encontró el paciente con ese nombre');
        }

        
        edad = parseInt(edad);
        const historiaData = {
            fecha_hora: moment().format("YYYY-MM-DD HH:mm:ss"),
            nombre: nombre,
            edad: edad,
            peso: peso,
            estatura: estatura,
            fumador: fumador == "on" ? true : false,
            años_fumador: años_fumador,
            dieta_asignada: dieta_asignada == "on" ? true : false,
            id_historia_clinica: historiaClinicaNumero
        };
        await historiasClinicas.insertOne(historiaData);

        const tipoEdadPaciente = edad < 16 ? "Niño" : edad >= 16 && edad <= 40  ? "Joven" : "Anciano";

        console.log(edad, tipoEdadPaciente)
        var prioridad = 0;
        var riesgo = 0;
        // Prioridad y riesgo
        switch (tipoEdadPaciente) {
            case "Niño":
                pesoMenosEstatura = peso - (estatura * 100 - 100);
                pesoMenosEstaturaAprox = pesoMenosEstatura < 1 ? 1 : pesoMenosEstatura > 4 ? 4 : pesoMenosEstatura;
                calculoPrioridad = pesoMenosEstaturaAprox + 
                    (edad <= 5 ? 3 : edad > 5 && edad <=12 ? 2 : 1);
                prioridad = calculoPrioridad ;
                riesgo = (edad * prioridad) / 100;
                break;
            case "Joven":
                prioridad = fumador ? años_fumador/4 + 2 : 2;
                riesgo = (edad * prioridad) / 100;
                break;
            default:
                prioridad = dieta_asignada && edad >= 60 && edad <= 100 ? edad / 20 + 4 : edad / 30 + 3;
                riesgo = (edad * prioridad) / 100 + 5.3;
                break;
        }

        var pacienteData = {
            id_historia_clinica: historiaClinicaNumero,
            tipo: tipoEdadPaciente,
            prioridad: prioridad,
            riesgo: riesgo,
            estado_atencion: "Pendiente"
        }
        const pacienteInsertado = await pacientes.insertOne(pacienteData);
        res.status(201).send("Paciente ingresado"); // Updated response on success

    }catch (err) {
        console.error("Error en MongoDB: ", err);
        res.status(500).send("Error");
    }
};

LiberarConsultas = async (req, res) => {
    const db = await MongoConnect();

    const condicionConsultasOcupadas = {
        "estado": "Ocupado"
    };
    const buscarConsultasOcupadas = await db.collection("consultas").find(condicionConsultasOcupadas).toArray();

    if(buscarConsultasOcupadas && buscarConsultasOcupadas.length > 0){
        await CustomUpdateMany(
            db.collection("consultas"),
            condicionConsultasOcupadas,
            {estado: "Libre"}
        );
    
        console.log(buscarConsultasOcupadas);

        res.status(201).send(buscarConsultasOcupadas); // Updated response on success
    }else{
        res.status(201).send({message: "No hay consultas para ser liberadas"}); // Updated response on success
    }
}


ListarPacientesFumadoresUrgentes = async (req, res) => {
    const db = await MongoConnect();

    const pacientesPrioritariosFumadores = await db.collection("pacientes").aggregate([
        {
            $match: {
                $and: [
                    {"prioridad": {$gt: 4}},
                    {"estado_atencion": {$in: ["Pendiente", "En espera"]}}
                ]
            }
        },
        {
            $lookup: {
                from: "historias_clinicas",
                localField: "id_historia_clinica",
                foreignField: "id_historia_clinica",
                as: "historia_clinica",
                let: {"id_historia_clinica_pacientes": "$id_historia_clinica"},
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$$id_historia_clinica_pacientes", "$id_historia_clinica"] },
                                    { $eq: ["$fumador", true] }
                                    // { $not: { $in: ["$fumador", ["", null, "no", "No"]] } }
                                ]
                            }
                        }
                    },
                    {$sort: {"fecha_hora": -1}},
                    {$limit: 1}
                ],
            }
        },
        {
            $unwind: "$historia_clinica"
        },
        {
            $sort: {"historia_clinica.fecha_hora": -1}
        }
    ]).toArray();

    if(pacientesPrioritariosFumadores.length > 0){
        console.log(pacientesPrioritariosFumadores);
        res.status(201).send(pacientesPrioritariosFumadores); // Updated response on success
    }else{
        res.status(201).send({message: "No se encontraron pacientes fumadores prioritarios."}); // Updated response on success
    }
}

ConsultaMasPacientesAtendidos = async(req, res) => {
    const db = await MongoConnect();

    const consultaMasPacientesAtendidos = await db.collection("consultas").aggregate([
        { $sort: { "personas_atendidas": -1 } }, 
        { $limit: 1 },
        { $project: { _id: 0, id: 1, personas_atendidas: 1 } }
    ]).toArray();

    const consultaMasPacientesAtendidosUnique = consultaMasPacientesAtendidos[0];
    if(consultaMasPacientesAtendidosUnique){
        console.log(consultaMasPacientesAtendidos);
        res.status(201).send({message: `La consulta que más personas ha atendido es la: ${consultaMasPacientesAtendidosUnique["id"]} con ${consultaMasPacientesAtendidosUnique["personas_atendidas"]} pacientes atendidos.`});
    }else{
        res.status(201).send({message: "No se encontraron consultas."});
    }
}

PacienteMasAnciano = async(req, res) => {
    const db = await MongoConnect();

    const pacienteMasAnciano = await db.collection("pacientes").aggregate([
        { $match: { "estado_atencion": "En espera" } },
        { $lookup: {
            from: "historias_clinicas",
            localField: "id_historia_clinica",
            foreignField: "id_historia_clinica",
            as: "historia_clinica"
        }},
        { $unwind: "$historia_clinica" },
        { $sort: { "historia_clinica.fecha_hora": 1 } },
        { $sort: { "historia_clinica.edad": -1 } },
        { $limit: 1 }
    ]).toArray();
    console.log(pacienteMasAnciano);
    const pacienteMasAncianoUnique = pacienteMasAnciano[0];

    if(pacienteMasAncianoUnique){
        res.status(201).send({message: `El paciente más anciano en espera es: ${pacienteMasAncianoUnique["historia_clinica"]["nombre"]}, con ${pacienteMasAncianoUnique["historia_clinica"]["edad"]} años de edad`});
    }else{
        res.status(201).send({message: "No se encontraron pacientes."});
    }
}

module.exports = {
    ListarPacientesMayorRiesgo,
    IngresoPaciente,
    LiberarConsultas,
    ListarPacientesFumadoresUrgentes,
    ConsultaMasPacientesAtendidos,
    PacienteMasAnciano
};