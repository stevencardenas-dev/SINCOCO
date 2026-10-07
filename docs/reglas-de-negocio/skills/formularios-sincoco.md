# Skill: formularios y listados de SINCOCO

Patrones obligatorios al crear o corregir cualquier pantalla de captura o
listado. Ya están aplicados en `/proyectos`, `/personal`, `/usuarios` y
`/roles`, que sirven de referencia viva.

## 1. Los errores de negocio se muestran DENTRO del formulario

Nunca deje el mensaje de una regla de negocio en la raíz de la página (detrás o
encima de la tabla): el usuario no lo relaciona con el campo. Use
`AlertaFormulario` dentro del `<form>`, con un estado propio (`errorForm`) y no
el error de carga del listado.

```jsx
try {
  await api.post('/recurso', cuerpo)
  cerrarFormulario(); cargar()
} catch (err) {
  setErrorForm(mensajeError(err, 'No se pudo guardar.'))  // mensaje, no código
  setCampoForm(campoError(err))                            // campo a resaltar
}
```

- `mensajeError(error, respaldo)` de `frontend/src/lib/errores.js` devuelve
  `response.data.error` (el texto que redacta el backend). Nunca muestre
  `err.message` crudo, códigos HTTP ni objetos técnicos.
- `campoError(error)` devuelve `response.data.campo` para pintar en rojo el campo
  señalado (`input border-red-400`).
- En el backend toda regla de negocio se lanza con `AppError(mensaje, 400,
  'campo')`; el `errorHandler` la traduce al JSON `{ error, campo }`. Envuelva
  siempre el handler en `try { … } catch (error) { return next(error) }`.
- `AlertaFormulario` conserva `role="alert"` (error) y `role="status"`
  (confirmación): son los que anuncian los lectores de pantalla y los que esperan
  las pruebas de interfaz.

## 2. Listas largas: campo de búsqueda, no `<select>` a ciegas

Para responsables, trabajadores, clientes, países y cualquier lista que crece,
use `BuscadorSelect` (`frontend/src/components/BuscadorSelect.jsx`). Filtra por
label y sublabel ignorando mayúsculas y tildes, soporta flechas/Enter/Escape y el
`id` que recibe es el mismo del input (lo usan las pruebas).

```jsx
<BuscadorSelect
  id="p-responsable"
  value={form.responsable_id}
  onChange={(v) => setForm({ ...form, responsable_id: v })}
  opciones={responsables.map((t) => ({ value: t.id, label: `${t.nombres} ${t.apellidos}`, sublabel: t.cargo }))}
  placeholder="Escriba el nombre del responsable…"
  requerido
/>
```

## 3. Campos con formato propio

- **Documento / identificadores numéricos:** `inputMode="numeric"` y limpieza con
  `soloDigitos` (`frontend/src/lib/format.js`) en cada `onChange`.
- **Moneda:** `type="text"` + `inputMode="numeric"`, prefijo `$`, valor con
  `fmtMiles` y resumen con `fmtCOP` + `montoEnPalabras`. Nunca `type="number"`.
- **Correo:** `type="email"` con `autoComplete="email"`; «Correo personal» cuando
  no es el corporativo.
- **Teléfono:** `TelefonoPais` (`frontend/src/components/TelefonoPais.jsx`):
  selector de país con búsqueda y número local solo dígitos; se guarda
  `+57 3001234567`.
- **Dirección:** `SelectorUbicacion`: mapa OpenStreetMap + búsqueda de
  direcciones (Nominatim) + «mi ubicación». Es una ayuda, nunca un requisito: la
  dirección también se puede escribir a mano.

## 4. Los filtros de un listado corren en la base

Si el volumen puede crecer, el filtro NO se hace en el navegador. El backend
acepta `buscar`, `estado` y los ids de catálogo, y arma el `WHERE` con
parámetros. El listado los expone en un recuadro «Buscar …» con el conteo de
resultados y botón «Limpiar filtros». Ver `trabajadorRepository.listar` y
`proyectoRepository.listar`.

## 5. Las reglas de estado se derivan, no se piden dos veces

Evite casillas que puedan contradecir un enum (p. ej. «disponible» junto a
`estado`). El sistema calcula lo derivado: `disponible` sale del estado y de las
actividades vigentes (`calcularDisponible`). Cambiar de estado se hace con un
`select` y su `PATCH /recurso/:id/estado`; el «dar de baja» lógico queda para los
listados de archivado, no para el día a día.

## 6. Checklist al replicarlo en otra pantalla

1. ¿El error sale dentro del formulario y con el texto de la API? (sección 1)
2. ¿Alguna lista larga sigue siendo `<select>`? Cámbiela a `BuscadorSelect`.
3. ¿Hay campos de documento, moneda, correo, teléfono o dirección sin su formato?
   Aplique la sección 3.
4. ¿El filtro del listado es en memoria? Muévalo a la API con parámetros.
5. ¿Hay dos controles que puedan contradecirse (estado vs. disponible)? Elimine el
   derivado y calcúlelo en el backend.
6. ¿El endpoint nuevo está protegido con `requirePermiso` y deja su entrada en la
   bitácora (`registrar(...)`)?
