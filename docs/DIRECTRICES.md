# Directrices del equipo

## Dónde se registra el trabajo
- **Jira** es la fuente de verdad del estado de cada Historia de Usuario (HU). Este repo no duplica ese estado.
- Cada HU en Jira debe indicar en su descripción o comentarios: **en qué módulo/carpeta se está resolviendo** (ej. `backend/routes/materiales`, `frontend/src/pages/Inventario`) y el **branch** asociado.
- Ver `docs/SEGUIMIENTO_HU.md` para el mapeo rápido HU → módulo → estado, sincronizado manualmente contra Jira al cerrar cada sprint.

## Branches y commits
- Un branch por HU: `feature/HU-<numero>-<slug>` (ej. `feature/HU-07-catalogo-materiales`).
- El commit final que cierra una HU referencia su número: `HU-07: catálogo de materiales (CRUD + nivel mínimo)`.

## Casos de uso e historias de usuario
- Los **casos de uso** viven en `docs/CASOS_DE_USO.md` (uno por HU, mismo ID: HU-07 ↔ CU-07).
- Las **HU** son lo que se sigue en Jira día a día; el caso de uso es el detalle de flujo que respalda esa HU cuando hace falta precisión (flujo alterno, precondición).

## Usuarios de prueba
- La base debe traer un usuario semilla por cada actor del negocio (`docs/ACTORES DEL NEGOCIO.md`) para poder probar RBAC sin crear usuarios manualmente. Ver `docs/seed_usuarios_prueba.sql`.
