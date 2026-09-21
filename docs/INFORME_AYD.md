# PRIMER INFORME DE ANÁLISIS Y DISEÑO DE SISTEMAS

**NOMBRE DEL PROYECTO:** SINCOCO — Sistema de Información para el Control Integral de Proyectos de Construcción, Inventarios y Personal
Sistema de Información para el Control Integral de Proyectos de Construcción,
Inventarios y Personal de la Constructora XYZ

**URL:** `[PENDIENTE]`
**Claves:** `[PENDIENTE]`
**Usuario y claves administrador:** `[PENDIENTE]`
**Usuario y claves otros roles:** `[PENDIENTE]`

**Integrantes:**

| Código | Nombre | Rol |
|---|---|---|
| 1152477 | Kevin Steven Marín Cárdenas | Product Owner |
| 1152381 | Angel Johany Vesga Sarmiento | Equipo de Desarrollo |
| 1152398 | Jimmy Alejandro Bonilla Castro | Equipo de Desarrollo |
| 1152462 | Juan David Llanos Castañeda | Equipo de Desarrollo |
| 1152466 | Gian Karlo Abril Fierro | Equipo de Desarrollo |
| 1152497 | Alvaro Sneider Portillo Mora | Equipo de Desarrollo |

Universidad Francisco de Paula Santander — Facultad de Ingeniería
Programa de Ingeniería de Sistemas — Asignatura: Análisis y Diseño de Sistemas
Cúcuta, Norte de Santander — 2026

---

## RESUMEN DEL PROYECTO

Constructora XYZ es una microempresa de Cúcuta, Norte de Santander, dedicada al
desarrollo y ejecución de proyectos de construcción de vivienda. Para ejecutar sus
obras coordina simultáneamente proyectos, etapas, actividades, personal, maestros de
construcción, materiales, herramientas, proveedores y servicios externos; sin embargo,
esa coordinación se apoya hoy en documentos físicos, hojas de cálculo, llamadas
telefónicas y registros independientes a cargo de distintos responsables. El resultado
es una desarticulación operativa que impide conocer oportunamente el estado real de
cada obra, el consumo efectivo de materiales, la ubicación de las herramientas o los
recursos invertidos frente al avance reportado.

Este proyecto propone SINCOCO, un sistema de información web que centraliza la
información operacional de la constructora y gestiona el ciclo completo de ejecución de
sus proyectos, relacionando proyecto, etapas, actividades, responsables, personal,
materiales, herramientas, servicios externos, costos, avances, incidencias e
indicadores. El sistema no se limita al registro: incorpora planeación, trazabilidad,
seguimiento, alertas, indicadores y generación de información gerencial, de modo que
permita conocer no solo qué recursos existen, sino dónde están, quién los tiene
asignados, en qué proyecto se utilizaron, cuánto se consumió y qué relación guardan con
el avance de la obra.

El alcance se concentra en cinco dimensiones —gestión de proyectos, recursos humanos,
inventarios, terceros y analítica— soportadas por 32 requerimientos funcionales, 15 no
funcionales y 10 reglas de negocio del enunciado oficial, ampliados por el equipo con 4
requerimientos funcionales y 4 reglas de negocio adicionales. El desarrollo sigue un
enfoque híbrido: una fase predictiva de elicitación y planeación, cuatro sprints Scrum
de una semana y una fase predictiva de cierre.

---

## 1. INTRODUCCIÓN

### 1.1 Planteamiento del problema a resolver

**Problema central.** Desarticulación operativa en la gestión, control y trazabilidad
de los recursos (inventarios, personal y terceros) durante la ejecución de los
proyectos de construcción en la Constructora XYZ, derivada de la coordinación mediante
documentos, hojas de cálculo, llamadas telefónicas y registros físicos independientes.

Este problema se recoge en la pregunta orientadora planteada: ¿cómo mejorar la gestión,
control y trazabilidad de los proyectos de construcción, inventarios, personal y
servicios externos de la Constructora XYZ mediante un sistema de información web que
centralice los procesos operativos y genere información para apoyar la toma de
decisiones?

**Causas directas**

- Los procesos relacionados con proyectos, inventarios y personal se realizan
  actualmente mediante documentos físicos, hojas de cálculo y llamadas telefónicas.
- Los registros son independientes y quedan a cargo de diferentes responsables, sin una
  herramienta integrada que los centralice.
- La ausencia de herramientas integradas dificulta conocer oportunamente el estado real
  de cada obra.

**Causas indirectas**

- Los mecanismos manuales presentan limitaciones cuando aumenta el número de proyectos,
  trabajadores, materiales y transacciones.
- La ejecución de proyectos de construcción exige coordinar simultáneamente
  actividades, recursos humanos, materiales, herramientas, proveedores y servicios
  especializados.

**Efectos directos**

- Dispersión de la información relacionada con las obras.
- Dificultad para determinar el consumo real de materiales por proyecto.
- Ausencia de trazabilidad sobre entradas, salidas, devoluciones y traslados de
  materiales.
- Dificultad para determinar quién tiene asignada una herramienta determinada.
- Información histórica limitada sobre responsables y actividades ejecutadas.
- Poca integración entre el avance de obra y la utilización de recursos.
- Dificultad para consultar los servicios externos contratados y sus responsables.

**Efectos indirectos**

- Elaboración manual de informes.
- Disponibilidad limitada de indicadores para apoyar decisiones.
- Riesgo de duplicidad, inconsistencia o pérdida de información.
- Dependencia del conocimiento individual de los responsables de las obras.

#### Árbol del problema

**EFECTOS INDIRECTOS**

- **EI1:** Alta vulnerabilidad ante la inconsistencia, duplicidad o pérdida definitiva
  de datos operativos.
- **EI2:** Dependencia excesiva del conocimiento empírico y memoria individual de los
  responsables de obra.
- **EI3:** Retrasos estructurales en la consolidación de informes, limitando la
  disponibilidad de indicadores unificados para decisiones gerenciales.

↑

**EFECTOS DIRECTOS**

- **ED1:** Pérdida de trazabilidad histórica sobre las entradas, salidas, traslados y
  devoluciones de materiales y herramientas.
- **ED2:** Incertidumbre sobre el consumo real de materiales frente a lo presupuestado
  en cada proyecto.
- **ED3:** Dispersión del historial de actividades y asignaciones del personal y
  contratistas externos.
- **ED4:** Dificultad para auditar de manera cruzada el progreso físico de la obra
  frente a los recursos financieros invertidos.

↑

**PROBLEMA CENTRAL**

Desarticulación operativa en la gestión, control y trazabilidad de los recursos
(inventarios, personal y terceros) durante la ejecución de los proyectos de
construcción en la Constructora XYZ.

↑

**CAUSAS DIRECTAS**

- **CD1:** Fragmentación de los registros operativos al ser diligenciados y almacenados
  de manera independiente por distintos responsables de obra.
- **CD2:** Uso exclusivo de medios manuales y ofimáticos desconectados (documentos
  físicos, planillas de Excel y llamadas) para la administración diaria.
