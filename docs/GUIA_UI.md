# Guía de UI/UX de SINCOCO

Reglas de interfaz acordadas durante el rediseño del frontend. Aplican a toda pantalla nueva
o que se modifique. Cuando una regla viva en un componente común, se cambia **ahí** y no
pantalla por pantalla.

> Esta carpeta (`docs/`) no se publica: el despliegue solo sube el build del frontend y el
> código del backend.

## 1. Principios generales

- **Compacto.** Menos scroll y menos espacio muerto: relleno pequeño, textos de 12–13 px en
  datos secundarios, más elementos por fila en pantallas anchas.
- **Jerarquía.** Lo más importante va más grande y primero (nombre, estado, avance); el resto
  (código, presupuesto, ubicación) pesa menos.
- **Feedback con color.** El estado se ve sin leer: color por estado, campos con valor
  resaltados, etiquetas de filtros aplicados, rojo para lo atrasado.
- **Iconos en lugar de rótulos** cuando el significado es evidente (persona, calendario,
  bandera, pin, billetes, teléfono, correo). Siempre con `aria-label` y tooltip.
- **Consistencia.** Un mismo patrón en todas las pantallas; si algo cambia, se hace en el
  componente compartido.
- **Teclado primero.** Todo lo interactivo se alcanza y se usa con teclado, con foco visible
  (`focus-visible:ring-accent-400`).
- **Sin etiquetas redundantes.** No repetir información que ya muestra otro elemento
  (por ejemplo, el botón «Limpiar» propio de cada pantalla).

## 2. Menú lateral (`Sidebar.jsx`, `Layout.jsx`)

- `Tab` sale del menú hacia el contenido; dentro del menú se navega con `↑` `↓` `Inicio` `Fin`
  (solo la opción activa entra en el orden de `Tab`).
- Se retrae con `Ctrl/Cmd + B` y con el botón de la parte baja; la elección se recuerda.
- Retraído muestra solo los iconos (nombre como tooltip) y, del logo, solo el casco amarillo.

## 3. Atajos de teclado

| Atajo | Acción |
|---|---|
| `Esc` | Cierra ventanas y paneles. Se indica con la etiqueta «Esc» junto a la ✕. |
| `Ctrl/Cmd + Enter` | En el panel de filtros: aplicar y cerrar («Listo»). |
| `Ctrl/Cmd + Mayús + L` | En el panel de filtros: borrar todos los filtros. |
| `Ctrl/Cmd + B` | Retraer o expandir el menú lateral. |

Los atajos se muestran siempre en el botón correspondiente con una etiqueta `<kbd>` y
`aria-keyshortcuts`. No se usan atajos que choquen con edición de texto (por ejemplo
`Ctrl + Retroceso`).

## 4. Listados

- **Tarjetas por defecto**, con conmutador **Tarjetas / Tabla** en el encabezado de la página
  (dos iconos, junto a «Nuevo …»). La elección se guarda en `localStorage`.
- **Toda la tarjeta es clicable** (con `Enter`/`Espacio`). Sin botones dentro: la acción
  principal es abrir el detalle (en Proyectos, el plan).
- **Editar vive en el detalle**, no en la tarjeta. **«Dar de baja» va dentro del formulario de
  Editar**, con confirmación.
- **Enlaces a otras fichas** (responsable, cliente): subrayados y en pestaña nueva
  (`target="_blank" rel="noopener noreferrer"`), solo si el usuario tiene permiso para verlas.
- **Tarjetas pequeñas, muchas por fila** (hasta 4–8 en pantallas anchas según el contenido).
- **Alineación.** Título con alto fijo de dos líneas (`line-clamp-2`) y el bloque de datos
  pegado al fondo (`mt-auto`), para que las tarjetas de una fila queden niveladas.
- **Color por estado** en la tarjeta: degradado suave arriba, filo superior, iconos en
  círculos del mismo color y barra de avance del mismo tono.
- **Barra de avance:** el porcentaje va **a la derecha** de la barra, sin texto «Avance», con
  ancho fijo (cabe «XX.XX%») y punto decimal. El **anillo de avance** se reserva para
  **etapas y actividades**, no para tarjetas de proyecto.
- **Fechas separadas:** inicio y fin son dos datos distintos (calendario y bandera). El fin en
  rojo con «atrasado» si ya pasó y el registro sigue abierto.
- **Dados de baja** salen atenuados y con la etiqueta «Dado de baja».
- **Paginación en todo listado** (`usePaginacion` + `Paginacion`): 12 tarjetas por página en
  Proyectos y 24 en Personal; en tablas, 10. Nunca cargar la lista completa de golpe en pantalla.
- **Orden también en tarjetas:** selector «Ordenar por» (`SelectorOrden`) en el encabezado, junto
  al conmutador de vista. La tabla ordena por columna; las tarjetas, por este selector.
- **El estado del listado vive en la URL** (`useListadoUrl`): filtros, `baja`, `vista`, `orden` y
  `pag`. Se conserva al recargar, se puede compartir el enlace y el «Volver» de un detalle
  regresa al listado tal como estaba (`urlListado`).

## 5. Fichas y ventanas de detalle

- Cabecera: avatar (iniciales con color estable) o foto, **nombre grande**, cargo/subtítulo y
  etiquetas de estado en una sola fila. Sin espacio vacío arriba.
- Datos de contacto en lista con icono y texto grande; teléfono y correo como enlaces
  `tel:` y `mailto:`. Lo ausente se muestra en gris («Sin correo»).
- Acciones al pie, con la principal en amarillo.
- Todas las ventanas (`Modal`) muestran «Esc» junto a la ✕.

## 6. Filtros (`FiltrosDesplegable.jsx`)

- **Una sola fila:** buscador (con ✕ para borrar el texto), botón **Filtros** (icono de
  embudo, amarillo con contador cuando hay filtros) y, si hay algo aplicado, un botón ✕ para
  borrar todo.
- **Debajo de la barra:** el contador de resultados («21 trabajadores con los filtros») y las
  **etiquetas de lo aplicado**, cada una con nombre y valor («Estado: Activo») y su ✕.
- **Panel lateral fijo** a toda la altura (nunca se recorta), con telón, encabezado
  «Filtros · Esc», cuerpo con scroll y pie.
- **Dentro del panel:** campos agrupados en secciones con título; las opciones cortas
  (estado, disponibilidad) como **botones de un clic** y no como desplegables; campos con valor
  resaltados en amarillo suave.
- **Pie:** interruptor **«Dados de baja»** a la izquierda y **«Listo»** a la derecha.
  **«Borrar filtros»** va arriba, junto a «Esc», y solo aparece cuando hay filtros aplicados.
- Controles reutilizables en `FiltrosControles.jsx`: `SeccionFiltros`, `Segmentado`,
  `Interruptor`. Las etiquetas se leen de los `<label>` de los campos, así que cada campo debe
  tener el suyo.
- Las pantallas **no** definen su propio botón «Limpiar filtros».

## 7. Flujo de trabajo para cambios de UI

1. Para decidir un diseño, se arma una **vista previa en HTML autónomo** en
   `.claude/previews/` (Tailwind compilado con la configuración del proyecto, sin
   dependencias de internet). No se levanta el entorno local completo (backend y base de datos).
2. Con el diseño aprobado se implementa en `frontend/src` y se verifica con
   `npx vite build`.
3. Se hace commit a `main` y el despliegue del frontend se lanza a mano desde GitHub Actions
   («Desplegar SINCOCO en AWS», componente `frontend`).
