document.addEventListener("DOMContentLoaded", function(event) {
    document.getElementById('liberar_consultas').addEventListener('click', function(e) {
        e.preventDefault(); 

        fetch('/liberar-consultas', {
            method: 'POST'                
        })
        .then(response => response.json())
        .then(data => {
        if(data.message){
            document.getElementById('resultado').innerHTML = data.message;
        }else{
            console.log(data);

            let embellecer = `
                <h2>Consultas liberadas: </h2>
                <table id="dataTable" class="beautiful-table">
                    <thead>
                    <tr>
                        <th>Id Consulta</th>
                        <th>Especialista</th>
                        <th>Tipo</th>
                    </tr>
                    </thead>
                    <tbody>`;

            data.forEach(item => {
                embellecer += `
                    <tr>
                    <td>${item.id}</td>
                    <td>${item.especialista}</td>
                    <td>${item.tipo}</td>
                    </tr>`;
            });
            document.getElementById('resultado').innerHTML = embellecer;
        }
        })
        .catch((error) => {
            document.getElementById('resultado').innerHTML = error;
            alert(error);
            console.error(error, 'Error:', JSON.stringify(error));
        });
    });

    document.getElementById('listar_pacientes_fumadores_urgentes').addEventListener('click', function(e) {
        e.preventDefault(); 

        fetch('/listar-pacientes-fumadores-urgentes', {
            method: 'POST'                
        })
        .then(response => response.json())
        .then(data => {
        if(data.message){
            document.getElementById('resultado').innerHTML = data.message;
        }else{
            console.log(data);

            let embellecer = `
                <h2>Fumadores urgentes: </h2>
                <table id="dataTable" class="beautiful-table">
                    <thead>
                    <tr>
                        <th>Id Historia Clínica</th>
                        <th>Tipo</th>
                        <th>Prioridad</th>
                        <th>Riesgo</th>
                        <th>Estado Atención</th>
                    </tr>
                    </thead>
                    <tbody>`;

            data.forEach(item => {
                embellecer += `
                    <tr>
                    <td>${item.id_historia_clinica}</td>
                    <td>${item.tipo}</td>
                    <td>${item.prioridad}</td>
                    <td>${item.riesgo}</td>
                    <td>${item.estado_atencion}</td>
                    </tr>`;
            });
            document.getElementById('resultado').innerHTML = embellecer;
        }
        })
        .catch((error) => {
            document.getElementById('resultado').innerHTML = error;
            alert(error);
            console.error(error, 'Error:', JSON.stringify(error));
        });
    });

    document.getElementById('consulta_mas_pacientes_atendidos').addEventListener('click', function(e) {
        e.preventDefault(); 

        fetch('/consulta-mas-pacientes-atendidos', {
            method: 'POST'                
        })
        .then(response => response.json())
        .then(data => {
            if(data.message){
                document.getElementById('resultado').innerHTML = data.message;
            }else{
                document.getElementById('resultado').innerHTML = data;
            }
        })
        .catch((error) => {
            document.getElementById('resultado').innerHTML = error;
            alert(error);
            console.error(error, 'Error:', JSON.stringify(error));
        });
    });

    document.getElementById('paciente_mas_anciano').addEventListener('click', function(e) {
        e.preventDefault(); 

        fetch('/paciente-mas-anciano', {
            method: 'POST'                
        })
        .then(response => response.json())
        .then(data => {
            if(data.message){
                document.getElementById('resultado').innerHTML = data.message;
            }else{
                document.getElementById('resultado').innerHTML = data;
            }
        })
        .catch((error) => {
            document.getElementById('resultado').innerHTML = error;
            alert(error);
            console.error(error, 'Error:', JSON.stringify(error));
        });
    });
});