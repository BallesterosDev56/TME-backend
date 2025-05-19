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
console.log(`Servidor configurado para ejecutarse en el puerto ${PORT}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de Handlebars
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
console.log(`Directorio de vistas configurado: ${path.join(__dirname, 'views')}`);

// Carpeta para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
console.log(`Directorio público configurado: ${path.join(__dirname, 'public')}`);

// Carpeta para guardar los PDFs generados
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Modo de ejecución: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

const pdfDir = isProduction 
    ? path.join(require('os').tmpdir(), 'pdfs') 
    : path.join(__dirname, 'public', 'pdfs');

if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    console.log(`Directorio de PDFs creado: ${pdfDir}`);
}

// Importar rutas
const cotizacionRoutes = require('./routes/cotizacion');
app.use('/', cotizacionRoutes);
console.log('Rutas de cotización cargadas');

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en ${PORT}`);
});