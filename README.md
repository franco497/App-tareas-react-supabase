# App Tareas - Sistema de Gestión y Recordatorios

Sistema web de gestión de tareas desarrollado con **React + Vite + Supabase** que permite organizar tareas, programar recordatorios automáticos por correo electrónico y autenticarse mediante **Magic Links**.

🔗 **Demo:** https://sistema-tareas-recordatorios.netlify.app

---

## ✨ Características principales

* 📝 **Gestión completa de tareas** – Crear, editar, eliminar y marcar tareas como completadas o pendientes.
* 📧 **Recordatorios automáticos por email** – Envío inmediato o programado mediante Gmail API y procesamiento automático con un cron job.
* 🗑️ **Papelera de reciclaje** – Restauración de tareas eliminadas o eliminación permanente.
* 🔐 **Autenticación con Magic Links** – Inicio de sesión sin contraseñas mediante Netlify Functions.
* 🛡️ **Protección anti-spam** – Límite de 15 solicitudes de acceso por hora para cada usuario.
* 📋 **Seguimiento de recordatorios** – Visualización del estado de todas las notificaciones programadas.
* 📱 **Mobile First** – Diseño optimizado para móviles, tablets y escritorio.
* 🎨 **Arquitectura CSS escalable** – Organización basada en ITCSS y Atomic Design.
* ⚡ **Enrutamiento completo** – Navegación fluida con React Router DOM.

---

## 🛠️ Stack Tecnológico

| Tecnología              | Uso                                      |
| ----------------------- | ---------------------------------------- |
| React 19                | UI y componentes                         |
| Vite                    | Build tool y desarrollo                  |
| React Router DOM        | Enrutamiento de la aplicación            |
| React Hook Form         | Manejo de formularios                    |
| Supabase                | Base de datos PostgreSQL y autenticación |
| Netlify Functions       | Autenticación mediante Magic Links       |
| Supabase Edge Functions | Procesamiento de recordatorios           |
| Gmail API               | Envío de correos electrónicos            |
| cron-job.org            | Ejecución del cron job                   |
| SweetAlert2             | Notificaciones y modales                 |
| CSS3                    | Estilos y diseño responsive              |

---

## 📊 Base de Datos

PostgreSQL mediante **Supabase**, utilizando **4 tablas relacionales** y **Row Level Security (RLS)** para garantizar que cada usuario solo pueda acceder a su propia información.

| Tabla                   | Propósito                          |
| ----------------------- | ---------------------------------- |
| tasks                   | Almacenamiento de tareas           |
| scheduled_notifications | Recordatorios programados          |
| magic_links             | Tokens temporales de autenticación |
| users                   | Información de usuarios            |

---

## 🚀 Flujo del Sistema

### 📧 Recordatorios programados

```text
Usuario crea una tarea
        ↓
Guarda la programación en Supabase
        ↓
Cron Job revisa la base de datos cada minuto
        ↓
Verifica fecha y hora (UTC-3)
        ↓
Envía el correo mediante Gmail API
        ↓
Actualiza el estado del recordatorio
```

### 🔐 Autenticación mediante Magic Links

```text
Usuario ingresa su email
        ↓
Netlify Function genera un token
        ↓
Guarda el token en Supabase
        ↓
Envía el enlace de acceso por email
        ↓
El usuario abre el enlace
        ↓
Se valida el token e inicia sesión
```

---

## 📂 Estructura del Proyecto

```text
/
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── pages/           # Páginas de la aplicación
│   ├── hooks/           # Custom Hooks
│   ├── services/        # Lógica de Supabase y Gmail
│   ├── styles/          # Arquitectura ITCSS
│   └── App.jsx
├── netlify/
│   └── functions/       # Magic Links
├── supabase/
│   └── functions/       # Edge Functions
├── package.json
└── netlify.toml
```

---

## 📖 Referencias bibliográficas

**El gran libro de HTML5, CSS3 y Javascript**
**Juan Diego Gauchat**
Guía completa sobre las tecnologías fundamentales del desarrollo web moderno.

**Eloquent JavaScript (JavaScript Elocuente)**
**Marijn Haverbeke**
Libro moderno y práctico que cubre desde fundamentos hasta temas avanzados del lenguaje. Disponible gratuitamente en línea, con enfoque en código claro y eficiente.

---

## 📝 Licencia

Proyecto desarrollado con fines educativos y de portafolio.
