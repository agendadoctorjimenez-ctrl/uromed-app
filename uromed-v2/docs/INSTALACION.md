# UROMED V2 — Instalación en las cuentas del doctor

**Entrega de código independiente. No se ha creado ni modificado ningún proyecto en las cuentas de Raquel.**

El ZIP contiene una aplicación Next.js/TypeScript, SQL para una base Supabase nueva, logo original, integración de Google Calendar y pruebas. No contiene contraseñas, claves, datos de pacientes ni conexiones a UROMED anterior. La instalación y aceptación en las cuentas del doctor siguen pendientes.

## 1. Antes de empezar

Abre una ventana o perfil de navegador dedicado al doctor. Comprueba el propietario visible en cada plataforma antes de crear recursos. Necesitas sus cuentas de GitHub, Supabase, Vercel y Google Cloud/Google Calendar; además, autorización del doctor para usar su calendario. No envíes claves por chat.

Extrae el ZIP completo. Abre **INICIAR_AQUI.html** para una guía legible. Para el repositorio, utiliza la carpeta `uromed-v2` y conserva sus archivos ocultos `.env.example` y `.gitignore`.

No uses las claves, el proyecto, el repositorio ni los registros de la aplicación antigua. Vacunas empieza vacío.

## 2. Supabase nuevo

1. En la organización del doctor, crea un proyecto llamado `uromed-v2`. Guarda su contraseña de base en un gestor de contraseñas. Selecciona la región apropiada para la operación.
2. En SQL Editor, pega y ejecuta **sql/01-schema.sql** una sola vez. El archivo usa una transacción: si falla, resuelve el error antes de reintentar. No lo ejecutes sobre una base existente.
3. En Authentication, desactiva registro público y accesos anónimos. Crea dos usuarios con correo propio: doctor y asistente. Asigna contraseñas individuales robustas y entrégalas por un canal privado. Activa las protecciones de contraseña y límites de autenticación disponibles.
4. Copia sus UUID de Authentication → Users. Sustitúyelos en **sql/02-create-staff.sql** y ejecútalo: doctor `medico`, asistente `asistente`. No se crean perfiles automáticamente para visitantes.
5. En Storage confirma que el bucket **clinical** es privado, admite PDF/JPEG/PNG y tiene límite de 10 MB. No lo cambies a público.
6. En Realtime confirma publicación de `appointments`, `followups`, `applications` e `inventory_lots`. El SQL ya los añade.
7. Obtén Project URL y publishable key desde Connect/API keys. La service-role key también se necesita, exclusivamente en servidor para Google.
8. Comprueba que la Data API esté habilitada para `public`. No expongas el esquema `private`. Los permisos SQL y RLS limitan cada tabla.

**Roles:** asistente accede a pacientes generales, agenda, seguimientos administrativos, vacunas/Zoladex y consulta inventario. Médico además administra configuración/inventario y accede a notas, laboratorios, PSA, cirugías, documentos y auditoría. Cambiar estos permisos requiere revisión y pruebas, no marcar un rol desde el navegador.

## 3. GitHub privado del doctor

Opción sencilla, sin pegar código archivo por archivo:

1. Instala GitHub Desktop e inicia sesión con la cuenta del doctor.
2. File → Add local repository → elige la carpeta `uromed-v2`. Si indica que no existe un repositorio, elige **Create a repository here**.
3. Revisa Changes: nunca deben figurar `.env.local`, claves ni `node_modules`.
4. Crea el primer commit y pulsa **Publish repository**. Nombre: `uromed-v2`; marca **Keep this code private**. Comprueba propietario.
5. Conserva `package-lock.json`. Las dependencias están fijadas. El README identifica las verificaciones y los límites reales.

Para un desarrollador, alternativa:

```bash
git init
git add .
git commit -m "UROMED V2: instalación independiente"
git branch -M main
```

Después añade el remoto del repositorio privado nuevo y haz push desde tu autenticación del doctor. No hay un remoto preconfigurado en esta entrega.

