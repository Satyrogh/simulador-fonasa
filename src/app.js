const express = require('express');
const { IngresoPaciente, ListarPacientesMayorRiesgo, LiberarConsultas, ListarPacientesFumadoresUrgentes, ConsultaMasPacientesAtendidos, PacienteMasAnciano } = require('./models/funciones_bd.js');
const bodyParser = require('body-parser');
const path = require('path');
const browserSync = require('browser-sync');
const {MonitorChanges} = require('./models/monitor_bd.js');

const app = express();
const port = 3000;

// Rutas Express
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.locals.baseUrl = '/'; // URL Base
    next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    const data = { message: 'Welcome!' };
    res.render('index', data);
});

app.get('/ingresar-paciente', (req, res) => {
    const data = { message: 'Welcome!' };
    res.render('ingresar_paciente', data);
});

app.post('/ingresar-paciente', bodyParser.urlencoded(), IngresoPaciente);
  
app.get('/listar-paciente-mayor-riesgo', (req, res) => {
    const data = { message: 'Welcome!' };
    res.render('listar_paciente_mayor_riesgo', data);
});

app.post('/listar-paciente-mayor-riesgo', bodyParser.urlencoded(), ListarPacientesMayorRiesgo);
  
app.post('/liberar-consultas', bodyParser.urlencoded(), LiberarConsultas);

app.post('/listar-pacientes-fumadores-urgentes', bodyParser.urlencoded(), ListarPacientesFumadoresUrgentes);

app.post('/consulta-mas-pacientes-atendidos', bodyParser.urlencoded(), ConsultaMasPacientesAtendidos);

app.post('/paciente-mas-anciano', bodyParser.urlencoded(), PacienteMasAnciano);

MonitorChanges();

// Iniciar el servidor de Express
const server = app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
    
    // Iniciar BrowserSync después de que el servidor esté en funcionamiento
    browserSync.init({
        proxy: {
            target: `http://localhost:${port}`,
        },
        files: 
        [
            '**/*.ejs',
            '**/*.css', 
            'js/**/*.js',
            'js/**/**/*.js'
        ],
        port: port + 1,
        open: false
    });
});
