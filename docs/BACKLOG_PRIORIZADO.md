# Product Backlog priorizado (Sprint 0)

`PRODUCT_BACKLOG.md` contiene la descripción completa de cada HU (épicas y
criterios de aceptación). Este documento es la vista de planificación que exige
el ítem 9 del Sprint 0: priorización, dependencias y estimación inicial —
insumo directo para el ítem 10 (Plan de desarrollo / Sprints).

Escala de estimación: **puntos de historia** (Fibonacci: 1, 2, 3, 5, 8, 13),
relativa entre HU de este mismo backlog, no en horas.

---

## Prioridad MoSCoW

### Must have — base sin la cual no hay proyecto funcional

| HU | Descripción | Depende de | Estimación |
|----|---|---|---|
| HU-01 | Control de usuarios y roles | — | 5 |
| HU-02 | Registro de proyectos | HU-01 | 3 |
| HU-03 | Plan de trabajo (etapas/actividades) | HU-02 | 5 |
| HU-04 | Registro de personal | HU-01 | 3 |
| HU-05 | Asignación de responsables | HU-03, HU-04 | 3 |
| HU-07 | Catálogo de materiales | HU-01 | 3 |
| HU-08 | Solicitud de materiales | HU-03, HU-07 | 5 |
| HU-19 | Ingreso de materiales al inventario | HU-07 | 5 |
| HU-26 | Salida efectiva de materiales | HU-08 | 5 |
| HU-10 | Catálogo de herramientas | HU-01 | 3 |
| HU-11 | Entrega de herramientas | HU-10, HU-04 | 3 |
| HU-12 | Devolución de herramientas | HU-11 | 3 |
| HU-15 | Consolidación automática de costos | HU-19, HU-26 | 8 |
| HU-18 | Conservación de historial (eliminación lógica) | — | 3 |

**Subtotal Must have: 49 puntos**

### Should have — valor alto, el sistema opera sin ellas pero de forma más manual

| HU | Descripción | Depende de | Estimación |
|----|---|---|---|
| HU-06 | Historial de asignaciones | HU-05 | 2 |
| HU-09 | Devolución de materiales sobrantes | HU-08 | 3 |
| HU-20 | Consumo real de materiales | HU-08, HU-26 | 5 |
| HU-13 | Registro de proveedores y servicios | HU-01 | 3 |
| HU-28 | Detalle de servicios externos contratados | HU-13 | 3 |
| HU-14 | Registro de incidencias de obra | HU-03 | 3 |
| HU-16 | Dashboard de indicadores de proyectos | HU-15, HU-21 | 8 |
| HU-21 | Registro del porcentaje de avance | HU-03 | 5 |
| HU-23 | Alerta de stock mínimo | HU-07, HU-19 | 3 |
| HU-24 | Alerta de atrasos y herramientas pendientes | HU-03, HU-11 | 5 |
| HU-29 | Traslado de materiales entre almacenes | HU-07, HU-19 | 5 |

**Subtotal Should have: 45 puntos**

### Could have — mejora la experiencia, aplazable sin bloquear el negocio

| HU | Descripción | Depende de | Estimación |
|----|---|---|---|
| HU-17 | Registro de auditoría de operaciones | HU-01 | 5 |
| HU-22 | Carga de evidencias de avance | HU-21 | 3 |
| HU-27 | Historial de movimientos de herramientas | HU-11, HU-12 | 2 |
| HU-25 | Generación y exportación de reportes | HU-15, HU-16 | 8 |

**Subtotal Could have: 18 puntos**

### Won't have (este proyecto académico)

Ninguna HU fue descartada; el alcance definido en `PRODUCT_BACKLOG.md` se
considera completo para el ciclo de vida del curso. Se documenta esta categoría
vacía para dejar explícito que la ausencia no es un olvido.

---

## Resumen y lectura para planificación

- **Total backlog: 112 puntos** (49 Must + 45 Should + 18 Could).
- Las dependencias muestran que **HU-01 (usuarios/roles) es prerequisito transitivo
  de casi todo el backlog** — debe resolverse en el primer sprint de desarrollo.
- **HU-15 (consolidación de costos)** es el nodo de mayor fan-in (HU-19, HU-26,
  HU-28 lo alimentan) y bloquea a su vez HU-16 y HU-25: conviene planificarlo
  temprano una vez exista inventario básico.
- El **Could have** completo (18 pts) es razonable como contenido de un sprint
  final de pulido si el tiempo apremia.

## Anexo: HU-29 creada durante esta revisión

`REQUERIMIENTOS.md` señaló que RF14 (traslado de materiales entre almacenes)
no tenía HU/CU asociado, aunque el esquema de base de datos ya lo soportaba
(`traslados_materiales`). Se redactó HU-29 en `PRODUCT_BACKLOG.md`, CU-29 en
`CASOS_DE_USO.md` y su diagrama en `casos_de_uso/puml/CU-29.puml`; se incluye
en este backlog como **Should have** (fila de la tabla correspondiente).
