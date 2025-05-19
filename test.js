const fs = require('fs');
const path = require('path');
const http = require('http');

// Datos de prueba
const testData = {
  "cotizacion_codigo": "COT-20250518-9945",
  "products": [
    {
      "id": 92001,
      "nombre": "Surgaflex 4 cm x 6 cm",
      "precio": 230000,
      "cantidad": 2
    },
    {
      "id": 301,
      "nombre": "Drawtex Apósito para Heridas Hidroconductivo con tecnología LevaFiber 7,5 X 7,5 cm",
      "precio": 499000,
      "cantidad": 2
    }
  ],
  "fecha_actual": "2025-05-18",
  "nombre_cliente": "Hospital Universitario San Ignacio",
  "total_cotizacion": 1458000
};

// Opciones para la solicitud HTTP
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/generar-cotizacion',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Realizar la solicitud
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const responseData = JSON.parse(data);
      console.log("Respuesta recibida correctamente");
      
      if (responseData.success && responseData.pdf_base64) {
        // Decodificar el PDF desde base64 y guardarlo
        const pdfBuffer = Buffer.from(responseData.pdf_base64, 'base64');
        fs.writeFileSync(path.join(__dirname, 'output', responseData.filename), pdfBuffer);
        
        console.log(`✅ PDF guardado como: output/${responseData.filename}`);
      } else {
        console.error("❌ Error al generar el PDF:", responseData.error);
      }
    } catch (e) {
      console.error("❌ Error al procesar la respuesta:", e.message);
      console.log("Respuesta recibida:", data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Problema con la solicitud: ${e.message}`);
});

// Escribir los datos en el cuerpo de la solicitud
req.write(JSON.stringify(testData));
req.end();

console.log('📝 Enviando solicitud para generar cotización...'); 