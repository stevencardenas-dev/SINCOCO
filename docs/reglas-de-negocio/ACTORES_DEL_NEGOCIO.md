# ACTORES DEL NEGOCIO

## 1. Administrador
Conserva **todos los permisos del sistema**: además de las funciones propias de la administración técnica (accesos, roles, catálogos y auditoría), puede realizar cualquier operación de los demás roles.

**Funciones principales:**
* **Gestión de Accesos:** Gestionar usuarios, roles y permisos de acceso al sistema.
* **Gestión de Proyectos:** Registrar, editar y consultar los proyectos de vivienda.
* **Planificación:** Definir etapas y actividades del plan de trabajo en los proyectos.
* **Gestión de Personal:** Registrar el personal con su cargo, especialidad y datos de contacto, así como asignar maestros o responsables a los proyectos y actividades.
* **Gestión de Proveedores:** Registrar proveedores de materiales, servicios externos y sus correspondientes contratos o encargados.
* **Auditoría:** Consultar el historial de operaciones críticas (auditoría/trazabilidad).
* **Reportes:** Generar y exportar reportes filtrados.

---

## 2. Gerente / Dueño de la constructora
**Funciones principales:**
* **Monitoreo Ejecutivo:** Consultar el dashboard principal con indicadores visuales del avance, estado y costos consolidados de los proyectos.
* **Alertas y Notificaciones:** Recibir y visualizar alertas automáticas sobre actividades atrasadas y herramientas pendientes de devolución.
* **Toma de Decisiones:** Generar y exportar reportes filtrados (en formatos PDF o Excel) para apoyar la toma de decisiones.
* **Gestión de Proyectos:** Registrar, editar y dar de baja (o reactivar) los proyectos de la constructora, y registrar los clientes a los que pertenecen.
* **Planificación:** Definir las etapas y actividades del plan de trabajo de cualquier proyecto y darlas de baja cuando corresponda.
* **Gestión de Personal:** Registrar, editar y dar de baja al personal, y asignarlo a proyectos y actividades.

*Límites:* el gerente ve todos los proyectos, pero **no administra usuarios, roles, permisos ni catálogos, ni consulta la auditoría**: son funciones del administrador. Así quien decide sobre la operación del negocio no puede concederse accesos ni alterar la trazabilidad.

---

## 3. Maestro de obra / Responsable de proyecto
Su alcance se limita a **los proyectos donde está asignado**.

**Funciones principales:**
* **Gestión del Proyecto:** Editar la información de sus proyectos (no los crea, no los da de baja ni asigna personal a ellos).
* **Planificación:** Definir y dar de baja (o reactivar) las etapas y actividades del plan de trabajo de sus proyectos.
  Solo el **líder del proyecto** (su responsable), el gerente y el administrador modifican el plan: quien está asignado al proyecto o a una actividad lo consulta y ve la ficha de cada etapa y actividad, sin editarlas.
* **Gestión Operativa:** Gestionar las actividades asignadas dentro del plan de trabajo.
* **Seguimiento de Avance:** Registrar (el líder, en cualquier actividad de su proyecto; quien tenga acceso por actividad, solo en la suya; el botón «Registrar avance» está pendiente de HU-21) el porcentaje de avance periódico de las actividades y adjuntar evidencias (fotografías, documentos u observaciones).
* **Control de Materiales:** Solicitar materiales necesarios para el proyecto y registrar su consumo real por actividad.
* **Control de Eventos:** Registrar las incidencias de obra que ocurran (averías, accidentes, retrasos).

---

## 4. Encargado de inventario / bodega
**Funciones principales:**
* **Catálogos:** Administrar y mantener los catálogos de materiales y herramientas.
* **Entradas de Inventario:** Registrar entradas (ingreso) de materiales al inventario indicando proveedor, cantidad y costo.
* **Salidas y Movimientos:** Registrar salidas efectivas, consumos, traslados entre obras/almacenes y devoluciones de materiales sobrantes.
* **Control de Herramientas:** Registrar el préstamo/entrega de herramientas a los trabajadores y controlar su devolución, estado y trazabilidad.
* **Alertas de Stock:** Recibir alertas automáticas cuando un material alcance el nivel mínimo de stock.

---

## 5. Sistema (actor no humano)

El *Protocolo de Especificación de Requerimientos* de la primera entrega
asigna al **Sistema** como actor de cuatro casos de uso, en los que la acción
se dispara sola —por una regla o por un evento— y no por alguien que abre una
pantalla:

* **CU-15 · Consolidar costos del proyecto:** recalcula el costo real a partir
  de los movimientos de materiales y de los servicios externos registrados.
* **CU-18 · Conservar historial (eliminación lógica):** impide el borrado
  físico y conserva la traza de los movimientos.
* **CU-23 · Alertar stock mínimo** (junto al encargado de bodega): genera la
  alerta cuando un material alcanza su nivel mínimo.
* **CU-24 · Alertar actividades atrasadas y herramientas pendientes** (junto al
  gerente): genera las alertas de vencimiento.

No tiene usuario ni inicia sesión: es el disparador automático de esos flujos.
Se documenta como actor porque así lo especifica la entrega y porque determina
que estas funciones no dependen de que alguien las ejecute a mano.

---

## Actores del negocio que NO usan el sistema

### Personal / Trabajador operativo
Participa en el proceso de negocio, pero **no es actor del sistema**: no tiene
usuario ni inicia sesión. Todo lo que le concierne lo registra otro actor.

* **Asignaciones:** el administrador lo asigna a proyectos y actividades; el
  trabajador las recibe de forma presencial, no por la aplicación.
* **Uso de equipos:** recibe herramientas y las devuelve, pero es el encargado
  de bodega quien registra la entrega y la devolución. En la base de datos el
  trabajador es el *destinatario* del movimiento
  (`salidas_herramienta.entregado_a_trabajador_id`,
  `devoluciones_herramienta.devuelto_por_trabajador_id`), nunca su autor.

Por eso su ficha existe en la tabla `trabajadores` —los movimientos de
herramienta la referencian— pero no tiene fila en `usuarios` ni rol asociado,
y no aparece como actor en el diagrama general de casos de uso.
