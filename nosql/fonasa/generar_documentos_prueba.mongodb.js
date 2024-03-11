// Select the database to use.
use('fonasa');

const collectionsRemake = ["hospitales", "pacientes", "historias_clinicas", "consultas"];

collectionsRemake.forEach((element) => {
  db[element].drop();
  db.createCollection(element);
});

db.getCollection('hospitales').insertMany([
  {
    "id": "1",
    "nombre": "San José"
  }
]);

db.getCollection('pacientes').insertMany([
    {
      "id_historia_clinica": 1,
      "tipo": "Joven",
      "prioridad": 3,
      "riesgo": 10.5,
      "estado_atencion": "Pendiente",
    },
    {
      "id_historia_clinica": 2,
      "tipo": "Niño",
      "prioridad": 5,
      "riesgo": 14.5,
      "estado_atencion": "Pendiente",
    },
    {
      "id_historia_clinica": 3,
      "tipo": "Anciano",
      "prioridad": 4,
      "riesgo": 18.2,
      "estado_atencion": "Pendiente",
    }
]);

db.getCollection('historias_clinicas').insertMany(
  [
    {
      "id": "1",
      "fecha_hora": "2024-03-06 5:00:00.000",
      "id_historia_clinica": 1,
      "nombre": "Juan Pérez",
      "edad": 35,
      "peso": 80,
      "estatura": 1.80,
      "fumador": true,
      "años_fumador": 15,
      "dieta_asignada": false
    },
    {
      "id": "2",
      "fecha_hora": "2024-03-07 18:10:00",
      "id_historia_clinica": 2,
      "nombre": "María González",
      "edad": 8,
      "peso": 35,
      "estatura": 1.39,
      "fumador": false,
      "años_fumador": 0,
      "dieta_asignada": false
    },
    {
      "id": "3",
      "fecha_hora": "2024-03-08 04:10:00",
      "id_historia_clinica": 3,
      "nombre": "Pedro Rodríguez",
      "edad": 75,
      "peso": 58,
      "estatura": 1.62,
      "fumador": true,
      "años_fumador": 50,
      "dieta_asignada": true
    }
  ]
);

db.getCollection('consultas').insertMany([
  {
    "id": "1",
    "fecha_hora_actualizacion": null,
    "especialista": "Dr. García",
    "estado": "Libre",
    "tipo": "Pediatría",
    "id_hospital": "1",
    "personas_atendidas": 0
  },
  {
    "id": "2",
    "fecha_hora_actualizacion": null,
    "especialista": "Dra. López",
    "estado": "Libre",
    "tipo": "Urgencia",
    "id_hospital": "1",
    "personas_atendidas": 0
  },
  {
    "id": "3",
    "fecha_hora_actualizacion": null,
    "especialista": "Dr. Martínez",
    "estado": "Libre",
    "tipo": "CGI",
    "id_hospital": "1",
    "personas_atendidas": 0
  }
]);