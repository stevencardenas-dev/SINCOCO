# SINCOCO — Handoff

Última sesión: 2026-09-12. Commiteado localmente (`7cc4c7d` + cambios de
documentación sin commitear). **No pusheado.**

> **El código está desactualizado respecto a la documentación.** La sesión del
> 2026-09-12 trabajó sobre la primera entrega y movió el modelo (nombre del
> sistema, esquema de 27 → 33 tablas, CU-30 nuevo, RF35/RF36 redefinidos). El
> backend y el frontend siguen implementando el modelo anterior: solo `auth` y
> `usuarios`, contra un esquema que ahora tiene 6 tablas más. La documentación
> es la que va adelante; el código todavía no la alcanza.

## Qué es esto

Proyecto académico (Análisis y Diseño de Sistemas, UFPS). Sistema web de
control de proyectos de construcción para la Constructora XYZ. Equipo de 6;
Alvaro es quien desarrolla. Los profesores revisan con detalle: cualquier
inconsistencia entre documentos, o una promesa escrita que no se cumple, se
penaliza.

## Jerarquía de autoridad — importa

1. **`~/1.PRIMERA ENTREGA-20260915T180612Z-1-001.zip`** — la primera entrega
   (23 archivos, recibida 2026-09-15; reemplaza al zip `...20260912T182509Z...`
   de 17 archivos). **Es el material frente al cual los profesores evalúan la
   aplicación**, y por tanto la fuente vigente para **HU, CU, RF y esquema**:
   `ANEXOS/Historias Usuario Refinadas.docx` (30 HU con épica, prioridad,
   estimación, sprint y criterios), `ANEXOS/Protocolo de Especificación de
   Requerimientos.docx` (30 CU con flujos principales y 40 alternativos),
   `ANEXOS/Matriz Articulacion HU-CU.docx` (HU-NN ↔ CU-NN 1:1),
   `ANEXOS/BPMN_s/` (5 procesos AS-IS/TO-BE) y `DumpSINCOCO.sql` (33 tablas).
   Manda sobre el enunciado donde se contradigan.
2. **`~/CONTROL INTEGRAL DE PROYECTOS DE CONSTRUCCIÓN.docx.odt`** — el
   enunciado del profesor. Sigue siendo canónico para **RNF01–RNF15 y
   RN01–RN10**, que la entrega no numera. La numeración RF01–RF32 del enunciado
   se conserva.
3. **`docs/*.md`** — lo más derivado. Si contradice a los anteriores, el
   equivocado es este.

**Los RNF y las RN no están en la hoja de trazabilidad, pero sí en la entrega:**
`ACTA DE REUNION 1.docx` (02/09/26) recoge al tutor priorizando diseño
responsivo, seguridad/RBAC, trazabilidad de operaciones críticas, usabilidad y
disponibilidad, más cuatro reglas de negocio; `EP0- SINCOCO vision.docx` §8–§9
añade eliminación lógica y alertas predictivas. No borrar RNF/RN alegando que
"no están en la entrega": están, en prosa.

## Estado

### Documentación (va adelante)

Sesión 2026-09-12, alineada con la primera entrega:

- **Renombrado SCOPI → SINCOCO** en código, documentación, UI y base de datos.
- **`docs/schema.sql` reemplazado** por `DumpSINCOCO.sql` de la entrega: 33
  tablas (antes 27), 4 triggers. Contenido idéntico al dump salvo el
  encabezado `CREATE DATABASE`/`USE`, que el dump no traía. Tablas nuevas:
  `clientes`, `ordenes_compra`, `detalles_orden_compra`,
  `solicitudes_materiales`, `detalles_solicitud_materiales`,
  `solicitudes_herramientas`.
- **CU-30 / HU-30 "Solicitar herramientas"** añadido a los 6 documentos que lo
  omitían, con diagrama nuevo `casos_de_uso/puml/CU-30.puml`.
- **RF35 y RF36 redefinidos** según la entrega: RF35 = "Soliciar herramientas a
  inventario" (CU-30), RF36 = "Solicitar de materiales a inventario" (CU-08).
  Los conceptos anteriores del repo —trazabilidad de movimientos de material y
  gestión de alertas atendidas— **se quedaron sin número de RF**, aunque
  `alertas.atendida` sigue existiendo en el esquema.
- **CU-09**: se eliminó el actor "Maestro de obra"; la entrega lista solo
  "Encargado de bodega".
