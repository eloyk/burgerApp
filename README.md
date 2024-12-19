# Sistema de Gestión Digital para Restaurantes de Comida Rápida

Sistema integral diseñado para optimizar operaciones mediante tecnologías avanzadas de control de pedidos y análisis de datos en tiempo real. Ofrece soluciones tecnológicas completas para administración restaurantera, incluyendo gestión de inventario, seguimiento de pedidos y herramientas de visualización de información en tiempo real.

## Características Principales

- 🍔 Gestión de menú y categorías
- 📦 Control de inventario en tiempo real
- 🛒 Sistema de pedidos con personalización
- 👨‍🍳 Vista de cocina para seguimiento de pedidos
- 📊 Estadísticas de ventas y análisis
- 💳 Sistema de fidelización de clientes
- 🔄 Actualizaciones en tiempo real con WebSocket

## Requisitos del Sistema

- Python 3.11 o superior
- PostgreSQL 12 o superior
- Poetry (gestor de dependencias)
- Navegador web moderno con soporte para WebSocket

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd <nombre-del-proyecto>
```

2. Instalar Poetry si no está instalado:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

3. Configurar Poetry para crear el entorno virtual en el proyecto:
```bash
poetry config virtualenvs.in-project true
```

4. Instalar dependencias con Poetry:
```bash
poetry install
```

5. Activar el entorno virtual:
```bash
poetry shell
```

## Configuración

1. Configurar PostgreSQL:
   - Crear una base de datos para el proyecto
   - Asegurarse de que el usuario tiene permisos suficientes

2. Configurar las variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto:
```env
# Configuración de la base de datos
DATABASE_URL=postgresql://<usuario>:<contraseña>@<host>:<puerto>/<nombre_db>

# Clave secreta para Flask (puedes generarla con: python -c "import secrets; print(secrets.token_hex())")
FLASK_SECRET_KEY=<tu-clave-secreta>

# Puerto de la aplicación (por defecto: 5000)
FLASK_PORT=5000

# Modo de desarrollo (development/production)
FLASK_ENV=development
```

3. Inicializar la base de datos:
```bash
# Asegurarse de estar en el entorno virtual de Poetry
poetry shell