- **CD3:** Ausencia de mecanismos automatizados para vincular el uso real de recursos
  con el avance reportado de las obras.

↑

**CAUSAS INDIRECTAS**

- **CI1:** Insuficiencia de los mecanismos tradicionales de registro para escalar
  operativamente ante el aumento progresivo del volumen de proyectos y transacciones.
- **CI2:** Alta complejidad logística inherente a la construcción, que exige coordinar
  simultáneamente variables dispersas sin contar con herramientas integradas.

**Formato B — Representación gráfica**

`[PENDIENTE: diagrama del árbol del problema]`

**Explicación del árbol.** Las causas indirectas establecen el entorno limitante de la
empresa: una insuficiencia de las metodologías tradicionales para escalar ante el
volumen de transacciones (CI1) y una alta complejidad logística inherente a la
construcción (CI2). Estas dos causas provocan un modelo operativo ineficiente,
expresado en la fragmentación de registros (CD1), el uso de herramientas desconectadas
(CD2) y la imposibilidad de vincular recursos con avances de obra (CD3). No existe una
relación uno a uno: el volumen de operaciones (CI1) afecta tanto la fragmentación de
responsabilidades como las herramientas utilizadas, mientras que la complejidad (CI2)
impacta fuertemente en la falta de vínculo operativo. Todo esto desencadena el problema
central: una desarticulación operativa sistemática. Dicha problemática estalla en
múltiples frentes a corto plazo (efectos directos), como la pérdida de trazabilidad de
materiales (ED1), incertidumbre de consumo (ED2), dispersión del historial de personal
(ED3) y ceguera al momento de auditar el avance financiero frente al físico (ED4). A
largo plazo (efectos indirectos), la falta de trazabilidad y la dispersión (ED1, ED2,
ED3) generan alta vulnerabilidad ante la pérdida de información (EI1) y dependencia del
conocimiento memorístico del maestro de obra (EI2); a su vez, la ceguera operativa y
financiera (ED4, ED2) repercute en retrasos en informes y falta de indicadores para las
decisiones gerenciales (EI3).

### 1.2 Justificación

La Constructora XYZ opera hoy con mecanismos que le permiten atender sus necesidades
básicas, pero que muestran sus límites en cuanto crece el volumen de operación. Los
documentos físicos, las hojas de cálculo independientes y la coordinación telefónica
funcionan mientras el número de proyectos, trabajadores, materiales y transacciones se
mantiene reducido; cuando ese volumen aumenta, el costo de consolidar la información
crece más rápido que la capacidad de la empresa para hacerlo. La justificación de este
proyecto no es, por tanto, la sustitución de una herramienta que falla, sino la
anticipación a un punto de saturación previsible.

**Justificación operativa.** La información que hoy determina decisiones de obra —qué
material queda, quién tiene una herramienta, qué actividad va atrasada— existe, pero
está distribuida entre responsables y soportes distintos. Centralizarla en un sistema
único elimina el trabajo de reconstruirla cada vez que se necesita y reduce el riesgo
de decidir sobre datos desactualizados.

**Justificación económica.** La incertidumbre sobre el consumo real de materiales
frente a lo presupuestado (ED2) y la imposibilidad de auditar el avance físico contra
los recursos invertidos (ED4) impiden detectar desviaciones de costo mientras la obra
aún está en ejecución, que es el único momento en que corregirlas es posible.

**Justificación de continuidad.** La dependencia del conocimiento individual de los
responsables de obra (EI2) convierte a cada persona en un punto único de falla:
la salida o ausencia de un maestro de obra se lleva consigo el historial de su
proyecto. Un sistema con trazabilidad persistente convierte ese conocimiento tácito en
un activo de la empresa.

**Justificación gerencial.** La elaboración manual de informes (EI3) impone un retraso
estructural entre lo que ocurre en la obra y lo que la gerencia puede ver. El cálculo
automático de indicadores a partir de información transaccional —sin digitación
manual, conforme a RN10— cierra esa brecha y convierte el seguimiento en una actividad
continua en lugar de un ejercicio periódico.

**Justificación académica.** El enunciado de la asignatura establece explícitamente que
las reglas de negocio RN01–RN10 se definen para aumentar la complejidad académica del
proyecto. El dominio de la construcción ofrece, además, un escenario donde la
integridad referencial, la trazabilidad y las reglas de negocio no son requisitos
artificiales sino condiciones para que el sistema sea utilizable.

### 1.3 Objetivos

> Los objetivos que siguen se transcriben literalmente del enunciado oficial de la
> asignatura (numerales 5 y 6). Su redacción no se modifica.

#### 1.3.1 Objetivo General

Desarrollar un sistema de información web para gestionar, controlar y realizar la
trazabilidad de los proyectos de construcción, inventarios, personal y servicios
externos de la Constructora XYZ, integrando mecanismos de seguimiento, alertas e
indicadores que apoyen la gestión operativa y la toma de decisiones de la empresa.

#### 1.3.2 Objetivos específicos

**OE1. Caracterizar.** Caracterizar los procesos de gestión de proyectos, inventarios,
personal, proveedores y servicios externos de la Constructora XYZ, identificando
actores, actividades, flujos de información, reglas de negocio, variables, indicadores
y requerimientos necesarios para el desarrollo del sistema.

*Productos:* diagnóstico del proceso actual; identificación de actores; diagramas
AS-IS; diagramas TO-BE; catálogo de reglas de negocio; matriz de caracterización;
catálogo de indicadores; requerimientos funcionales; requerimientos no funcionales.

**OE2. Diseñar.** Diseñar la arquitectura, modelo de datos, componentes funcionales,
interfaces y mecanismos de seguridad y trazabilidad del sistema web, a partir de los
requerimientos identificados.

*Productos:* arquitectura de software; modelo entidad-relación; modelo lógico de datos;
diagramas UML; prototipos de interfaces; modelo de roles y permisos; diseño del
dashboard; modelo de alertas; diseño de trazabilidad.

**OE3. Desarrollar.** Implementar los módulos del sistema web para la administración y
seguimiento de proyectos, actividades, inventarios, herramientas, personal, proveedores
y servicios externos, incorporando indicadores, alertas y trazabilidad de las
operaciones.

*Productos:* aplicación web funcional; base de datos; módulos integrados; dashboard;
reportes; alertas; bitácora de operaciones.

**OE4. Validar.** Evaluar funcional y técnicamente el sistema mediante pruebas de
software y escenarios de uso representativos de los procesos de la Constructora XYZ,
realizando los ajustes necesarios para su puesta en funcionamiento.

*Productos:* plan de pruebas; pruebas unitarias; pruebas de integración; pruebas
funcionales; pruebas de aceptación; informe de resultados; manual técnico; manual de
usuario; versión desplegada del sistema.

### 1.4 Alcance y Delimitación

#### 1.4.1 Alcance del software a desarrollar

