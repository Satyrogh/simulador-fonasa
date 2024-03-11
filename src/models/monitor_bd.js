const { MongoConnect, CustomUpdateOne } = require('./mongo.js');
const moment = require('moment');

let lastChecked = moment().format("YYYY-MM-DD HH:mm:ss");

MonitorChanges = async(req, res) => {
    try {
        // Atender pacientes
        const db = await MongoConnect();
        setInterval(async () => {
            const consultasDesocupadas = await db.collection("consultas").find({ estado: "Libre" }).toArray();

            if(consultasDesocupadas.length > 0){

                const pacientesEnEspera = await db.collection("pacientes").find({estado_atencion: {$in: ["En espera", "Pendiente"]}}).toArray();

                if(pacientesEnEspera.length > 0){
                    await AtenderPaciente(db);
                }
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
            { $unwind: "$historia_clinica" },
            { $sort: { "historia_clinica.fecha_hora": -1, "prioridad": -1 } },

            { $limit: 1 }
        ]).toArray();

        var pacienteProcesadoSeleccionado = null;

        if(pacientesProcesados.length > 0){
            for(pacienteProcesadoSeleccionado of pacientesProcesados){
                if(pacienteProcesadoSeleccionado){
                    console.log("buscarConsultaDisponible", pacienteProcesadoSeleccionado)
    
                    const unidad = await BuscarUnidad(pacienteProcesadoSeleccionado["tipo"], pacienteProcesadoSeleccionado["prioridad"]);
                    const buscarConsultaDisponible = await BuscarConsulta("Libre", unidad, db);
    
                    var consultaDisponible = 0;
                    if(buscarConsultaDisponible){    
                        // Actualizar consulta
                        var consultaActualizada = {estado: "Ocupado"};
                        consultaActualizada["personas_atendidas"] = buscarConsultaDisponible.personas_atendidas + 1;
                        await CustomUpdateOne(db.collection("consultas"), {_id: buscarConsultaDisponible["_id"]}, consultaActualizada);
                        
                        // Actualizar paciente
                        const updatePacienteProcesadoSeleccionado = { estado_atencion: "Atendido" };
                        await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesadoSeleccionado["_id"]}, updatePacienteProcesadoSeleccionado);
                        return;
                    }else{
                        consultaDisponible = 0;    
                        console.log("No se encontraron consultas disponibles.", pacienteProcesadoSeleccionado['nombre'])    
                    }
                }
            }
        }
            
        // Procesar pendientes
        estadoAtencion = { "estado_atencion": "Pendiente" };
        const pacienteProcesadoPendiente = await db.collection("pacientes").aggregate([
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
            { $sort: { "historia_clinica.fecha_hora": 1, "prioridad": -1 } },

            { $limit: 1 }
        ]).toArray();

        if(pacienteProcesadoPendiente.length > 0){
            pacienteProcesadoSeleccionado = pacienteProcesadoPendiente[0];
        }

        if(pacienteProcesadoSeleccionado){
            const unidad = await BuscarUnidad(pacienteProcesadoSeleccionado["tipo"], pacienteProcesadoSeleccionado["prioridad"]);
            const buscarConsultaDisponible = await BuscarConsulta("Libre", unidad, db); 

            var consultaDisponible = 0;
            if(!buscarConsultaDisponible){    // No se encontraron consultas disponibles 
                // Actualizar paciente
            }else{ // Se encontró una consulta disponible
                // Validar que no haya un usuario en espera de la misma sala

                // Si hay un paciente en espera de la misma unidad
                const unidadPacienteProcesado = await BuscarUnidad(pacienteProcesadoSeleccionado["tipo"], pacienteProcesadoSeleccionado["prioridad"]);

                estadoAtencion = { "estado_atencion": "En espera" };
                const buscarPacientesEnEspera = await db.collection("pacientes").aggregate([
                    { $match: estadoAtencion }
                ]).toArray();

                if(buscarPacientesEnEspera.length > 0){
                    var mismaUnidadSinPacienteEnEspera = true;
                    buscarPacientesEnEspera.forEach((pacienteEnEspera) => {
                        const unidadPacienteEnEspera = BuscarUnidad(pacienteEnEspera["tipo"], pacienteEnEspera["prioridad"]);
                        if(unidadPacienteEnEspera == unidadPacienteProcesado){
                            mismaUnidadSinPacienteEnEspera = false;
                        }
                    })

                    console.log(unidadPacienteEnEspera, unidadPacienteProcesado);

                    if(mismaUnidadSinPacienteEnEspera){
                        const updatePacienteProcesadoSeleccionado = {estado_atencion: "En espera"};
                        await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesadoSeleccionado["_id"]}, updatePacienteProcesadoSeleccionado);
                    }
                }else{
                    const updatePacienteProcesadoSeleccionado = {estado_atencion: "En espera"};
                    await CustomUpdateOne(db.collection("pacientes"), {_id: pacienteProcesadoSeleccionado["_id"]}, updatePacienteProcesadoSeleccionado);
                } 
            }
        }else{
            console.log("No se encontraron pacientes pendientes.");
        }            

        

        return consultaDisponible;
    }catch(ex){
        console.log("Error al atender al paciente", ex)
        return 0;
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
module.exports = { MonitorChanges };