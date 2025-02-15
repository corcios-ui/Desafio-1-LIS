const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = 3000;
const HISTORIAL_FILE = 'historial.json';

// Middleware para parsear JSON
app.use(express.json());

// Ruta para obtener el clima de una ciudad con opción de Celsius o Fahrenheit
app.get('/clima/:ciudad', async (req, res) => {
    const ciudad = encodeURIComponent(req.params.ciudad); // Codifica espacios correctamente
    const unidad = req.query.unidad || 'metric'; // 'metric' para °C, 'imperial' para °F
    const simbolo = unidad === 'imperial' ? '°F' : '°C';
    const url = `https://wttr.in/${ciudad}?format=j1`;

    try {
        const respuesta = await axios.get(url);
        const datos = respuesta.data;

        // 🔹 Validamos si los datos son correctos
        if (!datos || !datos.current_condition || datos.current_condition.length === 0) {
            return res.status(404).json({ error: "Ciudad no encontrada o datos no disponibles" });
        }

        const climaHoy = datos.current_condition[0];

        // 🔹 Convertimos la temperatura si es necesario
        let temperatura = parseFloat(climaHoy.temp_C);
        if (unidad === 'imperial') {
            temperatura = (temperatura * 9/5) + 32; // Conversión a °F
        }

        const resultado = {
            ciudad: req.params.ciudad,
            temperatura: `${temperatura.toFixed(1)}${simbolo}`,
            humedad: `${climaHoy.humidity}%`,
            clima: climaHoy.weatherDesc[0].value
        };

        // 🔹 Guardar historial en JSON
        guardarEnHistorial(resultado);

        res.json(resultado);
    } catch (error) {
        console.error("Error al obtener datos del clima:", error.message);
        res.status(500).json({ error: "Error obteniendo datos del clima. Intente nuevamente más tarde." });
    }
});

// 🔹 Función para guardar las consultas en historial.json
const guardarEnHistorial = (nuevoRegistro) => {
    fs.readFile(HISTORIAL_FILE, 'utf8', (err, data) => {
        let historial = [];

        if (!err) {
            try {
                historial = JSON.parse(data);
            } catch (error) {
                console.error("Error al leer el historial:", error.message);
            }
        }

        historial.push(nuevoRegistro);

        fs.writeFile(HISTORIAL_FILE, JSON.stringify(historial, null, 2), (err) => {
            if (err) console.error("Error al guardar en historial:", err.message);
        });
    });
};

// 🔹 Ruta para ver el historial de consultas
app.get('/historial', (req, res) => {
    fs.readFile(HISTORIAL_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: "No se pudo leer el historial" });
        }
        res.json(JSON.parse(data));
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
