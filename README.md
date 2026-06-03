# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


estructura de carpetas del sistema

APP-TAREAS-REACT-SUPABASE-22-I/
│
├── node_modules/
├── public/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── NotificationForm.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskForm.jsx
│   │   └── TaskList.jsx
│   │
│   ├── context/
│   │   └── TaskContext.jsx
│   │
│   ├── lib/
│   │   └── supabase.js
│   │
│   ├── pages/
│   │   ├── AuthCallback.jsx
│   │   ├── Dashboard.jsx
│   │   ├── login.jsx
│   │   └── NotFound.jsx
│   │
│   ├── supabase/
│   │   └── auth/
│   │       └── callback.js
│   │
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── .env
└── .gitignore

 Estructura final de tu proyecto:

 APP-TAREAS-REACT-SUPABASE-22-I/
│
├── backend-worker/              ← NUEVO (código del worker)
│   ├── package.json
│   ├── index.js
│   └── .env
│
├── supabase/                    ← Sigue existiendo
│   └── functions/
│       ├── send-email-gmail/   ← Para "Enviar ahora"
│       └── process-scheduled-emails/ (opcional, ya no necesitas)
│
├── src/                         ← Tu React App
│   ├── components/
│   ├── pages/
│   └── ...
│
└── .env