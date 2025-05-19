const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Endpoint para generar cotización
router.post('/generar-cotizacion', async (req, res) => {
    try {
        const cotizacionData = req.body;
        
        // Verificar que los datos necesarios estén presentes
        if (!cotizacionData.cotizacion_codigo || !cotizacionData.products || !cotizacionData.nombre_cliente) {
            return res.status(400).json({ error: 'Faltan datos requeridos para la cotización' });
        }

        // Transformar los datos de los productos
        const productos = cotizacionData.products.map((producto, index) => {
            // Formatear el precio con separadores de miles
            const precioFormateado = producto.precio.toLocaleString('es-CO');
            const totalProducto = producto.precio * producto.cantidad;
            
            return {
                item: index + 1,
                referencia: producto.id,
                descripcion: producto.nombre,
                cantidad: producto.cantidad,
                precio_unitario: precioFormateado,
                total: totalProducto.toLocaleString('es-CO')
            };
        });

        // Datos para la plantilla
        const datosPlantilla = {
            cotizacion_codigo: cotizacionData.cotizacion_codigo,
            fecha_actual: cotizacionData.fecha_actual,
            nombre_cliente: cotizacionData.nombre_cliente,
            productos: productos,
            total_cotizacion: cotizacionData.total_cotizacion.toLocaleString('es-CO'),
            nombre_vendedor: cotizacionData.nombre_vendedor || 'Paola Barbosa' // Valor por defecto si no se proporciona
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
                    width: 794, // Ancho en píxeles para A4 a 96 DPI
                    height: 1123, // Alto en píxeles para A4 a 96 DPI
                    deviceScaleFactor: 1,
                });
                
                await page.setContent(html, { waitUntil: 'networkidle0' });
                
                const outputPath = path.join(__dirname, '../output', `cotizacion_${cotizacionData.cotizacion_codigo}.pdf`);
                
                await page.pdf({
                    path: outputPath,
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '0',
                        right: '0',
                        bottom: '0',
                        left: '0'
                    }
                });

                await browser.close();

                // Leer el archivo generado
                const pdfBuffer = fs.readFileSync(outputPath);
                const pdfBase64 = pdfBuffer.toString('base64');

                // Devolver la respuesta con el PDF
                res.status(200).json({
                    success: true,
                    mensaje: 'Cotización generada correctamente',
                    pdf_base64: pdfBase64,
                    filename: `cotizacion_${cotizacionData.cotizacion_codigo}.pdf`
                });
            } catch (error) {
                console.error('Error al generar el PDF:', error);
                res.status(500).json({ error: 'Error al generar el PDF', detalle: error.message });
            }
        });
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }
});

module.exports = router; 