El sistema cubrirá la gestión operacional de los proyectos de construcción desde su
registro hasta su seguimiento y cierre, centralizando la información operacional de la
constructora y gestionando el ciclo completo de ejecución de los proyectos según el
flujo:

> Proyecto → etapas → actividades → responsables → personal → materiales →
> herramientas → servicios externos → costos → avances → incidencias → indicadores

El sistema no estará orientado únicamente al registro de información: incorporará
mecanismos de planeación, trazabilidad, seguimiento, alertas, indicadores y generación
de información gerencial, de modo que permita conocer no solo qué recursos existen,
sino dónde están, quién los tiene asignados, en qué proyecto se utilizaron, cuánto se
consumió, cuál fue su costo y qué relación tienen con el avance del proyecto.

El alcance se concentra en cinco dimensiones, respaldadas por los requerimientos
funcionales del enunciado (RF01–RF32) y por los aportados por el equipo (RF33–RF36):

| Dimensión | Contenido | RF |
|---|---|---|
| Gestión de proyectos | Proyectos, etapas, actividades, responsables, estados, fechas, avances, incidencias y evidencias. | RF02, RF03, RF04, RF05, RF22, RF25, RF34 |
| Gestión de recursos humanos | Trabajadores, maestros de obra, perfiles, especialidades, asignaciones y participación en proyectos. | RF01, RF06, RF07, RF08 |
| Gestión de inventarios | Materiales y herramientas: entradas, salidas, devoluciones, traslados, consumos, existencias y responsables. | RF09–RF18, RF23, RF24, RF35 |
| Gestión de terceros | Proveedores, contratistas y servicios externos asociados a proyectos. | RF19, RF20, RF21 |
| Gestión analítica | Indicadores, alertas, reportes y dashboard gerencial. | RF26–RF36 |

#### 1.4.2 Limitaciones del software a desarrollar

El sistema no pretende sustituir software especializado de:

- Contabilidad.
- Nómina.
- Diseño arquitectónico.
- Cálculo estructural.
- BIM (Building Information Modeling).
- Gestión financiera empresarial.

**Restricciones del proyecto**

- **Tiempo:** el enunciado establece una duración prevista de 4 meses.
- **Tipo de proyecto:** se define como desarrollo de software de tipo aplicación web,
  lo que descarta otras alternativas (aplicación de escritorio, app nativa) del alcance
  base.
- **Alcance funcional:** el sistema no debe convertirse en sustituto de software
  especializado, lo que limita su complejidad a los procesos operativos de la
  constructora.
- **Complejidad académica exigida:** el enunciado indica explícitamente que las reglas
  de negocio RN01–RN10 se definen «para aumentar la complejidad académica del
  proyecto», lo cual condiciona el nivel de detalle esperado en el análisis y diseño.
- **Contexto de microempresa:** los requerimientos de usabilidad (RNF01) y rendimiento
  (RNF03) se definen pensando en una operación de microempresa y en usuarios con
  conocimientos informáticos básicos, lo que limita la complejidad de la interfaz.

**Supuestos.** Se registran únicamente inferencias razonables derivadas de la lectura
de los requerimientos, marcadas como tales:

1. La existencia de un rol de administrador que gestiona usuarios, roles y permisos, a
   partir de lo establecido en RF01.
2. Los maestros de construcción y responsables de actividad (mencionados en RF02, RF03
   y en la descripción del proyecto) cumplen funciones equivalentes a las de un
   responsable de obra.
3. Un rol encargado del control de materiales y herramientas (tipo bodega), inferido de
   los requerimientos RF09 a RF18 y de la mención a «bodegas» en RNF11.

#### 1.4.3 Descripción de las necesidades

- **Necesidades operativas:** centralizar en un solo sistema el registro de proyectos,
  personal, materiales, herramientas, proveedores y servicios externos, en lugar de
  mantenerlos en documentos y hojas de cálculo independientes.
- **Necesidades de información:** disponer de información consolidada sobre el estado
  de los proyectos, en lugar de datos dispersos entre responsables.
- **Necesidades de control:** conocer oportunamente los materiales consumidos, las
  herramientas entregadas y los servicios contratados en cada obra.
- **Necesidades de seguimiento:** hacer seguimiento a los responsables de actividades y
  a los recursos utilizados en cada proyecto.
- **Necesidades de trazabilidad:** poder reconstruir el historial de materiales,
  herramientas y asignaciones de personal por proyecto.
- **Necesidades gerenciales:** contar con información gerencial (indicadores y tableros
  de control) que apoye la toma de decisiones, en lugar de depender de informes
  elaborados manualmente.

---

## 2. PROCESOS DEL NEGOCIO

### 2.1 Descripción de los procesos del negocio

Para ejecutar sus obras, la Constructora XYZ coordina simultáneamente distintos
recursos asociados a cada proyecto: personal, maestros de construcción, materiales,
herramientas, proveedores, contratistas, servicios externos y las actividades propias
de ejecución. Actualmente esa coordinación se apoya en procedimientos manuales y
herramientas independientes —documentos físicos, archivos de Excel, llamadas
telefónicas y registros realizados por diferentes responsables—, lo que dificulta
disponer de información consolidada sobre el estado de los proyectos.

Los procesos del negocio identificados y su representación son:

| Proceso | Descripción | Actor principal |
|---|---|---|
| Planeación de obra | Registro del proyecto, división en etapas y actividades, asignación de responsables y fechas programadas. | Administrador |
| Asignación de personal | Vinculación de trabajadores y maestros a proyectos y actividades, con periodo de participación. | Administrador |
| Abastecimiento de materiales | Ingreso de materiales al inventario, solicitud desde obra, despacho, consumo, devolución y traslado entre almacenes. | Encargado de bodega / Maestro de obra |
| Control de herramientas | Registro del catálogo, entrega a trabajador, devolución con estado y consulta de trazabilidad. | Encargado de bodega |
| Contratación de terceros | Registro de proveedores y contratistas, y de los servicios externos asociados a proyectos y actividades. | Administrador |
| Seguimiento de ejecución | Registro periódico de avance, adjunto de evidencias y registro de incidencias de obra. | Maestro de obra |
| Consolidación gerencial | Cálculo de costos e indicadores a partir de los movimientos registrados, con alertas y reportes. | Sistema → Gerente |

**Modelado BPMN.** El proceso actual (AS-IS) y el proceso propuesto (TO-BE) están
modelados en notación BPMN y se presentan como anexo del presente informe.

**Diagramas de actividades.** El flujo de trabajo de cada proceso descrito en esta
sección se representa mediante diagramas de actividades.

`[PENDIENTE: diagramas de actividades por proceso]`

**Anexo — Documento Visión.**

`[PENDIENTE: documento visión]`

---

## 3. MODELO DE CICLO DE VIDA DEL SOFTWARE

### 3.1 Descripción de las etapas o actividades del ciclo de vida

El desarrollo del sistema sigue un **enfoque híbrido**: una fase predictiva inicial de
elicitación y planeación (Fase 0), cuatro sprints ágiles bajo el marco Scrum de una
semana de duración cada uno para la construcción del sistema, y una fase predictiva de
cierre.

