# Base de Datos — App Tareas

Schema SQL para reconstruir la base de datos en un nuevo proyecto Supabase.

## Archivos

- `schema.sql` — Estructura completa: tablas, índices, triggers y políticas RLS.

## Tablas

| Tabla | Propósito |
|---|---|
| `tasks` | Tareas del usuario (con papelera vía `deleted`) |
| `scheduled_notifications` | Recordatorios programados |
| `magic_links` | Auditoría de tokens + rate limiting |

## Notas de diseño

- **Sin FOREIGN KEYS**: la integridad se maneja a nivel de aplicación.
- **Sin `updated_at`**: no se trackea esa fecha.
- **Timezone naive** en `scheduled_notifications`: se maneja UTC-3 manualmente.
- **`magic_links` sin políticas RLS**: solo `service_role` accede (las Edge Functions y Netlify Functions).