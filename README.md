# SCOPI — Sistema de Control de Obras, Personal e Inventarios

Sistema web para el **control integral de proyectos de construcción** del caso de estudio **Constructora XYZ** (microempresa de Cúcuta): planear, ejecutar y dar trazabilidad a proyectos de vivienda, coordinando personal, materiales, herramientas, proveedores y costos, con alertas e indicadores para la toma de decisiones.

> Proyecto académico · clase «Control integral de proyectos de construcción» · equipo de 5 estudiantes

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + React Router (mismo stack del repo `Sistema-de-gestion-y-seguimiento`) |
| Backend *(pendiente)* | Node.js + Express, JWT (a definir en el sprint 0) |
| Base de datos *(pendiente)* | SQL — modelo diseñado desde cero para cubrir los 18 RF (ver brecha abajo) |

## Estructura del repositorio

Misma organización que el repo `Sistema-de-gestion-y-seguimiento` (front/back separados):

```
SCOPI/
├── frontend/   # React 18 + Vite + Tailwind + React Router (este repo)
└── backend/    # Node.js + Express + JWT (pendiente, sprint 0)
```

## Puesta en marcha (frontend)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Demo: el login acepta cualquier correo (la autenticación real, RF1, llega con el backend).

## Estructura del frontend

```
frontend/src/
├── components/    # Layout, Sidebar, Topbar, StatCard
├── context/       # AuthContext (login mock → JWT cuando exista backend)
├── pages/         # Login, Dashboard, Proyectos, placeholders por módulo
├── services/      # api.js — cliente axios (/api, token Bearer)
└── lib/           # mockData.js — datos demo hasta tener backend
```

Los módulos del menú están mapeados a los requerimientos funcionales (RF). Cada página placeholder indica qué RF cubre y qué reglas de negocio la sostienen.

## Requerimientos funcionales (RF1–RF18)

1. **RF1** Gestión de usuarios — autenticación, roles, permisos, estado de cuentas, recuperación
2. **RF2** Registrar proyectos — info general, ubicación, fechas, responsable, presupuesto, estado
3. **RF3** Etapas y actividades — proyecto → etapas → actividades con responsables y fechas
4. **RF4** Seguimiento de avance — % periódico + evidencias (fotos/documentos)
5. **RF5** Personal — trabajadores y maestros (contacto, especialidad, cargo, disponibilidad)
6. **RF6** Asignación y consulta histórica — trabajador↔actividad, por proyecto y periodo
7. **RF7** Materiales — código, categoría, unidad, existencias, costo de referencia, nivel mínimo
8. **RF8** Entregas y consumos de material — por proyecto/actividad/responsable
9. **RF9** Devoluciones de material — al inventario, con motivo y responsable
10. **RF10** Herramientas (registro) — código, descripción, estado, ubicación
11. **RF11** Herramientas (entrega/devolución) — trabajador, proyecto, fecha, condiciones
12. **RF12** Proveedores y servicios externos — transporte, alquiler, electricidad, plomería
13. **RF13** Incidencias — averías, accidentes, retrasos vinculados al proyecto
14. **RF14** Alertas de inventario — al alcanzar el nivel mínimo
15. **RF15** Consolidación de costos — personal + materiales + servicios por proyecto
16. **RF16** Indicadores y dashboard — calculados desde información transaccional
17. **RF17** Reportes exportables — PDF/Excel, filtros por proyecto/periodo/trabajador
18. **RF18** Trazabilidad — historial reconstruible de las operaciones por proyecto

## Reglas de negocio (RN1–RN10)

| RN | Regla |
|---|---|
| RN1 | No sale material si la cantidad solicitada supera las existencias |
| RN2 | Toda salida de material queda asociada a un proyecto y responsable |
| RN3 | Una herramienta entregada no puede aparecer como disponible |
| RN4 | Toda devolución registra el estado de la herramienta |
| RN5 | Las actividades pertenecen a una etapa y a un proyecto |
| RN6 | Los consumos afectan automáticamente la existencia |
| RN7 | Los movimientos de inventario no se eliminan físicamente; las correcciones mantienen trazabilidad |
| RN8 | Las actividades vencidas se identifican como atrasadas |
| RN9 | El avance del proyecto se deriva de sus actividades |
| RN10 | Los indicadores se calculan desde información transaccional, nunca digitada |

## No funcionales (RNF1–RNF11)

Interfaz intuitiva (RNF1) · responsive (RNF2) · tiempos de respuesta adecuados (RNF3) · contraseñas encriptadas (RNF4) · RBAC (RNF5) · restricciones de BD anti-inconsistencia (RNF6) · auditoría de operaciones críticas (RNF7) · navegadores recientes (RNF8) · arquitectura extensible (RNF9) · respaldo/restauración documentado (RNF10) · documentación técnica + manual de usuario + manual del sistema (RNF11).

## Brecha con la BD existente (`ingelectrica`)

El repositorio `Sistema-de-gestion-y-seguimiento` (repo de Jimmy) sirve de referencia de stack, **no de esquema**: su base de datos no cubre el alcance de la clase. Análisis (`Brecha de Requerimientos`):

- **No existen (7 RF):** RF7 materiales, RF9 devoluciones, RF10–RF11 herramientas, RF12 proveedores/servicios, RF13 incidencias, RF15 costos, RF16 indicadores.
- **Parciales (3):** RF6 (asignación sin fechas/periodo), RNF4 (1 usuario con contraseña en texto plano), RNF6 (sin unicidad ni CHECKs).
- **Rotos (3):** RN7 · RNF7 · RF18 — movimientos sin trazabilidad, sin auditoría.

**Conclusión:** el modelo entidad-relación de SCOPI se diseña desde cero para cubrir los 18 RF, RN y RNF, reutilizando solo la arquitectura front/back del repo de Jimmy.

## Metodología y entregables

Diagnóstico (BPMN, actores, reglas, indicadores) → modelo de análisis (matriz de requerimientos, casos de uso, historias de usuario) → primer informe (arquitectura inicial, MER, modelo lógico, UML, prototipos) → desarrollo por **sprints Scrum** (BD temprana, módulos funcionando en cada entrega) → evaluación de funcionalidades.

## Tareas pendientes del equipo

- [ ] Entrevistar a una constructora real / ingeniero civil (p. ej. Ing. Jairo)
- [ ] Diagnosticar y modelar el proceso actual (BPMN)
- [ ] Catálogo de reglas de negocio e indicadores
- [ ] Listado de requerimientos funcionales/no funcionales
- [ ] Cronograma del mes con responsables
- [ ] Arquitectura inicial + modelo entidad-relación
- [ ] Base de datos temprana (sprint 0)
- [ ] Módulos: proyectos, inventarios, herramientas, personal (sprints 1–2)