La elección responde a dos condiciones del proyecto. Por un lado, los requerimientos
provienen de un enunciado cerrado (RF01–RF32, RN01–RN10, RNF01–RNF15) y no están
sujetos a descubrimiento progresivo, lo que hace viable —y necesaria— una fase
predictiva de planeación inicial que fije alcance y backlog. Por otro, la construcción
sí se beneficia de ciclos cortos con incremento demostrable, porque los módulos son
interdependientes y la integración temprana reduce el riesgo técnico de construirlos
sobre un modelo de datos común sin una arquitectura consolidada.

**Etapas del ciclo de vida y su correspondencia con los objetivos específicos**

| Etapa | Actividades | Objetivo específico |
|---|---|---|
| Fase 0 — Elicitación y planeación (predictiva) | Levantamiento de requisitos, caracterización de procesos, definición de alcance, catálogo de reglas de negocio, backlog inicial priorizado y planificación de sprints. | OE1 |
| Diseño (transversal, inicia en Fase 0) | Arquitectura, modelo de datos, modelo entidad-relación, diagramas UML, modelo de roles y permisos, diseño de alertas y trazabilidad. | OE2 |
| Sprints 1 a 4 (ágil, iterativa) | Sprint Planning, desarrollo del incremento, pruebas, Sprint Review y Retrospectiva. Cada sprint entrega módulos funcionales integrados sobre el modelo de datos común. | OE3 |
| Fase de cierre (predictiva) | Pruebas integrales, ajustes finales, documentación, manuales y despliegue. | OE4 |

**Ceremonias Scrum.** Sprint Planning al inicio de cada sprint, Daily Scrum durante su
ejecución, y Sprint Review y Retrospectiva al cierre.

**Definición de Terminado (Definition of Done).** Una historia se considera terminada
cuando el código está integrado en la rama principal, la funcionalidad es demostrable
en la Sprint Review, cumple sus criterios de aceptación y ha sido validada por el
Product Owner.

---

## 4. MODELO DE REQUERIMIENTOS

### 4.1 Requerimientos Funcionales y No Funcionales

#### 4.1.1 Matriz de Requerimientos

Numeración y descripción tomadas del enunciado oficial de la asignatura. La columna
CU relacionado enlaza cada requerimiento con el caso de uso que lo implementa (§4.2).

**Requerimientos funcionales del enunciado oficial (RF01–RF32)**

| RF | Nombre | Descripción | CU |
|---|---|---|---|
| RF01 | Gestión de usuarios | Crear usuarios, autenticar el acceso, administrar roles, permisos y estados de las cuentas. | CU-01 |
| RF02 | Gestión de proyectos | Registrar proyectos con información general, ubicación, fechas, responsable, presupuesto de referencia, estado y observaciones. | CU-02 |
| RF03 | Estructura del proyecto | Dividir cada proyecto en etapas y actividades, estableciendo responsables, fechas programadas y estado. | CU-03 |
| RF04 | Seguimiento del avance | Registrar periódicamente el porcentaje de avance de actividades y proyectos. | CU-21 |
| RF05 | Evidencias de avance | Adjuntar fotografías, documentos u observaciones como evidencia del avance realizado. | CU-22 |
| RF06 | Gestión de personal | Registrar trabajadores y maestros con datos de contacto, especialidad, cargo, disponibilidad y estado. | CU-04 |
| RF07 | Asignación de personal | Asignar trabajadores y maestros a proyectos o actividades determinadas. | CU-05 |
| RF08 | Historial de asignaciones | Consultar históricamente qué trabajadores participaron en cada proyecto y durante qué periodo. | CU-06 |
| RF09 | Gestión de materiales | Registrar materiales mediante código, descripción, categoría, unidad de medida, existencia, costo de referencia y nivel mínimo. | CU-07 |
| RF10 | Entradas de inventario | Registrar ingreso de materiales indicando cantidad, fecha, proveedor, costo y responsable. | CU-19 |
| RF11 | Salidas de materiales | Registrar materiales entregados a un proyecto, actividad o responsable. | CU-26 |
| RF12 | Consumo de materiales | Registrar el consumo efectivo de materiales por proyecto y actividad. | CU-20 |
| RF13 | Devoluciones | Registrar materiales no utilizados que regresan al inventario. | CU-09 |
| RF14 | Traslados | Trasladar materiales entre almacenes, proyectos u obras cuando corresponda. | CU-29 |
| RF15 | Control de herramientas | Registrar herramientas individualmente y controlar estado, ubicación y disponibilidad. | CU-10 |
| RF16 | Préstamo de herramientas | Registrar entrega de herramientas indicando trabajador, proyecto, fecha y estado de entrega. | CU-11 |
| RF17 | Devolución de herramientas | Registrar fecha y condición en que una herramienta es devuelta. | CU-12 |
| RF18 | Historial de herramientas | Consultar la trazabilidad completa de cada herramienta. | CU-27 |
| RF19 | Gestión de proveedores | Registrar proveedores de materiales y servicios. | CU-13 |
| RF20 | Servicios externos | Registrar servicios contratados: transporte, alquiler de maquinaria, electricidad, plomería u otros. | CU-13 |
| RF21 | Responsable externo | Relacionar cada servicio con empresa/persona responsable, proyecto, actividad, fechas y valor. | CU-28 |
| RF22 | Incidencias | Registrar novedades presentadas durante la ejecución del proyecto. | CU-14 |
| RF23 | Alertas de inventario | Generar alertas cuando un material alcance el nivel mínimo establecido. | CU-23 |
| RF24 | Alertas de herramientas | Generar alertas sobre herramientas pendientes de devolución o que presenten novedades. | CU-24 |
| RF25 | Alertas de actividades | Identificar actividades atrasadas respecto a su fecha programada. | CU-24 |
| RF26 | Control de costos operacionales | Consolidar costos registrados de materiales y servicios externos asociados con cada proyecto. | CU-15 |
| RF27 | Indicadores | Calcular automáticamente indicadores de proyectos, inventarios, herramientas, personal y servicios. | CU-16 |
| RF28 | Dashboard | Presentar gráficamente los principales indicadores de la empresa. | CU-16 |
| RF29 | Reportes | Generar reportes filtrados por proyecto, periodo, trabajador, material, proveedor o servicio. | CU-25 |
| RF30 | Exportación | Exportar determinados reportes a formatos apropiados, como PDF o Excel. | CU-25 |
| RF31 | Trazabilidad | Mantener registro de las principales operaciones realizadas por los usuarios. | CU-17 |
| RF32 | Consulta histórica | Permitir reconstruir el historial operacional de cada proyecto. | CU-18 |

**Requerimientos funcionales aportados por el equipo (RF33–RF36)**

Estos requerimientos no provienen del enunciado oficial. Se documentan por separado,
con su origen explícito, para que quede claro qué es del enunciado y qué añadió el equipo.

