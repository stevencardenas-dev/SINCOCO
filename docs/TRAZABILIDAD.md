---
title: "SINCOCO — Ítem 11: Matriz de Trazabilidad"
lang: es
---

# 11. Trazabilidad Problema → Proceso → Requerimiento → Caso de Uso → Épica → HU → Sprint

Cada fila de esta matriz recorre la cadena completa: parte de una causa o
efecto identificado en el árbol del problema (ítem 2), pasa por el proceso de
negocio afectado, el requerimiento funcional que lo atiende, el caso de uso y
la historia de usuario que lo materializan, y termina en el sprint donde se
construye.

La columna *Proceso* corresponde a las cinco dimensiones de alcance definidas
en el enunciado del proyecto: Gestión de proyectos, Gestión de recursos
humanos, Gestión de inventarios, Gestión de terceros y Gestión analítica.

**Cobertura: 30 historias de usuario · 30 casos de uso · RF01–RF36 · 12 causas del árbol del problema · 4 sprints.**

## 11.1 Matriz

| Problema / Causa | Proceso (dimensión de alcance) | Requerimiento (RF) | Caso de Uso | Épica | Historia de Usuario | Sprint |
|---|---|---|---|---|---|---|
| CD1: registros fragmentados a cargo de distintos responsables | Gestión de recursos humanos | RF01 | CU-01 | 1. Gestión de usuarios y acceso | HU-01 | Sprint 1 |
| ED3: dispersión del historial de personal y terceros | Gestión de proyectos | RF02 | CU-02 | 2. Gestión de proyectos y planificación | HU-02 | Sprint 1 |
| CI2: alta complejidad logística sin herramientas integradas | Gestión de proyectos | RF03 | CU-03 | 2. Gestión de proyectos y planificación | HU-03 | Sprint 1 |
| ED3: dispersión del historial de personal y terceros | Gestión de recursos humanos | RF06 | CU-04 | 3. Personal y asignaciones | HU-04 | Sprint 1 |
| CI2: alta complejidad logística sin herramientas integradas | Gestión de recursos humanos | RF07 | CU-05 | 3. Personal y asignaciones | HU-05 | Sprint 2 |
| EI2: dependencia de la memoria individual en obra | Gestión de recursos humanos | RF08 | CU-06 | 3. Personal y asignaciones | HU-06 | Sprint 3 |
| CD3: sin mecanismos para vincular uso de recursos con avance | Gestión de proyectos | RF04 | CU-21 | 10. Seguimiento de avance y evidencias | HU-21 | Sprint 2 |
| ED4: dificultad para auditar avance vs. recursos invertidos | Gestión de proyectos | RF05 | CU-22 | 10. Seguimiento de avance y evidencias | HU-22 | Sprint 3 |
| ED2: incertidumbre sobre el consumo real de materiales | Gestión de inventarios | RF09 | CU-07 | 4. Inventario de materiales | HU-07 | Sprint 2 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF10 | CU-19 | 4. Inventario de materiales | HU-19 | Sprint 3 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF11 | CU-26 | 4. Inventario de materiales | HU-26 | Sprint 4 |
| ED2: incertidumbre sobre el consumo real de materiales | Gestión de inventarios | RF12 | CU-20 | 4. Inventario de materiales | HU-20 | Sprint 4 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF13 | CU-09 | 4. Inventario de materiales | HU-09 | Sprint 4 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF14 | CU-29 | 4. Inventario de materiales | HU-29 | Sprint 3 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF35 | CU-30 | 5. Inventario de herramientas | HU-30 | Sprint 2 |
| ED2: incertidumbre sobre el consumo real de materiales | Gestión de inventarios | RF11 | CU-08 | 4. Inventario de materiales | HU-08 | Sprint 3 |
| CI1: mecanismos tradicionales no escalan ante el volumen | Gestión analítica | RF23 | CU-23 | 11. Alertas del sistema | HU-23 | Sprint 4 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF15 | CU-10 | 5. Inventario de herramientas | HU-10 | Sprint 2 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF16 | CU-11 | 5. Inventario de herramientas | HU-11 | Sprint 3 |
| ED1: pérdida de trazabilidad en movimientos de inventario | Gestión de inventarios | RF17 | CU-12 | 5. Inventario de herramientas | HU-12 | Sprint 3 |
| EI2: dependencia de la memoria individual en obra | Gestión de inventarios | RF18 | CU-27 | 5. Inventario de herramientas | HU-27 | Sprint 4 |
| ED3: dispersión del historial de personal y terceros | Gestión de terceros | RF19 + RF20 | CU-13 | 6. Proveedores y servicios externos | HU-13 | Sprint 2 |
| ED3: dispersión del historial de personal y terceros | Gestión de terceros | RF21 | CU-28 | 6. Proveedores y servicios externos | HU-28 | Sprint 2 |
| EI1: vulnerabilidad ante pérdida o duplicidad de datos | Gestión de proyectos | RF22 | CU-14 | 7. Incidencias de obra | HU-14 | Sprint 2 |
| CI1: mecanismos tradicionales no escalan ante el volumen | Gestión analítica | RF24 + RF25 | CU-24 | 11. Alertas del sistema | HU-24 | Sprint 3 |
| ED4: dificultad para auditar avance vs. recursos invertidos | Gestión analítica | RF26 | CU-15 | 8. Costos e indicadores | HU-15 | Sprint 4 |
| EI3: retrasos en consolidación de informes y falta de indicadores / CD2: medios manuales y ofimáticos desconectados | Gestión analítica | RF27 + RF28 | CU-16 | 8. Costos e indicadores | HU-16 | Sprint 4 |
| EI3: retrasos en consolidación de informes y falta de indicadores / CD2: medios manuales y ofimáticos desconectados | Gestión analítica | RF29 + RF30 | CU-25 | 12. Reportes | HU-25 | Sprint 4 |
| EI1: vulnerabilidad ante pérdida o duplicidad de datos | Gestión analítica | RF31 | CU-17 | 9. Auditoría y trazabilidad | HU-17 | Sprint 2 |
| EI1: vulnerabilidad ante pérdida o duplicidad de datos | Gestión analítica | RF32 + RF34 | CU-18 | 9. Auditoría y trazabilidad | HU-18 | Sprint 1 |

