-- Después de crear los usuarios en Supabase Authentication > Users.
-- SUSTITUIR los UUID. No guardar contraseñas aquí.
-- Ejecutar únicamente en el proyecto NUEVO.
insert into public.profiles(id,name,role) values
 ('UUID-DEL-DOCTOR','Dr. Israel Jiménez Heredia','medico'),
 ('UUID-DE-LA-ASISTENTE','Raquel','asistente');
-- Revocar acceso sin depender de la expiración del JWT:
-- update public.profiles set active=false where id='UUID';
