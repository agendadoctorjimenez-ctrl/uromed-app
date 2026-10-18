# UROMED V2

Aplicación independiente para instalar en las cuentas del Dr. Israel Jiménez Heredia. Código Next.js 16, TypeScript, Tailwind 4 y Supabase. No hay proyectos remotos creados, credenciales ni datos reales dentro de la entrega.

**Comienza por `docs/INSTALACION.md` o `INICIAR_AQUI.html` en la raíz del ZIP.** La cuenta antigua de UROMED no se ha usado ni modificado.

## Contenido

- Tarjeta pública con el logo adjunto original, sedes, teléfonos, llamadas/WhatsApp, mapas y horarios editables, banco oculto por defecto.
- Inicio de sesión Supabase SSR, roles en tabla protegida, RLS por módulo y archivos privados.
- Agenda por día/semana/mes, citas vinculadas a pacientes, búsqueda, estados, filtro de sucursal, exclusión de solapamientos y Realtime.
- Pacientes, notas clínicas con cierre/enmiendas, laboratorios y documentos, PSA con gráficos/umbral, cirugías y seguimientos.
- Lotes/inventario y aplicaciones de vacuna/Zoladex con descuento transaccional e idempotencia.
- Trabajador de Google Calendar: OAuth servidor, cifrado de tokens, cola, ETags, IDs estables, webhooks, renovación, syncToken, reintentos, reconciliación y resolución de conflictos.

## Arranque local

```bash
npm ci
# Copiar .env.example a .env.local y completar el proyecto de pruebas NUEVO.
npm run check
npm run dev
```

`sql/01-schema.sql`: esquema inicial transaccional, ejecutar solo en Supabase nuevo. `sql/02-create-staff.sql`: completar UUID de usuarios del doctor y asistente después de crearlos en Auth. No hay contraseña por defecto, acceso demo ni registro público.

## Verificación y límites

30 pruebas locales pasaron. PostgreSQL local PGlite ejecutó el SQL y las políticas con Auth/Storage simulados; otras pruebas simularon Google HTTP/Data API. TypeScript y build de producción pasan. Chromium verificó la tarjeta pública a 1400 y 390 píxeles, login sin configuración, redirección privada y cron sin autorización (401). No hubo errores de navegador ni desbordamiento horizontal móvil.

**Esto no prueba un Supabase alojado ni un Google Calendar real.** Instalar, autorizar y completar `docs/ACEPTACION.md` antes de uso clínico. La entrega no declara operación de producción ni cumplimiento normativo certificado. Ver `docs/RESPALDO_Y_REVISION.md`.

Las gráficas de laboratorio agrupan valores numéricos del mismo estudio/unidad; no interpretan resultados. Esquemas/dosis se capturan por indicación médica. Recordatorios son alertas de pantalla, no mensajes automáticos. Google no recibe nombres ni textos clínicos/administrativos libres. Eventos recurrentes o de día completo requieren conversión manual. Revisa en aceptación los demás límites y decisiones.

## Cuentas que se necesitan

GitHub privado del doctor → código. Supabase nuevo del doctor → datos/Auth/Storage. Vercel del doctor → aplicación. Google Cloud y calendario dedicado del doctor → OAuth/agenda. Todos los secretos se configuran directamente en Vercel; solo URL y publishable key pueden ser públicos.

`vercel.json` pide Cron cada cinco minutos. Revisar plan compatible y entorno de producción estable; Preview no ejecuta esos Cron. No hay dominios personalizados, migración antigua ni servicios contratados.

## Mantenimiento

Conservar `package-lock.json`, revisión de dependencias y pruebas antes de actualizaciones. Crear migraciones revisadas para cambios posteriores, no reejecutar el esquema completo. Los backups de base no reemplazan backup de objetos privados. La revocación de perfil `active=false` bloquea accesos por RLS sin esperar a renovar JWT.