- Conteos corregidos a 30 CU / 30 HU; backlog Should-have 45 → 50, total
  112 → 117.

Auditoría al cierre: ningún documento contradice la entrega en identificadores
ni en nombres de CU.

### Código (va atrás)

**HU-01 (RF01) completa.** Login con JWT, rol en el token, menú y rutas por
rol, pantalla de gestión de usuarios (crear con rol, bloquear, activar).

Backend: solo `auth` y `usuarios`. **33 tablas modeladas, 2 recursos
expuestos.** El frontend fuera de login/usuarios muestra datos de
`lib/mockData.js`.

**Deuda que abrió esta sesión:** las 6 tablas nuevas no tienen ni modelo ni
endpoint ni pantalla. CU-30 está documentado y diagramado, pero no existe en el
código. Nadie ha ejecutado el esquema nuevo contra la base real.

Reglas aplicadas en la BD: RN01, RN02, RN05, RN06, RN07, RN11, RN14.
**RN10 y RN12 no están en ninguna capa** — requieren servicios de indicadores
y de proyectos.

## Cómo levantarlo

> Nada de esto se ejecutó en la sesión del 2026-09-12: `schema.sql` es nuevo y
> la base real todavía se llama `scopi`. Ver «Bloqueante para levantar el
> proyecto» antes de seguir estos pasos.

```bash
mysql -u root -p < docs/schema.sql
mysql -u root -p sincoco < docs/seed_usuarios_prueba.sql
cd backend && npm install && node scripts/seed.js && node src/server.js  # 3005
cd frontend && npm install && npx vite                                    # 5173
```

`node scripts/seed.js` es obligatorio: el SQL siembra un hash de marcador y sin
él nadie puede entrar. Usuarios: admin, gerente, maestro, bodega, trabajador —
contraseña `Prueba123!`.

Gates: `python3 tests/test_login_rbac.py` y `python3 tests/test_usuarios_cu01.py`
(con ambos servidores arriba). El build pasa aunque la app esté rota — verificar
en navegador, no solo con `vite build`.

## Punteros

- `docs/REGLAS_DE_NEGOCIO.md` — anexo al final: dónde vive cada RN y qué falta
- `~/SINCOCO_Seccion4.odt` — §4 del informe, generada y sin pegar
- `docs/casos_de_uso/puml/` — 30 diagramas + CU-GENERAL
- `docs/REQUERIMIENTOS.md:1-20` — por qué la numeración es la del enunciado
- `docs/schema.sql:1-12` — cabecera: de dónde viene el dump y qué se le cambió.
  **Ojo:** el comentario que explicaba RN07 (baja lógica, RESTRICT vs CASCADE)
  estaba en el `schema.sql` anterior y se perdió al adoptar el dump; la
  justificación sigue en `docs/REGLAS_DE_NEGOCIO.md`.
- `docs/schema.sql` (final) — los **4** triggers de inventario (RN06) y el
  CHECK `chk_mat_existencia` (RN01, error 3819). El cuarto,
  `trg_salida_descuenta_existencia_y_alerta`, lo trajo el dump.
- `backend/src/db/bitacora.js` — RF31/RNF07
- `frontend/src/components/Sidebar.jsx` — matriz rol → opciones
- `frontend/src/App.jsx` — `RutaPorRol`, guardas de ruta

## Decisiones

### De la sesión 2026-09-15

- **Los sprints de la entrega ganan sobre los del informe (§10).** 18 de las 30
  HU tenían un sprint distinto en `TRAZABILIDAD.md` que en la entrega. Se
  realineó todo a la entrega, porque es el material de evaluación. Consecuencia
  no resuelta: `INFORME_AYD.md` (~L869–876) todavía narra el plan viejo y
  afirma que el Sprint 4 concentra trece HU y el Sprint 1 solo dos; con el plan
  de la entrega son 8 y 5. **Ese párrafo y su cronograma con fechas hay que
  rehacerlos a mano** — tiene fechas de calendario que ningún documento de la
  entrega fija, así que no se tocó.
- **No se borraron los BPMN previos del equipo.** Los oficiales entraron en
  `docs/bpmn/entrega/` con un README que fija la precedencia. Si se confirma
  que los sueltos ya no sirven, se borran; no era decisión de esta sesión.
- **`docs/schema.sql` ya era `DumpSINCOCO.sql`**, verificado línea por línea
  (solo difieren CRLF y el encabezado `CREATE DATABASE`/`USE`, documentado en
  el propio archivo). No se tocó.

