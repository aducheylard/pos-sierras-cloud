# 🛒 Sierras POS (Cloud Edition)

Sistema de Punto de Venta (POS) ligero, contenerizado y diseñado para la nube. Construido con Node.js y SQLite, optimizado para un despliegue rápido y seguro mediante Docker y Traefik.

## 🚀 Características Principales

- **Gestión de Inventario:** Control de productos con soporte para carga de imágenes.
- **Roles de Usuario:** Sistema de permisos (Administrador y Vendedores).
- **Base de Datos Ligera:** SQLite integrado para respaldos sencillos y alta velocidad.
- **Despliegue Automático:** Configuración completa con Docker Compose.
- **Seguridad SSL:** HTTPS automático gestionado por Traefik (Let's Encrypt).
- **Notificaciones:** Integración SMTP para envío de correos.
- **Seguridad:** Manejo de secretos mediante variables de entorno y hash de contraseñas con Bcrypt.

## 🛠️ Tecnologías

- **Backend:** Node.js + Express
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Base de Datos:** SQLite (better-sqlite3)
- **Infraestructura:** Docker & Docker Compose
- **Proxy/SSL:** Traefik

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone [https://github.com/aducheylard/pos-sierras-cloud.git](https://github.com/aducheylard/pos-sierras-cloud.git)
cd pos-sierras-cloud

```
### 2. Configurar Variables de Entorno
```
Crea un archivo .env con la siguiente estructura:
SMTP_HOST=smtp.gmail.com
SMTP_USER=xxx@dominio.cl
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=no-reply@dominio.cl

# Credenciales del Super Admin de la base de datos que se crean cuando la DB no existe.
ADMIN_USER=xxx
ADMIN_PASS=xxx
ADMIN_EMAIL=xxx@dominio.cl

```

### 3. Despliegue con Docker
```bash
docker compose up -d

Para ver los logs en tiempo real:
docker compose logs -f
```


### 📂 Estructura del Proyecto
```bash
├── public/          # Archivos estáticos (Frontend, CSS, JS)
│   └── uploads/     # Imágenes de productos (Persistente)
├── emailTemplate.js # Formato y contenido de emails
├── Dockerfile       # Configuración de la imagen de Node
├── docker-compose.yml # Orquestación de servicios
├── server.js        # Punto de entrada del servidor
├── .env             # Variables de entorno (NO COMMIT)
└── README.md        # Documentación
```
