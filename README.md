App Tareas - Sistema de Gestión y Recordatorios
Sistema completo de gestión de tareas con recordatorios automáticos por email. Desarrollado con React + Vite + Supabase + Netlify, integra autenticación con Magic Links, envío de emails con Gmail API y un cron job automatizado para recordatorios programados.

🔗 Demo: https://sistema-tareas-recordatorios.netlify.app

✨ Características principales
📝 Gestión de tareas
Crear, editar y eliminar tareas

Marcar tareas como completadas/pendientes

Paginación para listas largas de tareas

Papelera de reciclaje con restauración y eliminación permanente

📧 Recordatorios por email
Envío inmediato: Notificaciones instantáneas con Gmail API

Programación de recordatorios: Selecciona fecha y hora para recibir recordatorios

Cron job automatizado: Servicio externo que revisa la base de datos cada minuto

Interfaz de seguimiento: Visualiza todas las tareas programadas y su estado

🔐 Autenticación
Magic Links con Netlify Functions

Límite de 15 intentos por hora por usuario (protección anti-spam)

Registro automático de nuevos usuarios

Experiencia fluida sin necesidad de contraseñas

📱 Diseño y experiencia
Mobile First: Adaptable a todos los dispositivos

Arquitectura CSS: ITCSS + Atomic Design

Tema visual: Acuarela nocturna con fondos degradados

Responsive: Optimizado para móviles, tablets y escritorio

🛠️ Stack Tecnológico
Tecnología	Uso
React 19	UI y componentes
Vite	Build tool y desarrollo
React Router DOM	Enrutamiento de la aplicación
React Hook Form	Manejo de formularios
Supabase	Base de datos PostgreSQL + Autenticación
Netlify Functions	Magic Links (serverless)
Supabase Edge Functions	Envío de emails programados
Gmail API	Envío de emails
cron-job.org	Ejecución del cron job
SweetAlert2	Notificaciones y modales
CSS3	Estilos y diseño responsive
📊 Base de Datos
PostgreSQL (Supabase) con 4 tablas relacionales y RLS:

Tabla	Propósito
tasks	Almacenamiento de tareas de usuarios
scheduled_notifications	Recordatorios programados
magic_links	Tokens de autenticación temporal
users Tabla de usuarios
Configuración de seguridad: Row Level Security (RLS) con políticas por usuario.

🚀 Flujo del sistema
📧 Recordatorios programados
text
Usuario programa tarea → Guarda en Supabase → Cron job revisa cada minuto →
  → Compara fechas (UTC-3 Argentina) → Envía email con Gmail API →
    → Actualiza estado a "enviado"
🔐 Magic Links
text
Usuario ingresa email → Netlify Function genera token →
  → Guarda en tabla magic_links → Envía email con enlace →
    → Usuario hace clic → Verifica token → Inicia sesión
📂 Estructura del Proyecto
/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Footer.jsx
│   │   ├── Navbar.jsx
│   │   ├── NotificationForm.jsx
│   │   ├── RescheduleModal.jsx
│   │   ├── ScheduledDetailsModal.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskForm.jsx
│   │   └── TaskList.jsx
│   ├── context/             # Context API (estado global)
│   ├── pages/               # Vistas de la aplicación
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── AuthCallback.jsx
│   │   ├── ScheduledTasks.jsx
│   │   └── Trash.jsx
│   ├── styles/              # CSS modular (ITCSS + Atomic Design)
│   ├── lib/                 # Configuraciones (Supabase)
│   └── App.jsx              # Componente principal
├── netlify/
│   └── functions/           # Serverless Functions
│       ├── send-magic-link.js
│       └── verify-magic-link.js
├── supabase/
│   └── functions/           # Edge Functions
│       ├── check-notifications/
│       └── send-email-gmail/
├── index.html
├── package.json
└── netlify.toml

🎨 Arquitectura CSS
Mobile First con estructura ITCSS + Atomic Design:

styles/
├── base/           # Variables, reset, globales
├── components/     # Estilos de componentes (Navbar, TaskCard, etc.)
├── pages/          # Estilos específicos de páginas
└── utilities/      # Animaciones, responsive, banners

📖 Referencias Bibliográficas
El gran libro de HTML5, CSS3 y Javascript - Juan Diego Gauchat
Guía completa sobre las tecnologías fundamentales del desarrollo web moderno.

Eloquent JavaScript (JavaScript Elocuente) - Marijn Haverbeke
Libro moderno y práctico que cubre desde fundamentos hasta temas avanzados del lenguaje. Disponible gratuitamente en línea.

📝 Licencia
Este proyecto es de código abierto para fines educativos y de portafolio.
