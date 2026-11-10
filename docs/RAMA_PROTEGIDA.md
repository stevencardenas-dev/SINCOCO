# Regla de rama protegida para `main`

Estado verificado el 2026-11-09: `main` NO tiene protección (la API de GitHub responde
`Branch not protected`). Hasta que se active, el workflow de PR informa pero no bloquea.

Configuración propuesta (Settings → Branches → Add rule, patrón `main`):

- Require a pull request before merging.
- Require status checks to pass before merging, con el check obligatorio:
  `Pruebas backend (npm test)` (workflow `.github/workflows/pruebas-pr.yml`).
- Require branches to be up to date before merging.

Despliegue: `.github/workflows/desplegar.yml` es manual (workflow_dispatch). Su job
`pruebas` corre todas las suites unitarias (`node --test "test/*.test.js"`) y las de API
en Python; `migrar`, `backend` y `frontend` dependen de él (`needs: pruebas`). La única
excepción es el input `saltar_pruebas = si` (emergencias).

## Tipos de prueba

- Unitarias (backend/test/*.test.js, node:test con dobles en memoria): reglas de cada HU
  en services/DTO; incluye pruebas de concurrencia con un pool simulado
  (hu05_concurrencia_asignaciones) y de inventario de rutas (rnf05_rutas_protegidas).
- Integración / API (tests/*.py contra backend real + MySQL 8 en el pipeline de despliegue):
  test_hu01_permisos, test_roles_permisos, test_hu17_auditoria, test_dashboard,
  test_hu03_plan, test_hu04_personal, test_catalogos, test_hu18_baja_logica,
  test_sesion_unica, test_rbac_acceso_proyectos, test_bordes_api.
- Contrato: no hay pruebas de contrato formales (OpenAPI/Pact).
- E2E: no hay un flujo E2E completo de materiales (pendiente, ver reporte).
