// Select the database to use.
use('fonasa');
db['pacientes'].drop();

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