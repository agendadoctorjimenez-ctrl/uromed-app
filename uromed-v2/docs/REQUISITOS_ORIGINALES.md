# Documento original de alcance

**Instrucción posterior prioritaria:** entregar archivos para instalar en las cuentas propias del doctor. No crear recursos en las cuentas actuales ni tocar el sistema anterior. Los requisitos de publicación externa se realizarán durante la instalación autorizada por quien tiene esos accesos.

# UROMED V2 — SISTEMA INTEGRAL DE UROLOGÍA

Actúa como desarrollador full-stack sénior, arquitecto de software y especialista en aplicaciones clínicas seguras.

**Construye desde cero una aplicación web real, completa y funcional llamada UROMED**, para el Dr. Israel Jiménez Heredia, especialista en Urología, con atención en La Piedad y Zamora, Michoacán, México.

Quiero desarrollarla utilizando **Next.js, TypeScript, Tailwind CSS, Supabase, GitHub y Vercel**, preferentemente gestionando todo desde este mismo espacio de v0.

Crea un proyecto nuevo e independiente llamado UROMED V2, un repositorio privado nuevo de GitHub y una base de datos Supabase nueva. No conectes ni modifiques la antigua aplicación `uromed-app`, su base de datos ni sus registros reales.

**No construyas únicamente pantallas demostrativas. Implementa datos persistentes, funciones reales, autenticación, validaciones, permisos, almacenamiento y pruebas.**

## 1. IDENTIDAD VISUAL

Utiliza exclusivamente el logo oficial adjunto de UROMED, con el lema «La Urología a tu Alcance».

- Rojo institucional tomado del logo original.
- Negro para títulos y elementos destacados.
- Blanco para fondos principales.
- Gris claro para tarjetas y elementos secundarios.
- Diseño médico profesional, minimalista, elegante y moderno.
- Interfaz completamente en español.
- Adaptable a computadora, iPhone y Android.

No recrees ni modifiques el logo, no cambies su tipografía ni utilices colores azul marino.

## 2. DOS ESPACIOS SEPARADOS

### ESPACIO PÚBLICO — TARJETA DIGITAL

Crea una página pública profesional con:

- Logo original.
- Nombre: Dr. Israel Jiménez Heredia.
- Especialidad: Urología.
- Presentación profesional.
- Servicios urológicos.
- Sucursales La Piedad y Zamora.
- Direcciones editables.
- Botones de Google Maps.
- Teléfonos 351 150 2304 y 352 132 7669.
- Botones de llamada y WhatsApp.
- Horarios editables por sucursal.
- Datos autorizados para transferencia: beneficiario, banco y CLABE.
- Botón para copiar la CLABE.
- Acceso discreto al sistema privado.

Los datos bancarios deben permanecer ocultos hasta que el administrador los capture y autorice su publicación.

No incluir facturación, CFDI ni integración al SAT. No mostrar RFC sin autorización explícita.

### ESPACIO PRIVADO — UROMED CLÍNICO

Toda la información médica y administrativa debe estar protegida mediante inicio de sesión y permisos reales por roles.

Roles: médico administrador y asistente administrativo, con permisos diferenciados.

No permitir que usuarios públicos consulten expedientes, citas internas, resultados clínicos, documentos ni inventario.

## 3. AGENDA — PRIORIDAD ABSOLUTA

Desarrolla una agenda profesional para gestionar citas de La Piedad y Zamora, con:

- Vista diaria, semanal y mensual.
- Calendario visual por horarios.
- Creación, edición y reprogramación de citas.
- Cancelación y confirmación.
- Estados: agendada, confirmada, atendida, cancelada y no asistió.
- Búsqueda por nombre y teléfono.
- Pacientes vinculados al expediente.
- Identificación clara de sucursal.
- Notas administrativas.
- Acceso al expediente desde cada cita.
- Prevención de citas duplicadas.
- Actualización en tiempo real entre usuarios mediante Supabase Realtime.
- Zona horaria `America/Mexico_City`.

### CONEXIÓN REAL CON GOOGLE CALENDAR

Necesito **un solo Google Calendar para las dos sucursales**, actualizado continuamente porque trabajamos con la agenda durante todo el día.

Implementa sincronización bidireccional:

- Google Calendar → UROMED.
- UROMED → Google Calendar.
- Crear citas.
- Reprogramar fecha y hora.
- Editar detalles administrativos.
- Cancelar citas.
- Evitar duplicados y ciclos de sincronización.
- Distinguir correctamente la sucursal.
- Detectar y resolver conflictos.
- Recuperarse de interrupciones.

Utiliza Google Calendar API, OAuth 2.0 del lado servidor, permisos mínimos, tokens protegidos, webhooks, renovación de suscripciones, sincronización incremental y reconciliación periódica.

No envíes diagnósticos ni notas clínicas a Google Calendar.

Si un evento externo no identifica de forma confiable al paciente, deja pendiente su vinculación manual.

Solicita únicamente la autorización necesaria de Google. No simules la sincronización: demuestra su funcionamiento real en ambos sentidos.

## 4. PACIENTES Y EXPEDIENTES CLÍNICOS

Cada paciente debe tener un expediente individual completo con:

- Folio único.
- Fotografía privada opcional.
- Nombre y datos generales.
- Fecha de nacimiento.
- Teléfono y contacto.
- Antecedentes heredofamiliares.
- Antecedentes médicos y quirúrgicos.
- Alergias.
- Medicamentos.
- Motivo de consulta.
- Padecimiento actual.
- Exploración física.
- Diagnósticos.
- Tratamiento.
- Indicaciones.
- Historial de consultas.
- Notas de evolución.
- Seguimientos.
- Archivos clínicos.
- Identificación del profesional responsable.
- Fecha, hora, cierre de notas y auditoría de modificaciones.