### De la sesión 2026-09-12

- **La entrega manda sobre el repositorio en HU/CU/RF/esquema**, pero **no se
  borró nada que la entrega no mencione**. La hoja de trazabilidad solo cubre
  HU↔CU↔RF; los RNF y las RN viven en el acta de reunión y en el documento de
  visión, dentro de la misma entrega. Interpretar "solo lo que dice la entrega"
  como "borrar los RNF" habría eliminado requisitos del enunciado del tutor.
- **Nombres de CU: se usa el verbo** ("CU-01: Registrar usuario y asignar rol"),
  no el sustantivo de módulo ("Gestión de usuarios"). La entrega trae los dos
  —hoja 1 y hoja 2 difieren en 28 de 30— y los 29 diagramas `.puml` ya usaban
  el verbo.
- **`CU-GENERAL.png` se restauró desde git.** El renombrado con `sed` lo
  corrompió por tratarlo como texto. Cuidado al hacer búsquedas y reemplazos
  masivos: excluir binarios.

### Anteriores

- **Motor objetivo MySQL 8**, aunque la máquina corre MariaDB 10.11
  (`/usr/bin/mysql` es el cliente de MariaDB). Verificar en MySQL 8 vía Docker
  (`mysql:8.0`) antes de afirmar compatibilidad. MariaDB rechaza
  `DROP FOREIGN KEY` + `ADD CONSTRAINT` del mismo nombre en un solo `ALTER`.
- **Sin migraciones** mientras no haya despliegue real: la base se recrea desde
  `schema.sql`. Se eliminó la migración 001 por eso.
- **El paso de aprobación de solicitudes se eliminó** (2026-09-08, decisión de
  Alvaro): CU-08 registraba "pendiente de aprobación" y CU-26 consumía una
  "solicitud aprobada", pero ningún CU la aprobaba. Ahora el despacho (CU-26)
  es el punto de decisión.
- **Sin atribución de IA en los commits.** Hook global en `~/.git-hooks/`.

## Pendiente

### Documentación vs. Primera Entrega (sesión 2026-09-15)

Revisión completa hecha. Lo que queda:

- **`INFORME_AYD.docx` y `.pdf` están desactualizados** respecto al `.md`: no
  llevan la corrección del cronograma. Hay que regenerarlos desde el Markdown.
  (Además había un `.~lock.INFORME_AYD.docx#` sin commitear: LibreOffice tenía
  el archivo abierto.)
- **Los BPMN y diagramas previos del equipo siguen en el repositorio**, junto a
  los oficiales en `docs/bpmn/entrega/` y `docs/modelo_datos/entrega/`. Decidir
  si se borran los viejos.
- **El MER de la entrega no dibuja `roles_permisos` como entidad** (32 de 33
  tablas); aparece como relación N:M. `BDD normalizada` sí cubre las 33. No
  parece defecto, pero conviene confirmarlo con el equipo.

Ya verificado y consistente: `TRAZABILIDAD.md`, `HU_CRITERIOS_ACEPTACION.md`,
`CASOS_DE_USO.md`, `PRODUCT_BACKLOG.md` (narrativas), `BACKLOG_PRIORIZADO.md`
(estimaciones y MoSCoW sin conflicto con las prioridades de la entrega),
`REGLAS_DE_NEGOCIO.md` y `REQUERIMIENTOS.md` (las 4 RN y los 5 RNF del acta
están cubiertos), `SEGUIMIENTO_HU.md` (30 HU), `ACTORES_DEL_NEGOCIO.md` (los 4
actores humanos coinciden con §5 de la visión; se añadió el actor **Sistema**,
que la entrega asigna a CU-15, CU-18, CU-23 y CU-24), `schema.sql` (= dump) y
`README.md`.

### Bloqueante para levantar el proyecto

- **La base de datos real todavía se llama `scopi`.** El código ya espera
  `sincoco`. `backend/.env` (ignorado por git, no lo tocó esta sesión) sigue
  con `DB_USER=scopi` / `DB_NAME=scopi`. Migrar:

  ```bash
  sudo mysql -N -e "SELECT CONCAT('RENAME TABLE scopi.',table_name,' TO sincoco.',table_name,';') FROM information_schema.tables WHERE table_schema='scopi';"
  ```

  Ejecutar la salida, crear el usuario `sincoco`, y actualizar `backend/.env`.