## 4. Vercel del doctor

1. Add New → Project → importa **ese repositorio privado** bajo el equipo correcto. Framework Next.js. Root Directory: raíz del repositorio si subiste el contenido de `uromed-v2`; `uromed-v2` si subiste la carpeta contenedora.
2. Usa Node.js 24, Install `npm ci`, Build `npm run build`.
3. Configura inicialmente las variables Supabase en los entornos de prueba que usarás, con los valores NUEVOS. Añade el resto según `.env.example`.
4. Establece una URL estable `*.vercel.app` para pruebas. `APP_URL` debe coincidir exactamente con ella, sin rutas ni barra final. El OAuth y los webhooks dependen de esta URL; no debe cambiar en cada commit.
5. Crea una rama `preview` para pruebas y usa su alias estable. No publiques un dominio personalizado ni declares producción clínica todavía.
6. Activa Deployment Protection en la versión de prueba. La protección completa también bloquea el callback/webhook de Google si no configuras acceso público a esas rutas. Deben ser accesibles `/api/calendar/callback` y `/api/calendar/webhook` mediante las excepciones que ofrezca tu plan. No pongas tokens de bypass en enlaces públicos ni en el código. Si el plan no permite esas excepciones, prueba primero el sistema privado y coordina un entorno de integración con protección de las páginas por login; no declares probado el webhook mientras Vercel lo bloquee.
7. Configura Site URL de Supabase con el alias estable. Esta aplicación inicia sesión con contraseña, no usa enlaces mágicos.
8. Despliega y abre `/login`. Entra con la cuenta del doctor. Si sale «Sin perfil activo», revisa UUID y perfil.

### Programador de recuperación de Google

`vercel.json` incluye reconciliación cada cinco minutos. **Vercel Hobby limita Cron a una vez al día; para este archivo se necesita un plan que admita esa frecuencia.** Los Cron de Vercel se activan en despliegues de producción, no en Preview. Para Preview prueba con **Sincronizar ahora** y callbacks/webhooks accesibles. La configuración del proceso automático deberá verificarse al habilitar el entorno estable de operación.

Si no habilitan Cron frecuente, puede sustituirse por un programador externo autorizado que llame GET `/api/calendar/sync` cada cinco minutos con `Authorization: Bearer CRON_SECRET`. Ese servicio no está provisionado. No elimines el programador y declares recuperación continua. Consulta condiciones de uso comercial de Vercel y presupuestos antes de contratar; no se ha contratado ningún plan.

## 5. Google Calendar y Google Cloud del doctor

1. En Google Calendar crea **un calendario nuevo dedicado «UROMED V2»**. Las dos sedes usan ese calendario. No uses el calendario antiguo ni uno personal: la importación incluye todos sus eventos individuales.
2. En Google Cloud del doctor crea un proyecto nuevo y habilita Google Calendar API.
3. Configura OAuth consent screen con el doctor como propietario. Durante prueba agrega al doctor como usuario de prueba. Pide solo `https://www.googleapis.com/auth/calendar.events`. Revisa con Google publicación/verificación y vigencia de refresh tokens antes de operación continua: en modo externo de pruebas pueden expirar.
4. Crea un OAuth Client de tipo Web application. Añade URI exacta `https://TU-ALIAS.vercel.app/api/calendar/callback`.
5. Obtén Calendar ID desde la configuración del calendario dedicado. La cuenta que autoriza debe poder editarlo.
6. En Vercel configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_ID`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY` y `CRON_SECRET`. No uses prefijo NEXT_PUBLIC para secretos.
7. Genera claves localmente (no están preasignadas): `openssl rand -base64 32` para TOKEN_ENCRYPTION_KEY y `openssl rand -hex 32` para CRON_SECRET. Si no tienes OpenSSL, `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` y equivalente `hex`. Copia resultados directamente a Vercel y al gestor de contraseñas. Nunca los subas a GitHub.
8. Redespliega. Entra como médico → Configuración → **Autorizar Google Calendar**. Selecciona su cuenta. Luego pulsa **Sincronizar ahora** y revisa última ejecución, cola, webhook y conflictos.
9. Crea en Google una cita individual con hora y `[LP]` o `[ZAM]` en el título. Debe aparecer en Agenda con paciente pendiente. Vincúlalo manualmente y guarda. No se vincula por nombre ni teléfono.
10. Crea y modifica citas UROMED, cancélalas y repite en Google. Documenta las pruebas de **ACEPTACION.md**.

