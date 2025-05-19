const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

// Endpoint para generar cotización
router.post('/generar-cotizacion', async (req, res) => {
    let tempFilePath = null;
    
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
            nombre_vendedor: cotizacionData.nombre_vendedor || 'Paola Barbosa'
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
                
                // Crear archivo temporal
                tempFilePath = path.join(os.tmpdir(), `cotizacion_${cotizacionData.cotizacion_codigo}.pdf`);
                
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

                try {
                    // Implementación correcta de file.io según su documentación
                    console.log('Iniciando subida a file.io...');
                    
                    // Crear un objeto FormData correctamente formateado
                    const form = new FormData();
                    form.append('file', fs.createReadStream(tempFilePath), {
                        filename: `cotizacion_${cotizacionData.cotizacion_codigo}.pdf`,
                        contentType: 'application/pdf'
                    });
                    
                    // Añadir la expiración (1 semana)
                    form.append('expires', '1w');
                    
                    // Usar curl como alternativa si todo lo demás falla
                    const { exec } = require('child_process');
                    const curlCommand = `curl -F "file=@${tempFilePath}" https://file.io?expires=1w`;
                    
                    exec(curlCommand, (error, stdout, stderr) => {
                        if (error) {
                            console.error('Error ejecutando curl:', error);
                            // Intentar con transfer.sh como fallback
                            useTransferSh();
                            return;
                        }
                        
                        try {
                            const response = JSON.parse(stdout);
                            console.log('Response de file.io via curl:', response);
                            
                            if (response.success && response.link) {
                                // Eliminar archivo temporal
                                if (tempFilePath && fs.existsSync(tempFilePath)) {
                                    fs.unlinkSync(tempFilePath);
                                }
                                
                                // Devolver la respuesta con la URL
                                res.status(200).json({
                                    success: true,
                                    mensaje: 'Cotización generada correctamente',
                                    secure_url: response.link,
                                    filename: `cotizacion_${cotizacionData.cotizacion_codigo}.pdf`,
                                    expires: response.expiry || 'No expiration provided'
                                });
                            } else {
                                // Si hay un error con la respuesta, usar transfer.sh
                                console.error('Error en la respuesta de file.io:', response);
                                useTransferSh();
                            }
                        } catch (parseError) {
                            console.error('Error parseando la respuesta de curl:', parseError);
                            useTransferSh();
                        }
                    });
                    
                    // Función para usar transfer.sh como alternativa
                    async function useTransferSh() {
                        try {
                            console.log('Intentando subir a transfer.sh como alternativa...');
                            
                            const transferResponse = await axios({
                                method: 'put',
                                url: `https://transfer.sh/cotizacion_${cotizacionData.cotizacion_codigo}.pdf`,
                                data: fs.createReadStream(tempFilePath),
                                headers: {
                                    'Content-Type': 'application/pdf'
                                },
                                maxContentLength: Infinity,
                                maxBodyLength: Infinity
                            });
                            
                            // La respuesta de transfer.sh es directamente la URL como texto
                            const fileUrl = transferResponse.data.trim();
                            
                            // Eliminar archivo temporal
                            if (tempFilePath && fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                            
                            // Devolver la respuesta con la URL de transfer.sh
                            res.status(200).json({
                                success: true,
                                mensaje: 'Cotización generada correctamente (usando transfer.sh)',
                                secure_url: fileUrl,
                                filename: `cotizacion_${cotizacionData.cotizacion_codigo}.pdf`,
                                expires: '14 days (transfer.sh default)'
                            });
                        } catch (transferError) {
                            console.error('Error también en transfer.sh:', transferError);
                            
                            // Si ambos servicios fallan, enviar el error
                            res.status(500).json({ 
                                error: 'Error al subir el archivo a file.io y a transfer.sh', 
                                detalle: transferError.message
                            });
                        }
                    }
                } catch (error) {
                    // Limpiar archivo temporal en caso de error
                    if (tempFilePath && fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    console.error('Error al generar el PDF:', error);
                    console.error('Stack trace:', error.stack);
                    res.status(500).json({ 
                        error: 'Error al generar el PDF', 
                        detalle: error.message,
                        stack: error.stack
                    });
                }
            } catch (error) {
                // Limpiar archivo temporal en caso de error
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
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
        // Limpiar archivo temporal en caso de error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }
});

module.exports = router; 