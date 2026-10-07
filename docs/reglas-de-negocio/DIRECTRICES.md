# Directrices del equipo

## Dónde se registra el trabajo
- **Jira** es la fuente de verdad del estado de cada Historia de Usuario (HU). Este repo no duplica ese estado.
- Cada HU en Jira debe indicar en su descripción o comentarios: **en qué módulo/carpeta se está resolviendo** (ej. `backend/routes/materiales`, `frontend/src/pages/Inventario`) y el **branch** asociado.
- Ver `docs/reglas-de-negocio/SEGUIMIENTO_HU.md` para el mapeo rápido HU → módulo → estado, sincronizado manualmente contra Jira al cerrar cada sprint.

## Branches y commits
- Un branch por HU: `feature/HU-<numero>-<slug>` (ej. `feature/HU-07-catalogo-materiales`).
- El commit final que cierra una HU referencia su número: `HU-07: catálogo de materiales (CRUD + nivel mínimo)`.
- Los commits se firman solo con el autor humano: **sin pies de `Co-Authored-By:` ni
  líneas de "Generated with"** de asistentes o agentes (GitHub no debe atribuir
  el trabajo a una cuenta de bot en el historial del equipo).

## Casos de uso e historias de usuario
- Los **casos de uso** viven en `docs/reglas-de-negocio/CASOS_DE_USO.md` (uno por HU, mismo ID: HU-07 ↔ CU-07).
- Las **HU** son lo que se sigue en Jira día a día; el caso de uso es el detalle de flujo que respalda esa HU cuando hace falta precisión (flujo alterno, precondición).

## Usuarios de prueba
- La base debe traer un usuario semilla por cada actor del negocio (`docs/reglas-de-negocio/ACTORES_DEL_NEGOCIO.md`) para poder probar RBAC sin crear usuarios manualmente. Ver `docs/seed_usuarios_prueba.sql`.

## Pruebas de permisos (RBAC): sin conteos fijos
- Las pruebas **no cuentan permisos** (`== 33`, `== 22`…). Un total fijo se rompe con cada HU que agrega permisos (la HU-10 sumó cuatro `herramientas.*` y tumbó tres pruebas y el despliegue), y el administrador puede cambiar la matriz desde "Roles y permisos", así que ningún número es estable.
- Las reglas viven en un solo lugar, `tests/permisos_core.py`:
  1. **ADMINISTRADOR** tiene *todos* los permisos de la tabla `permisos`, sean cuantos sean.
  2. Cada otro rol conserva sus **permisos núcleo** (`PERMISOS_CORE`), los mínimos para cumplir su función. Tener de más no rompe la prueba.
  3. Cada otro rol **no** tiene los permisos **vetados** (`VETADOS`): los de seguridad (`usuarios.`, `roles.`, `auditoria.`) y los que son de otro rol por regla de negocio.
- Al agregar permisos en una HU nueva **no hay que tocar las pruebas**: ADMIN los recibe solo. Solo se edita `permisos_core.py` si un rol gana una función que debe conservar siempre (núcleo) o una prohibición nueva (vetado).
- Los permisos que cada rol recibe de inicio los fija `docs/seed_permisos_prueba.sql`; las pruebas defienden el mínimo, no el seed completo.
