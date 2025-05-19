const express = require('express');
const cors = require('cors');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

// Inicializar la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de Handlebars
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Carpeta para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Carpeta para guardar los PDFs generados
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Importar rutas
const cotizacionRoutes = require('./routes/cotizacion');
app.use('/', cotizacionRoutes);

// Function to upload file to file.io
async function uploadFileToFileIO(filePath) {
    try {
        const fileData = fs.createReadStream(filePath);
        const response = await axios.post('https://file.io', fileData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log('File uploaded successfully:', response.data);
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

// Example usage of the upload function
// uploadFileToFileIO(path.join(outputDir, 'example.pdf'));

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 