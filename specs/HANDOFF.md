# SINCOCO — Handoff

Última sesión: 2026-09-08. Todo commiteado y pusheado (`abbd0a4`).

## Qué es esto

Proyecto académico (Análisis y Diseño de Sistemas, UFPS). Sistema web de
control de proyectos de construcción para la Constructora XYZ. Equipo de 6;
Alvaro es quien desarrolla. Los profesores revisan con detalle: cualquier
inconsistencia entre documentos, o una promesa escrita que no se cumple, se
penaliza.

## Jerarquía de autoridad — importa

1. **`~/CONTROL INTEGRAL DE PROYECTOS DE CONSTRUCCIÓN.docx.odt`** — el
   enunciado del profesor. Define **RF01–RF32, RN01–RN10, RNF01–RNF15**. Su
   numeración y redacción son canónicas; no se renumeran.
2. **El documento de análisis en Drive** (`.docx`, ID
   `16NaEyEIh6L-ti7M3Oz86Ui0Y9OOncQh7`) — entregable compartido del equipo, se
   edita en Google Docs. Extiende el enunciado con RF33–RF36 y RN11–RN14,
   siempre marcando el origen.
3. **`docs/*.md`** — lo más derivado. Si contradice a los anteriores, el
   equivocado es este.

## Estado

**HU-01 (RF01) completa.** Login con JWT, rol en el token, menú y rutas por
rol, pantalla de gestión de usuarios (crear con rol, bloquear, activar).

Backend: solo `auth` y `usuarios`. 27 tablas modeladas, 2 recursos expuestos.
El frontend fuera de login/usuarios muestra datos de `lib/mockData.js`.

Reglas aplicadas en la BD: RN01, RN02, RN05, RN06, RN07, RN11, RN14.
**RN10 y RN12 no están en ninguna capa** — requieren servicios de indicadores
y de proyectos.

## Cómo levantarlo

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
- `docs/REQUERIMIENTOS.md:1-20` — por qué la numeración es la del enunciado
- `docs/schema.sql:1-12` — RN07: baja lógica + RESTRICT, y qué CASCADE se
  conservan a propósito (composición)
- `docs/schema.sql` (final) — los 3 triggers de inventario (RN06) y el CHECK
  `chk_mat_existencia` (RN01, error 3819)
- `backend/src/db/bitacora.js` — RF31/RNF07
- `frontend/src/components/Sidebar.jsx` — matriz rol → opciones
- `frontend/src/App.jsx` — `RutaPorRol`, guardas de ruta

## Decisiones

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

- **Avisar a Kevin**: se hizo force-push (`abbd0a4`); su clon necesita
  `git fetch origin && git reset --hard origin/main`. Luego borrar la rama
  `respaldo-antes-force`.
- Módulo de inventario en el backend: es el de mejor relación esfuerzo/valor,
  porque RN01 y RN06 ya se cumplen solas en la BD. Cubre HU-07 a HU-09, HU-19,
  HU-20, HU-26, HU-29.
- El documento compartido: Sprint 4 tiene 57 puntos frente a 8 del Sprint 1, y
  coincide en la misma semana con la Fase de Cierre (09–13 nov). Es decisión
  del equipo, no un error.
- Falta el gráfico del árbol del problema en §2.4 (marcador de imagen vacío).
- Las consultas no filtran `activo = 1`; nada pone `activo = 0` todavía, pero
  la primera pantalla que dé de baja algo lo va a exponer.
- `JWT_SECRET=change_me` en `backend/.env`.

## Lecciones de la sesión pasada

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