No eliminar ni sobrescribir silenciosamente notas médicas cerradas.

## 5. RESULTADOS DE LABORATORIO

Crear dentro de cada expediente una sección para:

- Nombre del estudio.
- Fecha.
- Laboratorio.
- Resultados numéricos y descriptivos.
- Unidades.
- Rangos de referencia.
- Observaciones.
- Adjuntar PDF e imágenes.
- Consultar resultados anteriores.
- Gráficas cronológicas cuando correspondan.

Todos los archivos clínicos deben estar almacenados de forma privada.

## 6. PSA

- PSA total y libre.
- Fecha de estudio.
- Laboratorio.
- Historial de valores.
- Gráficas de evolución.
- Próximas revisiones.
- Alertas configurables desde 4 ng/mL.
- Observaciones del médico.

No generar diagnósticos automáticos.

## 7. VACUNAS — PADRÓN NUEVO

Crear el módulo de vacunación inicialmente vacío, sin importar registros antiguos.

Incluir:

- Paciente.
- Vacuna Gardasil 9.
- Esquema de aplicación.
- Número de dosis.
- Fecha de cada dosis.
- Lote.
- Caducidad.
- Próxima aplicación.
- Responsable.
- Historial y recordatorios.
- Movimiento automático de inventario al confirmar la aplicación.

## 8. ZOLADEX

- Registro de paciente.
- Dosis y presentación.
- Fecha de aplicación.
- Lote y caducidad.
- Próxima aplicación.
- Historial.
- Alertas de seguimiento.
- Inventario vinculado.

## 9. CIRUGÍAS

- Paciente.
- Diagnóstico relacionado.
- Procedimiento.
- Fecha.
- Hospital.
- Sucursal.
- Estado de programación.
- Estudios preoperatorios.
- Pendientes.
- Notas de cirugía.
- Seguimiento postoperatorio.
- Registro administrativo de anticipos o pagos cuando corresponda.

## 10. SEGUIMIENTOS

Crear tareas y revisiones vinculadas al expediente, con fecha, motivo, prioridad, responsable, observaciones, estado y alertas de pendientes.

## 11. INVENTARIO

Registrar insumos, vacunas y medicamentos, incluyendo entradas, salidas, lotes, caducidades, existencias y alertas.

Evitar descuentos duplicados y mantener auditoría de movimientos.

## 12. PANEL PRINCIPAL

Crear un dashboard con:

- Citas de hoy.
- Citas por sucursal.
- Pacientes pendientes.
- Próximos seguimientos.
- PSA por revisar.
- Vacunas programadas.
- Aplicaciones de Zoladex.
- Cirugías próximas.
- Alertas de inventario.

## 13. BASE DE DATOS Y SEGURIDAD

Utiliza un proyecto Supabase nuevo y separado.

Diseña tablas relacionales con claves foráneas, índices, validaciones, fechas auditables y relaciones consistentes entre pacientes, citas y módulos.

Implementa autenticación, políticas RLS restrictivas, almacenamiento privado, control de acceso por roles, auditoría y protección contra acceso no autorizado.

No expongas claves de servicio ni credenciales en el navegador.

Considera la NOM-004-SSA3-2012 y las disposiciones mexicanas aplicables de privacidad y expedientes clínicos. Indica qué aspectos requieren revisión profesional antes de utilizar datos reales.

No utilices expedientes verdaderos durante las pruebas.

## 14. DESARROLLO Y PUBLICACIÓN

Trabaja desde este mismo proyecto de v0 siempre que sea posible.

1. Genera el código real en Next.js y TypeScript.
2. Conecta una base nueva de Supabase.
3. Crea las tablas, políticas de seguridad y almacenamiento.
4. Conecta un repositorio privado nuevo de GitHub.
5. Configura Vercel.
6. Implementa Google Calendar.
7. Ejecuta pruebas automatizadas y manuales.
8. Publica primero una versión Preview protegida para pruebas.

Evita hacerme copiar código manualmente entre plataformas.

Cuando se requiera una autorización externa, detente solamente para solicitar ese permiso específico y continúa después.

## 15. PRUEBAS OBLIGATORIAS

Antes de declarar terminada la aplicación, demuestra:

- Citas creadas en UROMED que aparecen en Google.
- Citas creadas en Google que aparecen en UROMED.
- Reprogramaciones y cancelaciones sincronizadas.
- Citas correctas para ambas sucursales.
- Expedientes guardados y recuperados.
- Laboratorios adjuntos y privados.
- PSA y seguimientos.
- Vacunas, Zoladex e inventario.
- Roles y accesos protegidos.
- Tarjeta pública sin información clínica.
- Funcionamiento en dispositivos móviles.

No declares completada ninguna integración sin pruebas reales.

## 16. ENTREGA FINAL

Entrégame:

- Enlace al nuevo repositorio GitHub.
- Proyecto Supabase vinculado.
- Aplicación desplegada en Vercel.
- URL de pruebas.
- Acceso administrativo seguro.
- Lista de módulos verificados.
- Resultados de pruebas.
- Pendientes reales, si existen.
- Instrucciones de respaldo y recuperación.

No conectes dominio personalizado todavía.

No borres la aplicación UROMED anterior ni sus citas. Cualquier migración futura deberá ser revisada y autorizada por separado.

**OBJETIVO FINAL:** un sistema UROMED profesional, seguro, completo y listo para que el doctor y su asistente lo utilicen diariamente.

Comienza la implementación real. Minimiza las preguntas, pero solicita las autorizaciones imprescindibles. No sustituyas funciones reales por demostraciones visuales.