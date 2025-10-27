# Contribuir al API Tester MCP Server

¡Gracias por tu interés en contribuir a este proyecto! Este documento te guiará a través del proceso de contribución.

## 🚀 Cómo Contribuir

### 1. Fork y Clone

1. Haz fork del repositorio en GitHub
2. Clona tu fork localmente:
   ```bash
   git clone https://github.com/tu-usuario/api-tester-mcp.git
   cd api-tester-mcp
   ```

### 2. Configuración del Entorno

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Prueba que todo funcione:
   ```bash
   npm test
   ```

### 3. Desarrollo

1. Crea una nueva rama para tu feature:
   ```bash
   git checkout -b feature/mi-nueva-caracteristica
   ```

2. Realiza tus cambios siguiendo las convenciones del proyecto

3. Prueba tus cambios:
   ```bash
   npm test
   ```

### 4. Commit y Push

1. Haz commit de tus cambios con un mensaje descriptivo:
   ```bash
   git add .
   git commit -m "feat: agregar nueva funcionalidad X"
   ```

2. Push a tu fork:
   ```bash
   git push origin feature/mi-nueva-caracteristica
   ```

### 5. Pull Request

1. Ve a GitHub y crea un Pull Request
2. Describe claramente qué cambios realizaste
3. Incluye ejemplos de uso si es aplicable

## 📝 Convenciones de Código

### Estilo de Código

- Usa **programación funcional** en lugar de clases
- Prefiere `const` sobre `let` cuando sea posible
- Usa arrow functions para callbacks
- Mantén las funciones pequeñas y enfocadas
- Agrega comentarios solo cuando la lógica no sea obvia

### Estructura de Archivos

```
api-tester-mcp/
├── index.js              # Archivo principal del servidor
├── package.json           # Configuración del proyecto
├── README.md             # Documentación principal
├── LICENSE               # Licencia MIT
├── .gitignore            # Archivos a ignorar
└── CONTRIBUTING.md       # Esta guía
```

### Convenciones de Commit

Usa el formato [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` para nuevas características
- `fix:` para corrección de bugs
- `docs:` para cambios en documentación
- `style:` para cambios de formato
- `refactor:` para refactoring de código
- `test:` para agregar o modificar tests
- `chore:` para tareas de mantenimiento

Ejemplos:
```
feat: agregar soporte para método PATCH
fix: corregir manejo de errores en api_post
docs: actualizar ejemplos en README
```

## 🧪 Testing

Antes de enviar tu PR, asegúrate de que:

1. El servidor inicia correctamente:
   ```bash
   npm test
   ```

2. Todas las herramientas funcionan como se esperaba

3. No hay errores en la consola

## 🐛 Reportar Bugs

Si encuentras un bug:

1. Verifica que no esté ya reportado en [Issues](https://github.com/tu-usuario/api-tester-mcp/issues)
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Información del entorno (Node.js version, OS, etc.)

## 💡 Sugerir Características

Para sugerir nuevas características:

1. Abre un issue con la etiqueta "enhancement"
2. Describe claramente:
   - Qué problema resuelve
   - Cómo debería funcionar
   - Ejemplos de uso

## 📋 Tipos de Contribuciones Buscadas

- **Nuevos métodos HTTP**: Soporte para métodos adicionales
- **Mejoras en el manejo de errores**: Mejor captura y formateo de errores
- **Optimizaciones de rendimiento**: Mejoras en velocidad y uso de memoria
- **Documentación**: Mejoras en README, ejemplos, comentarios
- **Tests**: Agregar tests automatizados
- **Características de seguridad**: Validaciones adicionales

## ❓ ¿Necesitas Ayuda?

Si tienes preguntas:

1. Revisa la documentación en el README
2. Busca en [Issues](https://github.com/tu-usuario/api-tester-mcp/issues) existentes
3. Crea un nuevo issue con la etiqueta "question"

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo la misma licencia MIT del proyecto.

---

¡Gracias por contribuir! 🎉