# ACTORES DEL NEGOCIO

## 1. Administrador
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

---

## 3. Maestro de obra / Responsable de proyecto
**Funciones principales:**
* **Gestión Operativa:** Gestionar las actividades asignadas dentro del plan de trabajo.
* **Seguimiento de Avance:** Registrar el porcentaje de avance periódico de las actividades y adjuntar evidencias (fotografías, documentos u observaciones).
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