| RF | Nombre | Descripción | Origen | CU |
|---|---|---|---|---|
| RF33 | Notificaciones del sistema | El sistema debe notificar eventos relevantes (asignaciones, incidencias, plazos) a los usuarios interesados. | Backlog del equipo | — (sin CU: fuera del alcance de los 4 sprints) |
| RF34 | Conservación de historial (no eliminación física) | El sistema no debe eliminar físicamente los movimientos (asignaciones, solicitudes, entregas); deben conservarse para historial. | Backlog del equipo (eleva RN07 a requerimiento) | CU-18 |
| RF35 | Soliciar herramientas a inventario | El maestro de obra solicita herramientas del catálogo para sus trabajadores, indicando proyecto y fecha requerida, para su aprobación por bodega. | Primera entrega | CU-30 |
| RF36 | Solicitar de materiales a inventario | El maestro de obra registra la solicitud de materiales requeridos para una actividad, con cantidades y observaciones, para su aprobación y despacho por bodega. | Primera entrega | CU-08 |

**Reglas de negocio (RN01–RN14)**

Las 10 del enunciado oficial más 4 aportadas por el equipo.

| RN | Regla | Origen | RF |
|---|---|---|---|
| RN01 | Ningún material podrá salir del inventario si la cantidad solicitada supera las existencias disponibles. | Enunciado | RF11 |
| RN02 | Toda salida de material deberá quedar asociada a un proyecto y responsable. | Enunciado | RF11 |
| RN03 | Una herramienta entregada no podrá aparecer simultáneamente como disponible. | Enunciado | RF16 |
| RN04 | Toda devolución deberá registrar el estado de la herramienta. | Enunciado | RF17 |
| RN05 | Las actividades deberán pertenecer a una etapa y proyecto. | Enunciado | RF03 |
| RN06 | Los consumos deberán afectar automáticamente las existencias. | Enunciado | RF12 |
| RN07 | Los movimientos de inventario no deberán eliminarse físicamente; las correcciones deberán mantener trazabilidad. | Enunciado | RF31, RF32, RF34 |
| RN08 | Las actividades vencidas y no terminadas deberán identificarse como atrasadas. | Enunciado | RF25 |
| RN09 | El avance de un proyecto deberá derivarse de las actividades que lo conforman. | Enunciado | RF04 |
| RN10 | Los indicadores deberán calcularse a partir de información transaccional, sin digitación manual. | Enunciado | RF27 |
| RN11 | Un proyecto debe tener al menos un maestro/responsable asignado antes de iniciar actividades. | Equipo | RF02, RF07 |
| RN12 | No se puede finalizar un proyecto si tiene actividades pendientes o herramientas asignadas sin devolver. | Equipo | RF02, RF17 |
| RN13 | Un material solo puede devolverse si fue previamente solicitado/entregado en ese proyecto. | Equipo | RF13 |
| RN14 | Un proveedor o servicio externo debe estar registrado antes de poder asociarse a un proyecto. | Equipo | RF19, RF20 |

**Requerimientos no funcionales (RNF01–RNF15, enunciado oficial)**

| RNF | Categoría | Descripción |
|---|---|---|
| RNF01 | Usabilidad | La interfaz deberá ser intuitiva, consistente y comprensible para usuarios con conocimientos informáticos básicos. |
| RNF02 | Diseño responsivo | La aplicación deberá adaptarse a computadores, tabletas y teléfonos móviles, ya que parte de la información se registra desde las obras. |
| RNF03 | Rendimiento | Las operaciones comunes deberán proporcionar tiempos de respuesta adecuados bajo la carga prevista para una microempresa. |
| RNF04 | Seguridad | Las contraseñas deberán almacenarse utilizando mecanismos criptográficos seguros. |
| RNF05 | Autorización | El sistema deberá aplicar control de acceso basado en roles y permisos. |
| RNF06 | Integridad | La base de datos deberá implementar restricciones que eviten inconsistencias en proyectos, inventarios y movimientos. |
| RNF07 | Trazabilidad | Las operaciones críticas deberán registrar usuario, fecha, hora, operación y entidad afectada. |
| RNF08 | Disponibilidad | El sistema deberá encontrarse disponible para los usuarios autorizados durante los periodos normales de operación. |
| RNF09 | Compatibilidad | La aplicación deberá funcionar correctamente en las versiones recientes de navegadores web de uso extendido. |
| RNF10 | Mantenibilidad | El código deberá organizarse utilizando una arquitectura modular que facilite mantenimiento y evolución. |
| RNF11 | Escalabilidad | La arquitectura deberá permitir incorporar posteriormente nuevos proyectos, usuarios, bodegas o funcionalidades. |
| RNF12 | Respaldo | Deberá establecerse un procedimiento para realizar copias de seguridad de la información. |
| RNF13 | Recuperación | Deberá documentarse el procedimiento básico de restauración de la base de datos. |
| RNF14 | Calidad | La evaluación de calidad deberá considerar seguridad, confiabilidad, eficiencia, mantenibilidad y usabilidad. |
| RNF15 | Documentación | La solución deberá contar con documentación técnica, modelo de datos, documentación de API cuando aplique y manual de usuario. |

#### 4.1.2 Especificación de los requerimientos

La especificación detallada de cada requerimiento, con su caso de uso asociado y su
soporte en el modelo de datos, se presenta en el anexo de especificación de
requerimientos, junto con el detalle de la capa en que se aplica cada regla de
negocio.

Las reglas RN01, RN02, RN05, RN06, RN07, RN11 y RN14 se aplican en la capa de
persistencia mediante restricciones de integridad, disparadores y claves foráneas, de
modo que su cumplimiento no depende del cliente que origine la operación. Las reglas
restantes se aplican en la capa de lógica de negocio.

#### 4.1.3 Catálogo de alertas

El sistema detecta automáticamente las situaciones que requieren atención definidas en
el enunciado oficial. Cada alerta se asocia al requerimiento que la origina y queda
registrada con su estado de atención (RF36).

| Alerta | Condición que la dispara | RF |
|---|---|---|
| Inventario bajo | La existencia de un material alcanza su nivel mínimo establecido. | RF23 |
| Actividades vencidas | Una actividad supera su fecha programada sin estar terminada. | RF25 |
| Herramientas pendientes | Una herramienta entregada supera el plazo previsto de devolución. | RF24 |
| Proyectos atrasados | El avance consolidado de un proyecto queda por debajo de lo programado. | RF25 |
| Servicios pendientes | Un servicio externo contratado no registra ejecución dentro de sus fechas. | RF21 |
| Desviaciones relevantes | El costo consolidado de un proyecto se aparta del presupuesto de referencia. | RF26 |

#### 4.1.4 Catálogo de indicadores

Los indicadores se calculan a partir de la información transaccional registrada, sin
digitación manual, conforme a la regla de negocio RN10. Se presentan gráficamente en el
dashboard gerencial (RF28).

