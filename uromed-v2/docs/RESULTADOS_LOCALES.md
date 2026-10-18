# Resultados locales — 13 octubre 2026

Entorno: Node 24.19.0; Next 16.4.0; TypeScript 5.9.3; Vitest 4.0.18; PGlite 0.3.14. Sin cuentas externas ni pacientes reales.

| Comprobación | Resultado | Qué demuestra |
|---|---|---|
| TypeScript | Pasa | Coherencia de tipos del proyecto |
| `next build` | Pasa | Compilación de producción y rutas |
| 12 pruebas SQL/PGlite | Pasan | Esquema real ejecutable en PostgreSQL, RLS, rol, bancos ocultos, notas cerradas, solapamiento, aplicaciones/stock, storage simulado y auditoría |
| 10 pruebas de lógica | Pasan | Horario México, validación de citas/PSA, exportación sin datos clínicos, IDs/ETag y cifrado autenticado |
| 8 pruebas del trabajador | Pasan | Exportar/importar/cancelar, evitar reexportación, conflicto, token 410, error 429 y lease, con HTTP/Data API simulados |
| Chromium escritorio 1400 px | Pasa | Tarjeta institucional visible y nombre correcto |
| Chromium móvil 390 px | Pasa | Tarjeta sin desbordamiento horizontal |
| Consola navegador | 0 errores | Rutas públicas revisadas sin fallos JS |
| `/sistema` sin configuración | Redirige `/login` | Acceso privado no exhibe pantallas/datos |
| Cron sin bearer | HTTP 401 | Endpoint de proceso no accesible sin secreto |
| Auditoría npm runtime | 0 vulnerabilidades reportadas | Resultado del servicio npm audit al consultar; no es un pentest |

Se corrigió un fallo de referencia de columna en la política de subida de Storage detectado por prueba SQL. Se volvió a ejecutar la suite: pasó.

No se verificó todavía: despliegue remoto, OAuth real, eventos reales en ambas direcciones, Supabase Auth/REST/Storage/Realtime alojados, pantallas privadas con sesión real, iPhone/Android físicos, cron/webhook accesible con protección Vercel, recuperación de backups y revisión clínica/legal. La lista externa permanece pendiente en `ACEPTACION.md`.

No se crearon repositorios, proyectos o usuarios en ninguna cuenta; no se tocó el sistema anterior.
