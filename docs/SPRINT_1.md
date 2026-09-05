# SPRINT 1: HISTORIAS DE USUARIO Y SUS ÉPICAS

---

## ÉPICA 1: Gestión de usuarios y acceso

### HU-01: Control de usuarios y roles
* **Historia de Usuario:** Como administrador, quiero registrar usuarios y asignarles un rol, para controlar el acceso al sistema.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * Se crea el usuario con su respectivo rol asignado.
  * Cada rol visualiza únicamente las funcionalidades acordes a sus permisos.
  * Se permite activar o bloquear un usuario en cualquier momento.

---

## ÉPICA 2: Gestión de proyectos y planificación

### HU-02: Registro de proyectos
* **Historia de Usuario:** Como administrador, quiero registrar un proyecto de vivienda, para iniciar su seguimiento en el sistema.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * Se registran la ubicación, cliente, fechas y estado del proyecto.
  * El proyecto queda disponible para la fase de planificación.

### HU-03: Definición del plan de trabajo
* **Historia de Usuario:** Como administrador, quiero definir etapas y actividades del plan de trabajo, para organizar la ejecución del proyecto.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * Cada actividad debe pertenecer a una etapa definida.
  * Cada etapa debe pertenecer a un proyecto existente.

---

## ÉPICA 4: Inventario de materiales

### HU-07: Catálogo de materiales
* **Historia de Usuario:** Como encargado de bodega, quiero registrar materiales en un catálogo, para llevar control de código, categoría, unidad y costo de referencia.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * El catálogo permite crear, editar y consultar materiales.
  * Se define un nivel mínimo de stock para cada material.

---

## ÉPICA 5: Inventario de herramientas

### HU-10: Catálogo de herramientas
* **Historia de Usuario:** Como encargado de bodega, quiero registrar herramientas en un catálogo, para conocer su estado y ubicación.
* **Prioridad:** Media
* **Criterios de Aceptación:**
  * El catálogo permite crear, editar y consultar herramientas con su estado (disponible, en uso, dañada).

---

## ÉPICA 8: Costos e indicadores

### HU-15: Consolidación automática de costos
* **Historia de Usuario:** Como sistema, quiero consolidar los costos de un proyecto a partir de materiales, herramientas y servicios, para reflejar su costo real.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * El costo total del proyecto se calcula de forma automática a partir de los registros de materiales, herramientas y servicios.
  * No se permite el ingreso o modificación manual del costo consolidado.

### HU-16: Dashboard de seguimiento
* **Historia de Usuario:** Como gerente, quiero visualizar un dashboard con indicadores de mis proyectos, para hacer seguimiento sin depender de Excel.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * El dashboard muestra el avance general, los costos consolidados y las alertas principales por proyecto.

---

## ÉPICA 10: Seguimiento de avance y evidencias

### HU-21: Registro del porcentaje de avance
* **Historia de Usuario:** Como maestro de obra, quiero registrar el porcentaje de avance de una actividad, para reflejar el progreso real del proyecto.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * Se registra el porcentaje de avance indicando la fecha correspondiente.
  * El porcentaje de avance general del proyecto se recalcula automáticamente a partir de sus actividades.

### HU-22: Carga de evidencias de avance
* **Historia de Usuario:** Como maestro de obra, quiero adjuntar evidencias (fotos, documentos u observaciones) al avance registrado, para sustentar el progreso reportado.
* **Prioridad:** Media
* **Criterios de Aceptación:**
  * Se permite adjuntar uno o varios archivos (fotografías, documentos u observaciones).
  * Las evidencias quedan asociadas a la actividad y a la fecha en que se registró el avance.

---

## ÉPICA 11: Alertas del sistema

### HU-23: Alerta de stock mínimo
* **Historia de Usuario:** Como encargado de bodega, quiero recibir una alerta cuando un material llegue a su nivel mínimo, para gestionar oportunamente su reabastecimiento.
* **Prioridad:** Alta
* **Criterios de Aceptación:**
  * Se genera una alerta automática cuando las existencias del material alcanzan o están por debajo del nivel mínimo establecido.
  * La alerta es visible en el panel principal/dashboard del sistema.