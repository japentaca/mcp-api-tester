# API Tester MCP Server

Un servidor MCP (Model Context Protocol) para realizar pruebas de APIs de forma sencilla y eficiente. Este servidor proporciona herramientas para realizar peticiones HTTP (GET, POST, PUT, DELETE) y obtener respuestas formateadas en JSON.

## 🚀 Características

- **5 herramientas HTTP**: GET, POST, PUT, DELETE y una herramienta genérica para cualquier método HTTP
- **Respuestas formateadas**: Todas las respuestas se devuelven en formato JSON estructurado
- **Medición de tiempo**: Incluye tiempo de respuesta en milisegundos
- **Manejo de errores**: Captura y formatea errores de red y HTTP de forma clara
- **Headers personalizados**: Soporte para headers HTTP personalizados
- **Parámetros de consulta**: Soporte para query parameters
- **Timeout configurable**: 30 segundos de timeout por defecto
- **Redirecciones**: Manejo automático de hasta 5 redirecciones

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. **Clona el repositorio:**
```bash
git clone https://github.com/tu-usuario/api-tester-mcp.git
cd api-tester-mcp
```

2. **Instala las dependencias:**
```bash
npm install
```

3. **Prueba el servidor:**
```bash
npm test
```

## ⚙️ Configuración

### Configuración en Claude Desktop

Para usar este servidor MCP con Claude Desktop, agrega la siguiente configuración a tu archivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "api-tester": {
      "command": "node",
      "args": ["path/to/api-tester-mcp/index.js"],
      "env": {}
    }
  }
}
```

**Ubicación del archivo de configuración:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuración manual

También puedes ejecutar el servidor directamente:

```bash
node index.js
```

El servidor se ejecuta en modo stdio y está listo para recibir comandos MCP.

## 🔧 Herramientas Disponibles

### 1. `api_get`
Realiza una petición GET a una URL especificada.

**Parámetros:**
- `url` (string, requerido): URL de destino
- `headers` (object, opcional): Headers HTTP como pares clave-valor
- `params` (object, opcional): Parámetros de consulta como pares clave-valor

### 2. `api_post`
Realiza una petición POST con datos opcionales.

**Parámetros:**
- `url` (string, requerido): URL de destino
- `data` (any, opcional): Datos a enviar en el cuerpo de la petición
- `headers` (object, opcional): Headers HTTP como pares clave-valor
- `params` (object, opcional): Parámetros de consulta como pares clave-valor

### 3. `api_put`
Realiza una petición PUT con datos opcionales.

**Parámetros:**
- `url` (string, requerido): URL de destino
- `data` (any, opcional): Datos a enviar en el cuerpo de la petición
- `headers` (object, opcional): Headers HTTP como pares clave-valor
- `params` (object, opcional): Parámetros de consulta como pares clave-valor

### 4. `api_delete`
Realiza una petición DELETE.

**Parámetros:**
- `url` (string, requerido): URL de destino
- `headers` (object, opcional): Headers HTTP como pares clave-valor
- `params` (object, opcional): Parámetros de consulta como pares clave-valor

### 5. `api_request`
Herramienta genérica para realizar cualquier tipo de petición HTTP.

**Parámetros:**
- `method` (string, requerido): Método HTTP (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- `url` (string, requerido): URL de destino
- `data` (any, opcional): Datos a enviar (para POST, PUT, PATCH)
- `headers` (object, opcional): Headers HTTP como pares clave-valor
- `params` (object, opcional): Parámetros de consulta como pares clave-valor

## 📖 Ejemplos de Uso

### Ejemplo 1: GET simple
```json
{
  "tool": "api_get",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "method": "GET",
  "url": "https://jsonplaceholder.typicode.com/posts/1",
  "status": 200,
  "statusText": "OK",
  "headers": {...},
  "data": {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipit..."
  },
  "responseTime": 245
}
```

### Ejemplo 2: POST con datos JSON
```json
{
  "tool": "api_post",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts",
    "data": {
      "title": "Mi nuevo post",
      "body": "Contenido del post",
      "userId": 1
    },
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

### Ejemplo 3: GET con headers y parámetros
```json
{
  "tool": "api_get",
  "arguments": {
    "url": "https://api.ejemplo.com/datos",
    "headers": {
      "Authorization": "Bearer tu-token-aqui",
      "Accept": "application/json"
    },
    "params": {
      "page": "1",
      "limit": "10",
      "filter": "activo"
    }
  }
}
```

### Ejemplo 4: Petición genérica PATCH
```json
{
  "tool": "api_request",
  "arguments": {
    "method": "PATCH",
    "url": "https://api.ejemplo.com/usuarios/123",
    "data": {
      "nombre": "Nuevo nombre"
    },
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer tu-token"
    }
  }
}
```

## 📊 Formato de Respuesta

### Respuesta Exitosa
```json
{
  "success": true,
  "method": "GET",
  "url": "https://ejemplo.com/api",
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "content-length": "1234"
  },
  "data": {...},
  "responseTime": 156,
  "requestData": {...}
}
```

### Respuesta de Error
```json
{
  "success": false,
  "method": "POST",
  "url": "https://ejemplo.com/api",
  "error": "Request failed with status code 404",
  "code": "ERR_BAD_REQUEST",
  "status": 404,
  "statusText": "Not Found",
  "headers": {...},
  "data": {...},
  "requestData": {...}
}
```

## 🔍 Casos de Uso

- **Desarrollo de APIs**: Prueba rápida de endpoints durante el desarrollo
- **Debugging**: Verificación de respuestas y headers de APIs
- **Integración**: Pruebas de integración con servicios externos
- **Monitoreo**: Verificación del estado de APIs en producción
- **Documentación**: Generación de ejemplos de uso para documentación

## 🛡️ Características de Seguridad

- **Timeout**: Previene peticiones que cuelguen indefinidamente
- **Límite de redirecciones**: Evita bucles infinitos de redirección
- **Manejo de errores**: Captura y formatea errores de forma segura
- **Sin almacenamiento**: No guarda datos sensibles en memoria

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🐛 Reportar Problemas

Si encuentras algún problema o tienes sugerencias, por favor:

1. Revisa los [issues existentes](https://github.com/tu-usuario/api-tester-mcp/issues)
2. Si no existe, crea un [nuevo issue](https://github.com/tu-usuario/api-tester-mcp/issues/new)
3. Incluye información detallada sobre el problema
4. Proporciona ejemplos de reproducción si es posible

## 📞 Soporte

- **Documentación**: Este README
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/api-tester-mcp/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/tu-usuario/api-tester-mcp/discussions)

## 🔄 Changelog

### v1.0.0
- ✨ Implementación inicial del servidor MCP
- 🔧 5 herramientas HTTP (GET, POST, PUT, DELETE, genérica)
- 📊 Respuestas formateadas en JSON
- ⏱️ Medición de tiempo de respuesta
- 🛡️ Manejo robusto de errores
- 📖 Documentación completa

---

**¿Te gusta este proyecto?** ⭐ ¡Dale una estrella en GitHub!