- **`docs/schema.sql` nunca se ejecutó.** El dump viene de MySQL 8.0.39 en
  Windows; la máquina corre MariaDB 10.11. Verificar antes de confiar en él:

  ```bash
  sudo mysql < <(sed 's/`sincoco`/`sincoco_test`/g' docs/schema.sql) \
    && sudo mysql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sincoco_test'; DROP DATABASE sincoco_test;"
  ```

  Debe dar 33.

### Documentación

- **§4 del informe está sin pegar.** Generado en
  `~/SINCOCO_Seccion4.odt` (4.1.1 matriz de 36 RF, 4.1.2 las 30
  especificaciones, 4.2.1 inventario de CU, 4.2.2 tabla CU → anexo, 4.2.3 los
  30 con escenarios). Falta copiarlo al informe. **4.1 pide requerimientos no
  funcionales y la sección generada no los trae**: los RNF están en
  `docs/REQUERIMIENTOS.md`, hay que integrarlos a mano.
- **`CU-GENERAL` cubre 11 casos de uso, no 30.** Es una vista resumen y es
  anterior a CU-30, así que no lo incluye.
- **Dos contradicciones dentro de la propia entrega**, sin resolver:
  duración del sprint (`EP0- vision` dice "ciclos de una semana"; el acta de
  inicio y el informe dicen 3 semanas) y Scrum Master (`EP0- vision` nombra a
  "Nelson Beltrán - Docente"; el acta nombra al Ing. Jairo Rodríguez como tutor
  y no lista Scrum Master). El repositorio sigue al acta.
- **`solicitudes_herramientas.estado`**: el criterio 3 de HU-30 dice
  "atendida"; el enum del esquema dice `ENTREGADA`. Los diagramas siguen al
  esquema. Alguien debe unificar la redacción.

### Equipo

- **Avisar a Kevin**: se hizo force-push (`abbd0a4`); su clon necesita
  `git fetch origin && git reset --hard origin/main`. Luego borrar la rama
  `respaldo-antes-force`.
- **El remoto sigue siendo `stevencardenas-dev/SCOPI`.** Renombrar el
  repositorio en GitHub es decisión de Kevin; después cada clon necesita
  `git remote set-url origin <nuevo>`.
- **`DumpSINCOCO.sql` se exportó desde una base llamada `scopi`.** Quien lo
  generó todavía tiene el nombre viejo en local; su próximo export deshace el
  renombrado.
### Desarrollo

- Módulo de inventario en el backend: es el de mejor relación esfuerzo/valor,
  porque RN01 y RN06 ya se cumplen solas en la BD. Cubre HU-07 a HU-09, HU-19,
  HU-20, HU-26, HU-29 — y ahora también HU-30, que necesita
  `solicitudes_herramientas`.
- El documento compartido: Sprint 4 tiene 57 puntos frente a 8 del Sprint 1, y
  coincide en la misma semana con la Fase de Cierre (09–13 nov). Es decisión
  del equipo, no un error.
- Falta el gráfico del árbol del problema en §2.4 (marcador de imagen vacío).
- Las consultas no filtran `activo = 1`; nada pone `activo = 0` todavía, pero
  la primera pantalla que dé de baja algo lo va a exponer.
- `JWT_SECRET=change_me` en `backend/.env`.


## Lecciones de la sesión pasada

- **Leer la fuente completa antes de afirmar que algo falta.** Esta sesión
  afirmó tres veces que la entrega no tenía requerimientos no funcionales,
  habiendo leído solo la hoja de trazabilidad. Estaban en el acta de reunión y
  en el documento de visión. Por poco se borran 16 RNF y 14 RN.
- **Contar no es leer.** Verifiqué que los 29 CU existían y di el documento por
  coherente; al leerlos aparecieron contradicciones reales (CU-08 descontaba
  inventario en la solicitud, CU-15 consolidaba costos de herramientas que no
  tienen costo).
- **Los diagramas `.puml` suelen tener razón** cuando contradicen a la prosa
  del documento. Revisarlos antes de "corregir" el diseño.
- **Verificar `origin/main` antes de reescribir historial.** Afirmé que nada
  estaba pusheado cuando había 3 commits publicados.
- Afirmé dos veces que faltaba el diagrama AS-IS. Existe, y está incrustado en
  §3 del documento compartido; la fuente está en `docs/bpmn/PROCESO_AS_IS.drawio`.
