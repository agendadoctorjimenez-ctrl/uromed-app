# UROMED ZAM-LP — reporte de validación técnica (11-oct-2026)

## Alcance y seguridad
- Rama de trabajo aislada: `work/uromed-safe-validation-20261011`.
- No se ha publicado en Vercel ni se ha ejecutado una migración.
- No se ha modificado ninguna fila de producción.
- No se han vinculado citas históricas ni creado pacientes.
- No se ha modificado DUO METHOD ni otro proyecto.
- El logo oficial del ZIP se conserva byte por byte en la entrega local; falta incorporarlo al repositorio porque no está presente en la rama principal y la interfaz actual ya lo referencia.

## Verificación de datos (solo lectura)
- `public.appointments`: 592.
- Citas con `patient_id IS NULL`: 590.
- `public.patients`: 16.
- `public.appointments_backup_20261006`: 592.
- `public.patients_backup_20261006`: 16.
- `reconciliation_private.appointment_patient_review_20261011`: 590.
- Una clínica configurada y un perfil configurado.
- Los respaldos y la conciliación se mantienen en sus ubicaciones actuales.

## Diferencias entre repositorio y ZIP
- La rama principal contiene `index.html` y `index-v6.html`, módulos de agenda, pacientes, vacunas, Zoladex, PSA, cirugías, seguimiento e inventario.
- La rama principal no contiene `logo-uromed.png`, aunque `index.html` ya lo referencia.
- La rama principal no implementa un expediente completo con firma validada, foto privada ni sincronización bidireccional de Calendar.
- El ZIP contiene un frontend ampliado y el PNG oficial, pero no debe sobrescribir el código remoto sin reconciliar las diferencias.
- El frontend ampliado intenta leer/escribir `public.clinical_notes`, tabla que no existe en el esquema productivo inspeccionado. El borrador de migración original tampoco corresponde al nombre de tabla que usa la interfaz.
- El SQL de Calendar del ZIP es solo preparación de tablas, no implementa OAuth, webhook, worker ni sincronización.

## Integración Google Calendar — bloqueante
La función Edge `super-endpoint` existe y está activa, pero no constituye sincronización bidireccional completa:
- acepta un secreto compartido y una lista de eventos en una petición;
- crea/actualiza citas desde Google, pero no publica cambios locales de vuelta a Google;
- no se verificó OAuth de usuario, gestión segura de refresh tokens, webhook `watch`, renovación del canal, `syncToken` incremental ni pruebas de altas/cambios/cancelaciones en ambos sentidos;
- deduce sucursal a partir de día o texto cuando falta el dato, lo que puede clasificar mal;
- puede intentar enlazar por coincidencia de nombre del título del evento; ese comportamiento no es admisible como conciliación clínica automática.
No debe ejecutarse contra citas reales hasta rediseñar y probar el flujo con un calendario de prueba y datos sintéticos. El calendario final previsto será único y compartido por La Piedad y Zamora.

## Seguridad observada
- RLS está activado en las tablas operativas inspeccionadas; varias tienen políticas limitadas por clínica/perfil.
- Los asesores de Supabase señalan que las tablas de respaldo y la tabla privada de conciliación tienen RLS sin políticas. Esto bloquea el acceso de usuarios normales por RLS; se debe confirmar además la ausencia de grants y el acceso de propietario/administración.
- Supabase Auth tiene deshabilitada la protección contra contraseñas filtradas.
- El linter reporta claves foráneas sin índices; no se aplicaron cambios de rendimiento.
- Vercel devuelve 403 para lecturas de configuración/despliegues bajo el equipo conectado. No se intentó cambiar de equipo ni se desplegó.
- No se validó un proceso de restauración de respaldos.

## Archivo SQL en esta rama
`supabase/migrations/20261011_uromed_clinical_calendar_draft.sql` es un borrador de revisión, no aplicado. Añade tablas privadas de integración, una tabla de notas clínicas de solo inserción y un bucket privado para fotos. Requiere revisión de esquema/políticas, pruebas aisladas y autorización antes de cualquier aplicación. La fecha de creación de una nota y la sesión del usuario no equivalen por sí solas a una firma electrónica jurídicamente validada.

## Pruebas ejecutadas
- Lectura de metadatos del repositorio, comparación de archivos disponibles y lectura de esquemas/políticas: completadas.
- Conteos de citas, pacientes, respaldos y conciliación: completados.
- Linter de seguridad y rendimiento de Supabase: consultado.
- Build, pruebas de navegador, pruebas integrales con Calendar, OAuth real, subida de foto, firma, restauración y pruebas de permisos multiusuario: pendientes; no se declaran como aprobadas.

## Próximos pasos para continuar
1. Recuperar autorización al equipo correcto de Vercel.
2. Crear/confirmar un entorno Supabase de desarrollo aislado.
3. Reconciliar el frontend remoto con el ZIP por bloques; incorporar el logo PNG oficial sin alterarlo.
4. Corregir y probar expediente, foto privada, auditoría y permisos por rol/sucursal.
5. Implementar OAuth y sincronización bidireccional con calendario de prueba.
6. Ejecutar pruebas E2E y seguridad con datos sintéticos y verificar restauración.
7. Pedir aprobación específica para migraciones en el entorno aprobado y, finalmente, para publicar en producción.
