const { MongoConnect, CustomUpdateOne } = require('./mongo.js');
const { LiberarConsultas } = require('./funciones_bd.js');
const moment = require('moment');

let lastChecked = moment().format("YYYY-MM-DD HH:mm:ss");

const optimizarAtencion = false;

MonitorChanges = async(req, res) => {
    try {
        // Atender pacientes
        const db = await MongoConnect();
        setInterval(async () => {
            if(!optimizarAtencion){
                await AtenderPaciente(db);
            }else{
                await OptimizarAtencion(db);
            }
        }, 5000);
    } catch (error) {
        console.error(error);
    }
}

const AtenderPaciente = async (db) => {
    try{
        // Procesar en espera
        var estadoAtencion = { "estado_atencion": "En espera" };
        const pacientesProcesados = await db.collection("pacientes").aggregate([
            { $match: estadoAtencion },
            { 
                $lookup: {
                    from: "historias_clinicas",
                    localField: "id_historia_clinica",
                    foreignField: "id_historia_clinica",
                    as: "historia_clinica"
                }
            },
            { $unwind: "$historia_clinica" }
        ]).toArray();

        var pacienteProcesadoSeleccionado = null;

        if(pacientesProcesados.length > 0){
            for(pacienteProcesadoSeleccionado of pacientesProcesados){
                if(pacienteProcesadoSeleccionado){
    
                    const unidad = await BuscarUnidad(pacienteProcesadoSeleccionado["tipo"], pacienteProcesadoSeleccionado["prioridad"]);
                    const buscarConsultaDisponible = await BuscarConsulta("Libre", unidad, db);
                    console.log("buscarConsultaDisponible", unidad, pacienteProcesadoSeleccionado)

                    var consultaDisponible = 0;
                    if(buscarConsultaDisponible){    
                        // Atender paciente y actualizar consulta
                        await AtenderPacienteFinal(buscarConsultaDisponible, pacienteProcesadoSeleccionado, db);
                        return;
                    }else{
                        consultaDisponible = 0;    
                        console.log("No se encontraron consultas disponibles.", pacienteProcesadoSeleccionado['nombre'])    
                    }
                }
            }
        }
            
        // Procesar Pendientes
        estadoAtencion = { "estado_atencion": "Pendiente" };
        const pacientesProcesadosPendientes = await db.collection("pacientes").aggregate([
            { $match: estadoAtencion },
            { 
                $lookup: {
                    from: "historias_clinicas",
                    localField: "id_historia_clinica",
                    foreignField: "id_historia_clinica",
                    as: "historia_clinica"
                }
            },
            { $unwind: "$historia_clinica" },
            { $sort: { "prioridad": -1, "historia_clinica.fecha_hora": -1 } },
        ]).toArray();

        if(pacientesProcesadosPendientes.length > 0){
            for(pacienteProcesadoSeleccionado of pacientesProcesadosPendientes){
                const unidad = await BuscarUnidad(pacienteProcesadoSeleccionado["tipo"], pacienteProcesadoSeleccionado["prioridad"]);
                const buscarConsultaDisponible = await BuscarConsulta("Libre", unidad, db); 
    
                var consultaDisponible = 0;
                if(!buscarConsultaDisponible){    // No se encontraron consultas disponibles 
                    await BuscarPacienteEnEsperaMismaUnidad(pacienteProcesadoSeleccionado, unidad, db);
                }else{ // Se encontró una consulta disponible
                    // Validar que no haya un usuario en espera de la misma sala
                    await BuscarPacienteEnEsperaMismaUnidad(pacienteProcesadoSeleccionado, unidad, db);
                } 
            }
        }else{
            console.log("No se encontraron pacientes pendientes.");
        }   
    }catch(ex){
        console.log("Error al atender al paciente", ex)
        return 0;
    }
}