# Limpiar migraciones existentes (si las hay)
rm -rf migrations/versions/*

# Inicializar las migraciones
flask db init

# Generar la migración inicial
flask db migrate -m "initial migration"

# Aplicar las migraciones
flask db upgrade
```

4. Verificar la instalación:
```bash
# Iniciar el servidor de desarrollo
poetry run python app.py

# La aplicación estará disponible en http://localhost:5000
```

## Estructura del Proyecto

```
├── app.py                 # Aplicación principal Flask
├── models.py             # Modelos de la base de datos
├── database.py          # Configuración de la base de datos
├── static/              # Archivos estáticos
│   ├── css/            # Estilos CSS
│   │   ├── main.css    # Estilos principales
│   │   └── admin.css   # Estilos del panel de administración
│   └── js/             # Scripts JavaScript
│       ├── menu.js     # Gestión del menú
│       ├── orders.js   # Gestión de pedidos
│       ├── kitchen.js  # Vista de cocina
│       ├── inventory.js # Control de inventario
│       └── stats.js    # Visualización de estadísticas
├── templates/          # Plantillas HTML
│   ├── admin/         # Plantillas del panel de administración
│   ├── layout.html    # Plantilla base
│   ├── menu.html      # Vista del menú
│   ├── kitchen.html   # Vista de cocina
│   └── orders.html    # Vista de pedidos
├── migrations/         # Migraciones de la base de datos
└── tests/             # Pruebas unitarias
```

## Uso

1. Iniciar el servidor de desarrollo:
```bash
poetry run python app.py
```

2. Acceder a la aplicación:
   - Panel principal: http://localhost:5000
   - Vista de cocina: http://localhost:5000/kitchen
   - Gestión de inventario: http://localhost:5000/inventory
   - Estadísticas: http://localhost:5000/stats

3. Rutas principales:
   - `/`: Página principal con el menú
   - `/kitchen`: Vista para la cocina
   - `/orders`: Seguimiento de pedidos
   - `/inventory`: Gestión de inventario
   - `/stats`: Estadísticas y reportes
   - `/admin`: Panel de administración

4. API Endpoints:
   - `GET /api/products`: Lista de productos
   - `GET /api/categories`: Lista de categorías
   - `POST /api/orders`: Crear nuevo pedido
   - `GET /api/inventory`: Estado del inventario
   - `GET /api/stats/daily`: Estadísticas diarias

## Módulos Principales

### Gestión de Menú
- Organización por categorías personalizables
- Personalización de productos con opciones configurables
- Control de disponibilidad en tiempo real
- Imágenes y descripciones detalladas
- Precios y variantes por producto

### Sistema de Pedidos
- Interfaz intuitiva para clientes
- Personalización de productos (cocción, extras, instrucciones)
- Seguimiento en tiempo real con WebSocket
- Notificaciones de estado
- Historial de pedidos por cliente

### Control de Inventario
- Gestión de stock en tiempo real
- Alertas automáticas de nivel bajo
- Registro detallado de movimientos
- Control de ingredientes por producto
- Reportes de uso y pérdidas

### Estadísticas y Reportes
- Ventas diarias y semanales
- Productos más vendidos
- Análisis de tendencias
- Horas pico de ventas
- Reportes personalizables
- Exportación de datos

### Sistema de Fidelización
- Seguimiento de preferencias por cliente
- Recomendaciones personalizadas
- Historial detallado de pedidos
- Análisis de comportamiento
- Sistema de puntos (próximamente)

## Tecnologías Utilizadas

### Backend
- Flask 2.0+ (Python 3.11)
- SQLAlchemy 2.0+ con PostgreSQL
- Flask-Migrate para migraciones
- Flask-SocketIO para tiempo real
- Logging configurado para debugging

### Frontend
- HTML5 y CSS3 con diseño responsivo
- JavaScript moderno (ES6+)
- Bootstrap 5 para UI
- Socket.IO cliente
- Charts.js para visualizaciones

### Base de Datos
- PostgreSQL 12+
- SQLAlchemy ORM
- Migraciones con Alembic
- Índices optimizados
- Relaciones definidas

## Mantenimiento

### Actualizaciones
```bash
# Actualizar dependencias
poetry update

# Verificar dependencias
poetry check

# Listar dependencias desactualizadas
poetry show --outdated
```

### Base de Datos
```bash
# Crear nueva migración
poetry run flask db migrate -m "descripción del cambio"

# Aplicar migraciones pendientes
poetry run flask db upgrade

# Revertir última migración
poetry run flask db downgrade
```

### Regeneración de Datos
```bash
# Regenerar estadísticas
curl -X POST http://localhost:5000/api/stats/regenerate

# Verificar estado del sistema
curl http://localhost:5000/api/health
```

### Logs y Monitoreo
- Los logs se encuentran en `logs/`
- Nivel de log configurable en `.env`
- Monitoreo de errores y rendimiento
- Alertas configurables

## Resolución de Problemas

### Problemas Comunes

1. Error de conexión a la base de datos:
   - Verificar credenciales en `.env`
   - Confirmar que PostgreSQL está corriendo
   - Revisar logs en `logs/db.log`

2. Errores de migración:
   - Limpiar `migrations/versions/`
   - Reiniciar las migraciones
   - Verificar modelos en `models.py`

3. WebSocket no conecta:
   - Verificar configuración del puerto
   - Revisar logs de Socket.IO
   - Confirmar soporte del navegador

## Soporte y Contribución

### Soporte
- Abrir un issue para reportar bugs
- Consultar la wiki para guías detalladas
- Contactar al equipo de desarrollo

### Contribución
1. Fork del repositorio
2. Crear rama para feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Crear Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.