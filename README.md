# INNOVACURE Backend - Generador de Cotizaciones en PDF

Este backend en Node.js con Express genera cotizaciones en PDF a partir de datos JSON, utilizando Handlebars para renderizar plantillas y Puppeteer para convertirlas a PDF. El sistema está diseñado para crear cotizaciones profesionales con el diseño corporativo de INNOVACURE.

## Características

- Generación de PDFs con diseño profesional y marca corporativa
- Formateo automático de precios con separadores de miles
- Cálculo automático de totales por producto
- Marca de agua y elementos de seguridad
- Diseño responsivo optimizado para impresión
- Soporte para múltiples productos en una sola cotización

## Instalación

```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]
cd TME-backend

# Instalar dependencias
npm install
```

## Configuración

El servidor se ejecuta por defecto en el puerto 3000. Puedes modificar esto estableciendo la variable de entorno `PORT`:

```bash
# En Windows
set PORT=4000 && npm start

# En Linux/Mac
PORT=4000 npm start
```

## Uso

### Iniciar el servidor

```bash
# Modo producción
npm start

# Modo desarrollo (con recarga automática)
npm run dev
```

El servidor se iniciará en: http://localhost:3000

### Endpoint para generar cotizaciones

- **URL**: `/generar-cotizacion`
- **Método**: `POST`
- **Headers**: 
  - `Content-Type: application/json`
- **Contenido**: JSON con el siguiente formato:

```json
{
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
  "total_cotizacion": 1458000,
  "nombre_vendedor": "Paola Barbosa"
}
```

#### Campos requeridos:
- `cotizacion_codigo`: Identificador único de la cotización
- `products`: Array de productos con sus detalles
- `nombre_cliente`: Nombre o razón social del cliente
- `fecha_actual`: Fecha de emisión de la cotización
- `total_cotizacion`: Monto total de la cotización

#### Campos opcionales:
- `nombre_vendedor`: Nombre del vendedor (por defecto: "Paola Barbosa")

### Respuesta

La respuesta incluirá:

```json
{
  "success": true,
  "mensaje": "Cotización generada correctamente",
  "pdf_base64": "[string en base64 del PDF]",
  "filename": "cotizacion_COT-20250518-9945.pdf"
}
```

## Pruebas

El proyecto incluye un script de prueba (`test.js`) que puedes usar para verificar el funcionamiento del backend:

```bash
# Asegúrate de que el servidor esté corriendo en otra terminal
npm start

# En otra terminal, ejecuta el script de prueba
node test.js
```

El script enviará una solicitud de prueba y guardará el PDF generado en la carpeta `output`.

## Estructura del Proyecto

```
TME-backend/
├── index.js              # Punto de entrada de la aplicación
├── routes/
│   └── cotizacion.js     # Rutas y lógica de generación de cotizaciones
├── views/
│   └── cotizacion.handlebars  # Plantilla HTML con estilos integrados
├── output/               # Carpeta donde se guardan los PDFs generados
├── public/              # Archivos estáticos
├── test.js              # Script de prueba
└── package.json         # Dependencias y scripts
```

## Diseño de la Cotización

La cotización generada incluye:

- Encabezado con logo de INNOVACURE
- Información del cliente
- Detalles de la cotización (número, fecha, validez, etc.)
- Tabla de productos con:
  - Item (número consecutivo)
  - Referencia (ID del producto)
  - Descripción
  - Cantidad
  - Precio unitario (formateado)
  - IVA
  - Total por producto
- Subtotal e IVA
- Total de la cotización
- Sección de firmas
- Pie de página con información de contacto
- Marca de agua de seguridad

## Dependencias

- Express: Framework web
- Express-Handlebars: Motor de plantillas
- Puppeteer: Generador de PDFs
- CORS: Manejo de peticiones entre dominios
- Body-parser: Procesamiento de cuerpos de peticiones

## Solución de Problemas

### Errores comunes:

1. **Error al generar PDF**:
   - Verifica que Puppeteer tenga los permisos necesarios
   - Asegúrate de que la carpeta `output` tenga permisos de escritura

2. **Error de renderizado**:
   - Verifica que todos los campos requeridos estén presentes en la solicitud
   - Asegúrate de que los valores numéricos sean números válidos

3. **Problemas de CORS**:
   - Verifica que el cliente esté configurado correctamente
   - Asegúrate de que las cabeceras CORS estén habilitadas en el servidor

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles. 