const OptimizarAtencion = async (db) => {
    try{
        console.log("si")
        /* Obtener pacientes de mayor gravedad por urgencia (campo pacientes.riesgo), luego ordenar por niños y ancianos (campo pacientes.tipo), 
        luego ordenar por prioridad (paciente.prioridad) y llegada (historia_clinica.fecha_hora)
        y luego por jovenes en prioridad ascendente. */
        var pacienteProcesadoSeleccionado = null;
        var estadoAtencion = { "estado_atencion": "En espera" };
        const pacientesEnEsperaOriginalizados = await db.collection("pacientes").find(estadoAtencion).toArray();

        for(pacienteProcesadoSeleccionado of pacientesEnEsperaOriginalizados){
            const updatePacienteEnEsperaOriginalizado = { estado_atencion: "Pendiente" };
            await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesadoSeleccionado["_id"]}, updatePacienteEnEsperaOriginalizado);
        }

        var estadoAtencion = { "estado_atencion": "Pendiente" };
        const pacientesProcesadosPendientes = await db.collection("pacientes").aggregate([
            { $match: estadoAtencion },
            { 
                $lookup: {
                    from: "historias_clinicas",
                    localField: "id_historia_clinica",
                    foreignField: "id_historia_clinica",
                    as: "historia_clinica"
                }
            },
            { $unwind: "$historia_clinica" },
            { 
                $addFields: {
                    "ordenEdad": {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$tipo", "Niño"] }, then: 1 },
                                { case: { $eq: ["$tipo", "Anciano"] }, then: 2 },
                            ],
                            default: 4
                        }
                    },
                    "ordenEdadJoven": {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$tipo", "Joven"] }, then: 3 },
                            ],
                            default: 4
                        }
                    }
                }
            },
            { 
                $sort: { 
                    "riesgo": -1, // Sort 'riesgo' in descending order, highest risk first
                    "ordenEdad": 1, // Then sort by 'tipoOrden' to prioritize 'niño' and 'anciano'
                    "prioridad": 1, // Assuming 'prioridad' is a numeric field where lower means higher priority
                    "historia_clinica.fecha_hora": 1, // Sort by arrival, earliest first
                    "ordenEdadJoven": 1
                } 
            },
        ]).toArray();
        console.log("pacientesProcesadosPendientes", pacientesProcesadosPendientes);
        if(pacientesProcesadosPendientes.length > 0){
            for(pacienteProcesadoSeleccionado of pacientesProcesadosPendientes){
                const unidad = await BuscarUnidad(pacienteProcesadoSeleccionado["tipo"], pacienteProcesadoSeleccionado["prioridad"]);
                const buscarConsultaDisponible = await BuscarConsulta("Libre", unidad, db); 
    
                var consultaDisponible = 0;
                if(buscarConsultaDisponible){    // No se encontraron consultas disponibles 
                    // Atender paciente y actualizar consulta
                    await AtenderPacienteFinal(buscarConsultaDisponible, pacienteProcesadoSeleccionado, db);
                }
            }
        }else{
            if(pacientesEnEsperaOriginalizados.length == 0){ // Finalmente se cambia el estado de todas las consultas de "Ocupado" a "Libre"
                await LiberarConsultas();
            }
        }   
    }catch(ex){
        console.log("Error al atender al paciente", ex)
        return 0;
    }
    
}

const BuscarPacienteEnEsperaMismaUnidad = async(pacienteProcesadoSeleccionado, unidadPacienteProcesado, db) => {
    estadoAtencion = { "estado_atencion": "En espera" };
    const buscarPacientesEnEspera = await db.collection("pacientes").aggregate([
        { $match: estadoAtencion }
    ]).toArray();

    if(buscarPacientesEnEspera.length > 0){
        var mismaUnidadSinPacienteEnEspera = true;
        for(const pacienteEnEspera of buscarPacientesEnEspera) {
            const unidadPacienteEnEspera = await BuscarUnidad(pacienteEnEspera["tipo"], pacienteEnEspera["prioridad"]);
            if(unidadPacienteEnEspera == unidadPacienteProcesado){
                mismaUnidadSinPacienteEnEspera = false;
            }
        }
        if(mismaUnidadSinPacienteEnEspera){
            const updatePacienteProcesadoSeleccionado = {estado_atencion: "En espera"};
            await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesadoSeleccionado["_id"]}, updatePacienteProcesadoSeleccionado);
        }
    }else{
        const updatePacienteProcesadoSeleccionado = {estado_atencion: "En espera"};
        await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesadoSeleccionado["_id"]}, updatePacienteProcesadoSeleccionado);
    } 
}

const BuscarUnidad = async (pacienteTipo, pacientePrioridad) => {
    // Buscar unidad de atención
    var unidad = "Pediatría";
    if(pacienteTipo == "Niño"){
        if(pacientePrioridad <= 4){
            unidad = "Pediatría";
        }
    }else{
        unidad = "CGI";
    }
    
    if(pacientePrioridad > 4){
        unidad = "Urgencia";
    }

    return unidad;
}

const BuscarConsulta = async (estado, unidad = null, db) => {
    var buscarConsultaDisponible = null;
    if(unidad){
        buscarConsultaDisponible = await db.collection("consultas").findOne({
            "tipo": unidad, 
            "estado": estado
        })
    }else{
        buscarConsultaDisponible = await db.collection("consultas").findOne({
            "estado": estado
        })
    }
    
    return buscarConsultaDisponible;
}

const AtenderPacienteFinal = async (consultaDisponible, pacienteProcesado, db) => {
    // Actualizar consulta
    var consultaActualizada = { estado: "Ocupado" };
    consultaActualizada["personas_atendidas"] = consultaDisponible.personas_atendidas + 1;
    await CustomUpdateOne(db.collection("consultas"), {_id: consultaDisponible["_id"]}, consultaActualizada);
    
    // Actualizar paciente
    const updatePacienteProcesado = { estado_atencion: "Atendido" };
    await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesado["_id"]}, updatePacienteProcesado);
}

module.exports = { MonitorChanges };