# Aceptación en las cuentas del doctor

Estado de la entrega: código local probado; **no instalado ni verificado en servicios reales**. Usar exclusivamente pacientes sintéticos. Anota fecha, usuario, URL, evidencia y resultado de cada prueba. No marques «verificado» sin observar la operación de extremo a extremo.

| Prueba               | Resultado que se debe observar                                                                            | Estado externo |
| -------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| Propiedad            | GitHub, Supabase y Vercel pertenecen al doctor; proyectos nuevos                                          | Pendiente      |
| Visitante            | Tarjeta pública sin pacientes, documentos, notas ni claves; endpoints privados no accesibles              | Pendiente      |
| Banco                | Datos ocultos al desactivar autorización; visibles solo al autorizar                                      | Pendiente      |
| Doctor               | Guarda/reabre expediente, notas, laboratorio, PSA y cirugía                                               | Pendiente      |
| Asistente            | Agenda y demografía accesibles; notas, laboratorios, PSA, cirugías y archivos bloqueados incluso vía REST | Pendiente      |
| Nota cerrada         | Editar y borrar falla; enmienda agrega otro registro vinculado, conserva original                         | Pendiente      |
| Agenda               | Crear/editar/reprogramar/confirmar/atender/cancelar/no asistió; vistas diaria/semanal/mensual             | Pendiente      |
| Duplicados           | Dos solicitudes en paralelo para horarios solapados no crean dos citas                                    | Pendiente      |
| Sucursales           | LP y ZAM correctas; un mismo médico no se duplica entre sedes                                             | Pendiente      |
| Realtime             | Dos navegadores ven cambios al guardar sin recargar manualmente                                           | Pendiente      |
| UROMED → Google      | Evento creado con fecha local correcta y sede; sin datos clínicos                                         | Pendiente      |
| Google → UROMED      | Evento individual [LP]/[ZAM] aparece; paciente sin adivinar hasta vinculación manual                      | Pendiente      |
| Reprogramar/cancelar | Cambios reflejados en ambas direcciones; sin duplicados en reintentos                                     | Pendiente      |
| Conflictos           | Cambios simultáneos se detectan; médico elige versión; evita solapamientos                                | Pendiente      |
| Interrupción         | Al recuperar servicio/credenciales, cola reintenta; no repite eventos o aplicaciones                      | Pendiente      |
| Webhook              | Google entrega notificación HTTPS; firma de canal comprobada; evento importado                            | Pendiente      |
| Renovación           | Nueva suscripción antes de expirar; canal viejo se detiene o expira                                       | Pendiente      |
| Reconciliación       | Cron en entorno estable recupera cambios sin depender de webhooks                                         | Pendiente      |
| Laboratorios         | PDF/imagen guardado privado; asociado al paciente y estudio correcto; URL temporal expira                 | Pendiente      |
| PSA                  | Valores previos visibles, gráfica, umbral configurable, revisión sin diagnóstico automático               | Pendiente      |
| Vacuna/Zoladex       | Aplicación confirma un descuento; doble clic/reintento no descuenta otra unidad                           | Pendiente      |
| Inventario           | No permite saldo negativo, aplicación vencida o futura; movimientos y actor registrados                   | Pendiente      |
| Seguimientos         | Pendientes, responsable, prioridad y cierre se recuperan al volver a entrar                               | Pendiente      |
| Móvil                | Probar iPhone Safari y Android Chrome: login, búsquedas, formularios y agenda                             | Pendiente      |
| Respaldo             | Restauración en tercer proyecto de prueba reproduce registros y archivos privados                         | Pendiente      |
| Revisión profesional | Privacidad, consentimientos, nota clínica, firma y conservación validados                                 | Pendiente      |

No hay repositorio, proyecto Supabase ni URL de despliegue emitidos: los creará quien tiene los accesos del doctor. Ninguno se conectó a las cuentas actuales. La prueba de PostgreSQL local usa una implementación real del motor con Auth/Storage simulados: no demuestra funcionamiento del servicio Supabase alojado ni de su API/Realtime.

Diferencias y límites de esta primera versión: no hay importación de la app vieja; no hay correos/SMS automáticos, generación de diagnósticos, facturación ni firma electrónica certificada. Cirugías y contenidos clínicos son exclusivos del médico. Agenda individual sin soporte automático de recurrencias o eventos de todo el día. Los textos libres administrativos quedan internos y no se sincronizan a Google. Las consultas principales paginan a 50 registros; las opciones de pacientes/lotes usan la primera página de la Data API (normalmente hasta 1,000): deberán pasar a búsqueda remota antes de superar ese volumen. Las gráficas agrupan los resultados numéricos de laboratorio por nombre de estudio y unidades cuando hay al menos dos registros; también hay gráfica PSA. El esquema vacunación se captura como texto indicado por el profesional; no tiene un constructor de planes multidósis. La fotografía se consulta como archivo privado, no como avatar. Estas diferencias requieren valoración de aceptación; no se presenta esta versión como sistema clínico listo para producción.