Hacia Google se envía únicamente el horario, la sucursal y estado en un evento titulado «Consulta UROMED · Sucursal». Los nombres, teléfonos, textos libres, diagnósticos y notas quedan en UROMED. Los cambios en títulos/descripciones personales de Google no se exportan como notas clínicas ni vinculan pacientes automáticamente. Eventos de día completo o recurrentes se registran como conflictos y requieren conversión manual a citas individuales.

La sincronización usa OAuth servidor, refresh token cifrado AES-GCM, cola durable, IDs estables, ETags/If-Match, lease para evitar trabajadores concurrentes, webhooks con token, syncToken incremental, recuperación 410, reintentos y reconciliación completa diaria. Estos mecanismos están implementados; su funcionamiento real con Google permanece sin verificar.

Si ambos lados cambian, revisa la versión UROMED y la versión Google en Configuración. El médico elige cuál conservar; si hay solapamiento se bloquea hasta corregir horarios. Nunca se corrige una nota clínica desde Google.

## 6. Uso inicial

1. Captura direcciones, horarios, presentación y servicios en Configuración. Los teléfonos se entregan LP 3521327669 y Zamora 3511502304: verifica esa asignación antes de compartir la tarjeta.
2. Los datos bancarios empiezan vacíos y ocultos. Completa beneficiario/banco/CLABE y marca autorización solo si el doctor quiere publicarlos.
3. Agrega un paciente sintético. Guarda una cita y una nota de prueba. Cierra la nota; una corrección posterior usa una nueva nota con `amendment_to`.
4. Crea un lote de prueba de Gardasil 9 o Zoladex. Confirma una aplicación. El registro y descuento son atómicos e idempotentes. No se permiten aplicaciones futuras ni lotes caducados.
5. Para programar la primera aplicación, crea cita y seguimiento. Después de aplicar, captura la próxima fecha indicada por el médico. El sistema no prescribe un esquema ni una dosis automáticamente.
6. Los recordatorios son alertas dentro del panel; no se envían SMS, email o WhatsApp automáticamente. Los botones WhatsApp públicos solo abren el enlace del consultorio.

## 7. Desarrollo local opcional

Requiere Node 24. Copia `.env.example` a `.env.local` y completa valores del entorno sintético. Ejecuta `npm ci`, `npm run check` y `npm run dev`. No es necesario compilar localmente para importar GitHub en Vercel.

Sin variables, la tarjeta pública muestra datos institucionales básicos y el login informa que falta configuración. No hay acceso de demostración, usuarios ficticios preinstalados ni datos clínicos en memoria del navegador.

## 8. Antes de usar pacientes reales

Completa la aceptación en el entorno nuevo, prueba recuperación y valida los permisos con ambas cuentas y un visitante. Solicita revisión clínica/legal de los formatos, cierre y firma de notas, aviso de privacidad, consentimiento, conservación, derechos ARCO, proveedores y transferencias. El cierre autenticado implementado NO es una firma electrónica certificada ni una certificación NOM. No se declara cumplimiento normativo integral.

Fuentes oficiales de instalación consultadas el 13/10/2026:

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Google incremental sync: https://developers.google.com/workspace/calendar/api/guides/sync
- Google webhooks: https://developers.google.com/workspace/calendar/api/guides/push
- Vercel Cron límites: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel protección: https://vercel.com/docs/deployment-protection
