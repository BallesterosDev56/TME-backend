const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

// Determinar si estamos en un entorno de producción
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Ejecutando en modo: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

// Directorio para almacenar PDFs - adaptado para entornos cloud
// En Railway y similares, /tmp es uno de los pocos directorios donde se puede escribir
const pdfStorageDir = isProduction 
    ? path.join(os.tmpdir(), 'pdfs') // En producción usa /tmp/pdfs
    : path.join(__dirname, '..', 'public', 'pdfs'); // En desarrollo usa public/pdfs

console.log(`Directorio de almacenamiento de PDFs: ${pdfStorageDir}`);

// Crear carpeta para almacenamiento si no existe
if (!fs.existsSync(pdfStorageDir)) {
    fs.mkdirSync(pdfStorageDir, { recursive: true });
    console.log(`Carpeta de PDFs creada: ${pdfStorageDir}`);
}

// Función para generar un identificador único
function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${randomStr}`;
}

// Función para formatear números con separador de miles y decimales
function formatCurrency(number) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

// Endpoint para generar cotización
router.post('/generar-cotizacion', async (req, res) => {
    let tempFilePath = null;
    let finalFilePath = null;
    
    try {
        const cotizacionData = req.body;
        
        // Verificar que los datos necesarios estén presentes
        if (!cotizacionData.cotizacion_codigo || !cotizacionData.products || !cotizacionData.total_cotizacion) {
            return res.status(400).json({ error: 'Faltan datos requeridos para la cotización' });
        }

        // Transformar los datos de los productos
        const productos = cotizacionData.products.map((producto, index) => {
            const totalProducto = producto.precio * producto.cantidad;
            
            return {
                item: index + 1,
                referencia: producto.id,
                descripcion: producto.nombre,
                cantidad: producto.cantidad,
                precio_unitario: formatCurrency(producto.precio),
                total: formatCurrency(totalProducto)
            };
        });

        // Datos para la plantilla
        const datosPlantilla = {
            // Datos de la cotización
            cotizacion_codigo: cotizacionData.cotizacion_codigo,
            fecha_actual: cotizacionData.fecha_actual,
            
            // Datos del cliente
            nombre_cliente: cotizacionData.cliente?.nombre_cliente || '',
            documento_cliente: cotizacionData.cliente?.documento_cliente || '',
            direccion_cliente: cotizacionData.cliente?.direccion_cliente || '',
            telefono_cliente: cotizacionData.cliente?.telefono_cliente || '',
            correo_cliente: cotizacionData.cliente?.correo_cliente || '',
            tipo_cliente: cotizacionData.cliente?.tipo_cliente || '',
            
            // Datos de los productos
            productos: productos,
            
            // Totales
            subtotal: formatCurrency(cotizacionData.total_cotizacion),
            total_cotizacion: formatCurrency(cotizacionData.total_cotizacion),
            
            // Datos del vendedor
            nombre_vendedor: cotizacionData.vendedor?.nombre || 'Paola Barbosa',
            telefono_vendedor: cotizacionData.vendedor?.telefono || '',
            email_vendedor: cotizacionData.vendedor?.email || '',
            
            // Datos adicionales
            forma_pago: '100% Anticipado',
            moneda: 'COP - Peso colombiano',
            observaciones: cotizacionData.observaciones || ''
        };

        // Renderizar la plantilla
        res.render('cotizacion', datosPlantilla, async (err, html) => {
            if (err) {
                console.error('Error al renderizar la plantilla:', err);
                return res.status(500).json({ error: 'Error al generar la cotización', detalle: err.message });
            }

            try {
                // Configuraciones específicas para Puppeteer
                const browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                
                // Establecer tamaño A4
                await page.setViewport({
                    width: 794,
                    height: 1123,
                    deviceScaleFactor: 1,
                });
                
                await page.setContent(html, { waitUntil: 'networkidle0' });
                
                // Generar un nombre de archivo único
                const uniqueFileName = `cotizacion_${cotizacionData.cotizacion_codigo}_${generateUniqueId()}.pdf`;
                
                // Ruta para el archivo PDF
                tempFilePath = path.join(os.tmpdir(), uniqueFileName);
                finalFilePath = path.join(pdfStorageDir, uniqueFileName);
                
                // Generar PDF
                await page.pdf({
                    path: tempFilePath,
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '0',
                        right: '0',
                        bottom: '0',
                        left: '0'
                    },
                    preferCSSPageSize: true,
                    displayHeaderFooter: false
                });

                await browser.close();

                // Verificar que el archivo temporal existe
                if (!fs.existsSync(tempFilePath)) {
                    throw new Error('El archivo PDF temporal no se generó correctamente');
                }

                console.log('Archivo PDF generado en:', tempFilePath);
                console.log('Tamaño del archivo:', fs.statSync(tempFilePath).size, 'bytes');

                // Copiar el archivo al directorio de almacenamiento final
                fs.copyFileSync(tempFilePath, finalFilePath);
                console.log(`PDF copiado a: ${finalFilePath}`);
                
                // Eliminar archivo temporal original si es diferente del final
                if (tempFilePath !== finalFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                    console.log(`Archivo temporal eliminado: ${tempFilePath}`);
                }
                
                // Construir la URL para acceder al PDF 
                let pdfUrl;
                
                if (isProduction) {
                    // En producción, crear una URL que será manejada por el endpoint /pdf/:filename
                    // Este endpoint servirá el archivo desde el directorio temporal
                    const baseUrl = req.protocol + '://' + req.get('host');
                    pdfUrl = `${baseUrl}/pdf/${uniqueFileName}`;
                } else {
                    // En desarrollo, usar la carpeta pública estática
                    const baseUrl = req.protocol + '://' + req.get('host');
                    pdfUrl = `${baseUrl}/pdfs/${uniqueFileName}`;
                }
                
                // Devolver la respuesta con la URL del PDF
                res.status(200).json({
                    success: true,
                    mensaje: 'Cotización generada correctamente',
                    secure_url: pdfUrl,
                    filename: uniqueFileName,
                    expires: 'No expira (almacenamiento del servidor)'
                });
            } catch (error) {
                // Limpiar archivos temporales en caso de error
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                if (finalFilePath && tempFilePath !== finalFilePath && fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                }
                
                console.error('Error al generar el PDF:', error);
                console.error('Stack trace:', error.stack);
                res.status(500).json({ 
                    error: 'Error al generar el PDF', 
                    detalle: error.message,
                    stack: error.stack
                });
            }
        });
    } catch (error) {
        // Limpiar archivos temporales en caso de error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        if (finalFilePath && tempFilePath !== finalFilePath && fs.existsSync(finalFilePath)) {
            fs.unlinkSync(finalFilePath);
        }
        
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }
});

// Endpoint para servir los PDFs en producción
router.get('/pdf/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(pdfStorageDir, filename);
    
    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
        // Servir el archivo como descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=${filename}`);
        
        // Crear un stream de lectura y enviarlo como respuesta
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

module.exports = router;