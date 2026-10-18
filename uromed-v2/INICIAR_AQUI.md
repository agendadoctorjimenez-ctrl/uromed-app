# UROMED V2 — empezar aquí

Este es el proyecto completo para instalar en las cuentas del doctor. El ZIP de actualización anterior solo incluía cambios de estilo/RFC; este paquete incluye también los archivos base de Next.js, Supabase y Google Calendar.

## Primero: subir el código

Sube **esta carpeta completa `uromed-v2`** dentro de la raíz del repositorio privado nuevo del doctor. Al terminar, GitHub debe mostrar `uromed-v2/` y, dentro, `package.json`, `app/`, `components/`, `lib/`, `public/`, `sql/` y `docs/`. No subas `.env.local`, contraseñas ni claves.

En Vercel, el proyecto debe apuntar a la carpeta `uromed-v2` (**Root Directory = `uromed-v2`**). Si ya guardaste el campo vacío, vuelve a escribir `uromed-v2` después de subir la carpeta.

## Google Calendar

El código de OAuth, sincronización y resolución de conflictos está incluido. Para conectarlo, hace falta crear un calendario dedicado del doctor, un cliente OAuth de Google Cloud y configurar las variables indicadas en `.env.example` en Vercel. Después, el doctor entra a **Sistema → Configuración → Autorizar Google Calendar** y prueba **Sincronizar ahora**. La guía completa está en `docs/INSTALACION.md`.

## Supabase

Para un Supabase nuevo, sigue `docs/INSTALACION.md` en orden. Si el proyecto ya tiene el esquema UROMED V2 y ejecutaste `sql/03-public-rfc.sql`, no vuelvas a ejecutar esa migración. Nunca ejecutes `sql/01-schema.sql` sobre una base que ya contiene datos.

## Nota de Vercel Hobby

El archivo `vercel.json` solicita reconciliación de Calendar cada cinco minutos. El plan Hobby puede no admitir esa frecuencia. Durante pruebas puedes usar **Sincronizar ahora**; antes de confiar en la recuperación automática, revisa el plan y las opciones en `docs/INSTALACION.md`.