| Indicador | Dimensión |
|---|---|
| Porcentaje de avance por proyecto | Proyectos |
| Actividades programadas vs. terminadas | Proyectos |
| Porcentaje de actividades atrasadas | Proyectos |
| Consumo de materiales por proyecto | Inventarios |
| Costo de materiales por proyecto | Inventarios |
| Materiales con existencia crítica | Inventarios |
| Herramientas disponibles | Herramientas |
| Herramientas prestadas | Herramientas |
| Herramientas pendientes de devolución | Herramientas |
| Costo de servicios externos | Terceros |
| Número de trabajadores por proyecto | Personal |
| Utilización de personal | Personal |
| Incidencias por proyecto | Seguimiento |

### 4.2 MODELADO DE LOS CASOS DE USO

El sistema se modela mediante **30 casos de uso**, uno por historia de usuario y con el
mismo identificador (CU-nn ↔ HU-nn), agrupados en 12 épicas.

#### 4.2.1 Diagramas de casos de uso de la aplicación

El diagrama general de casos de uso presenta los actores del sistema y el conjunto de
casos de uso con los que interactúa cada uno. Los 29 diagramas individuales, uno por
caso de uso, se presentan en el anexo correspondiente.

#### 4.2.2 Diagrama de casos de uso extendido

Los 29 diagramas incorporan las relaciones `<<include>>` y `<<extend>>` entre el caso
de uso principal y sus casos de uso componentes. A modo de ejemplo, CU-08 (Solicitar
materiales) descompone el flujo en cinco casos de uso y encadena la validación de
existencia y el registro de la solicitud mediante `<<include>>`; CU-02 (Registrar
proyecto) emplea cinco relaciones de este tipo.

#### 4.2.3 Especificación de los Diagramas de caso de uso

**Épica 1: Gestión de usuarios y acceso**

- **CU-01 (HU-01) — Registrar usuario y asignar rol.** *Actor:* Administrador.
  *Precondición:* el rol a asignar ya existe. *Flujo principal:* el administrador
  ingresa los datos del usuario, selecciona un rol, el sistema crea la cuenta activa.
  *Flujos alternos:* documento/correo duplicado → error de validación; el administrador
  bloquea o activa un usuario existente.

**Épica 2: Gestión de proyectos y planificación**

- **CU-02 (HU-02) — Registrar proyecto.** *Actor:* Administrador. *Flujo principal:*
  ingresa ubicación, cliente, fechas y estado inicial; el proyecto queda en estado
  PLANIFICACION.
- **CU-03 (HU-03) — Definir plan de trabajo (etapas y actividades).** *Actor:*
  Administrador. *Precondición:* el proyecto existe. *Flujo principal:* crea etapas
  ordenadas dentro del proyecto y actividades dentro de cada etapa. *Flujo alterno:*
  intento de crear actividad sin etapa válida → rechazado.

**Épica 3: Personal y asignaciones**

- **CU-04 (HU-04) — Registrar personal.** *Actor:* Administrador. *Flujo principal:*
  registra datos de contacto, cargo, especialidad y fecha de contratación.
- **CU-05 (HU-05) — Asignar responsable a proyecto/actividad.** *Actor:* Administrador.
  *Flujo principal:* selecciona trabajador, proyecto o actividad y fecha de inicio; el
  sistema registra la asignación como ACTIVO. *Flujo alterno:* define fecha fin
  programada para cerrar el periodo.
- **CU-06 (HU-06) — Consultar historial de asignaciones.** *Actor:* Administrador.
  *Flujo principal:* busca un trabajador y visualiza el listado de proyectos, fechas de
  inicio y fin.

**Épica 4: Inventario de materiales**

- **CU-07 (HU-07) — Mantener catálogo de materiales.** *Actor:* Encargado de bodega.
  *Flujo principal:* crea/edita/consulta materiales con código, categoría, unidad,
  costo de referencia y nivel mínimo.
- **CU-08 (HU-08) — Solicitar materiales.** *Actor:* Maestro de obra. *Precondición:*
  el proyecto y el material existen. *Flujo principal:* solicita cantidad de un material
  para el proyecto. *Flujo alterno:* existencia insuficiente → la solicitud no descuenta
  inventario.
- **CU-09 (HU-09) — Devolver materiales sobrantes.** *Actor:* Encargado de bodega.
  *Precondición:* existe una solicitud previa del proyecto. *Flujo principal:* registra
  la devolución vinculada a la solicitud; el inventario disponible se actualiza.
- **CU-19 (HU-19) — Ingresar materiales al inventario.** *Actor:* Encargado de bodega.
  *Flujo principal:* registra cantidad, fecha, proveedor, costo y responsable de un
  ingreso de mercancía.
- **CU-20 (HU-20) — Registrar consumo real de materiales.** *Actor:* Maestro de obra.
  *Flujo principal:* registra el consumo de un material en una actividad; las
  existencias se descuentan automáticamente.
- **CU-26 (HU-26) — Registrar salida efectiva de materiales.** *Actor:* Encargado de
  bodega. *Precondición:* existe una solicitud registrada del proyecto. *Flujo
  principal:* despacha materiales vinculados a la solicitud. *Flujo alterno:* cantidad
  despachada mayor a la solicitada o a las existencias → rechazado.
- **CU-29 (HU-29) — Trasladar materiales entre almacenes.** *Actor:* Encargado de
  bodega. *Precondición:* el material existe en el almacén de origen con existencia
  suficiente. *Flujo principal:* selecciona almacén de origen, almacén de destino,
  material y cantidad; el sistema descuenta del origen y suma al destino. *Flujo
  alterno:* cantidad mayor a la existencia en origen → rechazado.

**Épica 5: Inventario de herramientas**

- **CU-10 (HU-10) — Mantener catálogo de herramientas.** *Actor:* Encargado de bodega.
  *Flujo principal:* crea/edita/consulta herramientas con su estado operativo (excelente
  a dañada), su disponibilidad (disponible, prestada, en traslado, baja) y su almacén.
- **CU-11 (HU-11) — Entregar herramienta a trabajador.** *Actor:* Encargado de bodega.
  *Flujo principal:* registra trabajador, herramienta y fecha de entrega; la herramienta
  pasa a disponibilidad PRESTADA.
- **CU-12 (HU-12) — Registrar devolución de herramienta.** *Actor:* Encargado de bodega.
  *Flujo principal:* registra fecha de devolución; la herramienta vuelve a DISPONIBLE.
- **CU-27 (HU-27) — Consultar historial de movimientos de herramienta.** *Actor:*
  Encargado de bodega. *Flujo principal:* consulta el listado cronológico de
  entregas/devoluciones/estados de una herramienta.
- **CU-30 (HU-30) — Solicitar herramientas.** *Actor:* Maestro de obra.
  *Precondición:* existen herramientas con disponibilidad real en el catálogo.
  *Flujo principal:* registra la solicitud indicando el trabajador destinatario, el
  proyecto y la fecha requerida; la solicitud queda pendiente de aprobación por
  bodega. *Flujo alterno:* bodega rechaza con observación obligatoria y el sistema
  notifica al solicitante; si la fecha requerida es futura, la solicitud permanece
  pendiente hasta esa fecha.