## 11.2 Distribución por sprint

| Sprint | Historias de usuario | Objetivo del sprint |
|---|---|---|
| Sprint 1 | HU-01, HU-02, HU-03, HU-04, HU-18 | Base del sistema: usuarios/roles, proyectos, plan de trabajo, personal e historial |
| Sprint 2 | HU-05, HU-07, HU-10, HU-13, HU-14, HU-17, HU-21, HU-28, HU-30 | Inventarios base, herramientas, terceros, incidencias, avance y auditoría |
| Sprint 3 | HU-06, HU-08, HU-11, HU-12, HU-19, HU-22, HU-24, HU-29 | Operación de materiales y herramientas, evidencias y alertas de gestión |
| Sprint 4 | HU-09, HU-15, HU-16, HU-20, HU-23, HU-25, HU-26, HU-27 | Consumo real, salidas, costos, indicadores, reportes y alertas de stock |

## 11.3 Verificación de cobertura

La matriz permite verificar, en ambos sentidos, que no hay elementos sueltos:

| Criterio | Resultado |
|---|---|
| Causas y efectos del árbol del problema con al menos una HU que los atiende | 12 de 12 (CD1–CD3, CI1–CI2, ED1–ED4, EI1–EI3) |
| Requerimientos del enunciado (RF01–RF32) trazados a un caso de uso | 32 de 32 |
| Requerimientos adicionales (RF33–RF36) trazados a un caso de uso | 3 de 4 (RF33 sin CU) |
| Dimensiones de alcance cubiertas | 5 de 5 |
| Historias de usuario con requerimiento, caso de uso, épica y sprint asignados | 30 de 30 |
| Historias de usuario huérfanas (sin requerimiento o sin sprint) | 0 |

### Requerimientos adicionales al enunciado

| RF | Trazado mediante | Origen |
|---|---|---|
| RF33 — Notificaciones del sistema | Sin caso de uso asignado | Backlog del equipo |
| RF34 — Conservación de historial | HU-18 / CU-18 | Backlog del equipo |
| RF35 — Solicitar herramientas a inventario | HU-30 / CU-30 | Primera entrega |
| RF36 — Solicitar materiales a inventario | HU-08 / CU-08 | Primera entrega |

### Lectura de la matriz

El sentido de la cadena es acumulativo: cada requerimiento existe porque hay
una causa concreta en el proceso actual que lo justifica, y cada historia de
usuario tiene una fecha de construcción asignada. Esto permite responder dos
preguntas en cualquier momento del proyecto: *¿por qué estamos construyendo
esto?* (recorriendo la fila hacia la izquierda) y *¿cuándo se resuelve este
problema del negocio?* (recorriéndola hacia la derecha).