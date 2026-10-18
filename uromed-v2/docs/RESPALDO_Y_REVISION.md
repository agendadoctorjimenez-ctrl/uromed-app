# Respaldo, recuperación y revisión profesional

## Respaldo

Responsable: designar al doctor o encargado técnico. Definir frecuencia y tiempo máximo tolerable de pérdida/interrupción. Mantener copia cifrada separada de las cuentas operativas y probar restauración regularmente.

1. Activa backups/PITR de Supabase si el plan contratado lo permite. Verifica la frecuencia y retención reales del plan, no las supongas.
2. Respaldar base incluye tablas, funciones, RLS, usuarios/perfiles y metadatos de integración. Una exportación de solo tablas públicas no basta para recuperar autenticación.
3. Respaldar por separado objetos del bucket privado `clinical`. Los respaldos de la base Supabase no contienen los bytes de Storage. Conservar nombres de objeto, rutas y metadatos para que `clinical_files` siga apuntando a los mismos archivos.
4. Conserva el repositorio privado, archivo de bloqueo y versiones SQL. Las variables Vercel, el cliente OAuth y `TOKEN_ENCRYPTION_KEY` deben guardarse en el gestor de contraseñas. Sin la clave de cifrado no se recuperan refresh tokens.
5. No hagas dumps ni exportes pacientes a un repositorio GitHub. Los logs no deben incluir tokens, archivos, diagnósticos o cuerpos clínicos.

## Recuperación sin dañar el sistema anterior

1. Crea un tercer proyecto de recuperación aislado; suspende temporalmente sincronización en el entorno afectado para evitar escrituras duplicadas.
2. Restaura respaldo de base con un técnico; para base vacía sin respaldo se utiliza el SQL de esquema. No ejecutes el esquema inicial sobre una restauración que ya contiene tablas.
3. Restaura archivos privados en `clinical` con las mismas rutas. Comprueba RLS, no exposición pública, roles y revocación de perfiles.
4. Verifica inicio de sesión: un export de Postgres general puede requerir un procedimiento específico para recuperar Auth. No declares restablecido Auth sin probarlo.
5. Configura nuevas variables de entorno apuntando solo al proyecto restaurado. Antes de reiniciar Google, conserva `google_event_id`, revisiones, ETags y cola; reconstruirlos en blanco puede duplicar eventos. Los canales viejos deben detenerse o dejarse expirar; elimina los metadatos de canal restaurados antes de generar otro webhook.
6. Prueba con datos sintéticos la aceptación y el acceso a un documento restaurado. Solo tras revisar integridad reanuda operación. Nunca pruebes escribiendo sobre `uromed-app` antigua.
7. Rollback de Vercel revierte código, no revierte base ni archivos. Las modificaciones futuras de esquema deben usar migraciones revisadas y compatibles con recuperación.

## Revisión clínica y legal pendiente

Esta entrega implementa controles técnicos, no certifica cumplimiento normativo. El consultorio debe revisar con profesionales el contenido obligatorio del expediente, firmas y autenticación del responsable, conservación, acceso/confidencialidad y rectificaciones. Deben revisar también aviso de privacidad, tratamiento de datos de salud, consentimientos y excepciones legales, atención de derechos ARCO, relación con proveedores y transferencias internacionales. No se entrega un aviso legal aprobado ni un consentimiento listo para pacientes.

Las notas cerradas son inmutables y admiten enmiendas. La auditoría guarda actor, fecha y campos cambiados; no guarda una copia completa de cada versión de borradores ni audita cada lectura/descarga. Antes de producción valorar trazabilidad de lecturas, historiales completos de borrador, MFA obligatorio, sesiones, monitoreo, política de retención y evaluación de vulnerabilidades independiente. No hay firma certificada, expediente exportable con firma ni certificación NOM-024.

Referencias oficiales para esa revisión (vigencia y aplicación concreta a confirmar por el asesor):

- NOM-004-SSA3-2012, DOF: https://dof.gob.mx/nota_detalle_popup.php?codigo=5272787
- Texto vigente LFPDPPP, Cámara de Diputados (reforma indicada 14/11/2025): https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Backups Supabase: https://supabase.com/docs/guides/platform/backups