**Épica 6: Proveedores y servicios externos**

- **CU-13 (HU-13) — Registrar proveedores y servicios.** *Actor:* Administrador.
  *Flujo principal:* registra datos del proveedor y contacto; asocia servicios a uno o
  más proyectos.
- **CU-28 (HU-28) — Registrar detalle de servicio externo contratado.** *Actor:*
  Administrador. *Flujo principal:* registra encargado, proyecto/actividad, fechas y
  valor del servicio contratado.

**Épica 7: Incidencias de obra**

- **CU-14 (HU-14) — Registrar incidencia de obra.** *Actor:* Maestro de obra. *Flujo
  principal:* registra tipo, fecha y descripción de la incidencia vinculada al proyecto.

**Épica 8: Costos e indicadores**

- **CU-15 (HU-15) — Consolidar costos del proyecto.** *Actor:* Sistema. *Flujo
  principal:* al registrarse movimientos de materiales y servicios externos, el sistema
  recalcula el costo total del proyecto. *Restricción:* no permite edición manual del
  costo consolidado.
- **CU-16 (HU-16) — Visualizar dashboard de seguimiento.** *Actor:* Gerente. *Flujo
  principal:* consulta avance general, costos consolidados y alertas por proyecto.

**Épica 9: Auditoría y trazabilidad**

- **CU-17 (HU-17) — Consultar auditoría de operaciones.** *Actor:* Administrador.
  *Flujo principal:* consulta usuario, acción, fecha y entidad afectada de operaciones
  críticas.
- **CU-18 (HU-18) — Conservar historial (eliminación lógica).** *Actor:* Sistema.
  *Flujo principal:* al eliminar un registro, se marca como inactivo en vez de borrarse
  físicamente.

**Épica 10: Seguimiento de avance y evidencias**

- **CU-21 (HU-21) — Registrar porcentaje de avance.** *Actor:* Maestro de obra. *Flujo
  principal:* registra el nuevo porcentaje de avance de una actividad con fecha; el
  avance del proyecto se recalcula.
- **CU-22 (HU-22) — Adjuntar evidencias de avance.** *Actor:* Maestro de obra.
  *Precondición:* existe un registro de avance. *Flujo principal:* adjunta uno o más
  archivos asociados a la actividad y fecha de avance.

**Épica 11: Alertas del sistema**

- **CU-23 (HU-23) — Alertar stock mínimo.** *Actor:* Sistema → Encargado de bodega.
  *Flujo principal:* al llegar la existencia al nivel mínimo, se genera alerta visible
  en el dashboard.
- **CU-24 (HU-24) — Alertar actividades atrasadas y herramientas pendientes.** *Actor:*
  Sistema → Gerente. *Flujo principal:* detecta actividades vencidas no finalizadas y
  herramientas fuera de plazo; las lista para el gerente.

**Épica 12: Reportes**

- **CU-25 (HU-25) — Generar y exportar reportes.** *Actor:* Gerente. *Flujo principal:*
  aplica filtros (proyecto, periodo, material) y exporta el resultado a PDF o Excel.

#### Anexos del modelo de requerimientos

- **Historias de usuario refinadas y criterios de aceptación:** las 30 historias de
  usuario con sus respectivos criterios de aceptación.
- **Articulación de las Historias de Usuario con los Casos de Uso:** la correspondencia
  es uno a uno por identificador (CU-nn ↔ HU-nn), como se refleja en §4.2.3. La matriz
  completa problema → requerimiento → caso de uso → épica → historia de usuario →
  sprint se presenta como anexo.
- **Product Backlog priorizado:** 120 puntos de historia distribuidos en 57 *Must
  have*, 45 *Should have* y 18 *Could have*, con sus dependencias y estimación.

---

## 6. MODELO DE DATOS

### 6.1 Base de Datos Normalizada

El modelo de datos consta de **27 tablas** organizadas en siete grupos funcionales:

| Grupo | Tablas |
|---|---|
| Seguridad y acceso | `roles`, `permisos`, `roles_permisos`, `usuarios` |
| Personal | `trabajadores`, `asignaciones_personal` |
| Proyectos | `proyectos`, `etapas_proyecto`, `actividades` |
| Seguimiento | `seguimiento_avance`, `evidencias_avance`, `incidencias` |
| Inventario de materiales | `categorias_materiales`, `materiales`, `almacenes`, `entradas_inventario`, `detalles_entrada_inventario`, `salidas_materiales`, `detalles_salida_materiales`, `devoluciones_materiales`, `traslados_materiales` |
| Herramientas y terceros | `herramientas`, `prestamos_herramientas`, `proveedores`, `servicios_externos` |
| Transversales | `alertas`, `bitacora_trazabilidad` |

**Mecanismos transversales implementados**

- **Baja lógica (RN07, RF34):** los registros no se eliminan físicamente; se marcan como
  inactivos. Las claves foráneas emplean `RESTRICT` para impedir el borrado en cascada de
  información operativa, y reservan `CASCADE` para las relaciones de composición, en las
  que la parte carece de sentido sin el todo: los detalles respecto de su documento de
  entrada o salida, las evidencias respecto de su registro de avance y los pares
  rol-permiso.
- **Control de existencias (RN01, RN06):** tres disparadores de inventario mantienen las
  existencias sincronizadas con los movimientos, y la restricción `chk_mat_existencia`
  impide que una existencia quede en negativo.
- **Trazabilidad (RF31, RNF07):** la tabla `bitacora_trazabilidad` registra, para cada
  operación crítica, el usuario que la ejecutó, la acción realizada, la tabla y el
  registro afectados, la marca de tiempo y la dirección de origen.

El diccionario de datos completo, con la definición de cada tabla, sus atributos y sus
restricciones, se presenta como anexo.

**Cumplimiento de las formas normales**

El modelo satisface la **primera forma normal**: todos los atributos son atómicos y no
existen grupos repetitivos. Los conjuntos de elementos que en un registro manual
aparecerían como una lista —los materiales de una entrada de inventario, los de una
salida— están extraídos a tablas de detalle (`detalles_entrada_inventario`,
`detalles_salida_materiales`), de modo que cada fila representa un único material con su
cantidad y su costo.

Satisface la **segunda forma normal**: no existen dependencias parciales de la clave. El
modelo emplea claves primarias sustitutas de un solo atributo en la mayoría de las
tablas, con lo que la dependencia parcial queda descartada por construcción; la única
clave compuesta del modelo, la de `roles_permisos`, corresponde a una tabla sin
atributos no clave. En las tablas de detalle, la cantidad y el costo dependen
conjuntamente del documento y del material, y no de uno solo de ellos, mientras que los
atributos propios del material —descripción, categoría, unidad de medida— residen en
`materiales` y no se repiten en cada movimiento.

Satisface la **tercera forma normal**: no existen dependencias transitivas entre
atributos no clave. La categoría de un material se referencia mediante clave foránea a
`categorias_materiales` en lugar de almacenar su nombre; el rol de un usuario se
referencia a `roles`, y los permisos asociados a ese rol residen en `roles_permisos`.
Análogamente, los datos del proveedor no se replican en cada entrada de inventario, sino
que se referencian desde `proveedores`.

Las relaciones de muchos a muchos están resueltas mediante tablas intermedias:
`roles_permisos` entre roles y permisos, con clave primaria compuesta por ambas
referencias; y `asignaciones_personal` entre trabajadores y proyectos o actividades,
que al tener atributos propios de la relación —fecha de inicio, fecha fin programada,
rol en el proyecto y estado— constituye una entidad asociativa con identificador
propio.

### 6.2 Modelo Entidad-Relación

El modelo entidad-relación representa las 27 entidades descritas en §6.1, sus atributos
y las cardinalidades entre ellas.

`[PENDIENTE: diagrama entidad-relación]`

### 6.3 Diagrama de clases de la aplicación

El diagrama de clases representa las entidades del dominio, sus atributos, sus
operaciones y las relaciones de asociación, agregación y composición entre ellas.

`[PENDIENTE: diagrama de clases]`

### 6.4 Arquitectura de software

La aplicación se estructura en tres capas. La capa de presentación es una aplicación
web de página única construida con React 18 y Vite, que consume la interfaz de
programación del servidor y aplica el control de acceso por rol en la navegación. La
capa de lógica de negocio es un servidor Node.js con Express, organizado en rutas,
controladores y acceso a datos, que autentica mediante JSON Web Tokens y aplica las
reglas de negocio que no residen en la base de datos. La capa de persistencia es una
base de datos MySQL 8, donde las restricciones de integridad, los disparadores de
inventario y la baja lógica garantizan la consistencia con independencia del cliente
que origine la operación.

`[PENDIENTE: diagrama de arquitectura]`

---

## ANEXOS

**Protocolo de evaluación del desempeño**

`[PENDIENTE: protocolo de evaluación del desempeño]`

**Acta de inicio**

`[PENDIENTE: acta de inicio]`

**Actas de reuniones**

`[PENDIENTE: actas de reuniones]`

---

## CRONOGRAMA DE ACTIVIDADES

El cronograma se organiza por objetivo específico. Los entregables de cada fila
corresponden a los **productos** definidos para cada OE en el enunciado oficial.

| Semanas | Objetivo | Actividades principales | Entregables |
|---|---|---|---|
| Fase 0 — inicio del semestre | **OE1 · Caracterizar** | Levantamiento de requisitos con la constructora; caracterización de procesos y actores; modelado del proceso actual y propuesto; definición del catálogo de reglas de negocio e indicadores; especificación de requerimientos funcionales y no funcionales. | Diagnóstico del proceso actual; identificación de actores; diagramas AS-IS; diagramas TO-BE; catálogo de reglas de negocio; matriz de caracterización; catálogo de indicadores; requerimientos funcionales; requerimientos no funcionales. |
| Fase 0 y transversal a los sprints | **OE2 · Diseñar** | Definición de la arquitectura; diseño del modelo de datos y su normalización; elaboración de los diagramas UML; diseño del modelo de roles y permisos, del dashboard, de las alertas y de los mecanismos de trazabilidad; prototipado de interfaces. | Arquitectura de software; modelo entidad-relación; modelo lógico de datos; diagramas UML; prototipos de interfaces; modelo de roles y permisos; diseño del dashboard; modelo de alertas; diseño de trazabilidad. |
| Semanas 4–6: Sprint 1 · 7–9: Sprint 2 · 10–12: Sprint 3 · 13–15: Sprint 4 | **OE3 · Desarrollar** | Sprint 1: usuarios y roles, registro de proyectos, plan de trabajo, personal y conservación de historial (HU-01 a HU-04, HU-18). Sprint 2: asignación de responsables, catálogos de materiales y herramientas, proveedores y servicios externos, incidencias, avance y auditoría (HU-05, 07, 10, 13, 14, 17, 21, 28, 30). Sprint 3: solicitudes y devoluciones, entregas de herramientas, ingreso a inventario, evidencias, traslados y alertas de gestión (HU-06, 08, 11, 12, 19, 22, 24, 29). Sprint 4: consumo real, salidas efectivas, historial de herramientas, costos, indicadores, reportes y alertas de stock (HU-09, 15, 16, 20, 23, 25, 26, 27). Cada sprint incluye Planning, desarrollo, pruebas, Review y Retrospectiva. | Aplicación web funcional; base de datos; módulos integrados; dashboard; reportes; alertas; bitácora de operaciones. |
| Semanas 16–18: Fase de cierre | **OE4 · Validar** | Ejecución del plan de pruebas en sus distintos niveles; escenarios de uso representativos de los procesos de la constructora; ajustes derivados de los hallazgos; elaboración de manuales y despliegue de la versión final. | Plan de pruebas; pruebas unitarias; pruebas de integración; pruebas funcionales; pruebas de aceptación; informe de resultados; manual técnico; manual de usuario; versión desplegada del sistema. |

**Nota sobre el cronograma.** La distribución de las 30 historias de usuario entre
los cuatro sprints es la del anexo *Historias de Usuario Refinadas* de la primera
entrega: 5 HU y 19 puntos en el Sprint 1, 9 HU y 33 puntos en el Sprint 2, 8 HU y
31 puntos en el Sprint 3, y 8 HU y 42 puntos en el Sprint 4, para un total de 125
puntos de historia.

El reparto por número de historias es razonablemente parejo a partir del Sprint 2,
pero la carga por puntos no lo es: el Sprint 4 concentra 42 de los 125 puntos —un
34 % del esfuerzo estimado— porque agrupa las historias de mayor tamaño del
proyecto (consolidación de costos, dashboard de indicadores y reportes, de 8 puntos
cada una). Esa concentración en el tramo final, sumada a la proximidad con la fase
de cierre (semanas 16–18), constituye un riesgo de planificación que el equipo
monitorea mediante las retrospectivas de cada sprint.

---

## REFERENCIAS

- Universidad Francisco de Paula Santander. *Control integral de proyectos de
  construcción* [enunciado del proyecto de aula]. Asignatura Análisis y Diseño de
  Sistemas, Programa de Ingeniería de Sistemas. Cúcuta, 2026.
- Schwaber, K. y Sutherland, J. *La Guía de Scrum: la guía definitiva de Scrum, las
  reglas del juego.* Scrum.org, 2020.
- Object Management Group. *Business Process Model and Notation (BPMN), versión 2.0.2.*
  OMG, 2013.
- Object Management Group. *Unified Modeling Language (UML), versión 2.5.1.* OMG, 2017.
- Sommerville, I. *Ingeniería de software.* 10.ª ed. Pearson, 2016.
- Pressman, R. S. y Maxim, B. R. *Ingeniería del software: un enfoque práctico.* 8.ª ed.
  McGraw-Hill, 2015.
- Date, C. J. *Introducción a los sistemas de bases de datos.* 7.ª ed. Pearson, 2001.

---
