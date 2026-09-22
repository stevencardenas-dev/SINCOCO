# SINCOCO — Sistema de Información para el Control Integral de Proyectos de Construcción, Inventarios y Personal

Sistema de información web para la **gestión, control y trazabilidad** de los
proyectos de construcción, inventarios, personal y servicios externos de la
**Constructora XYZ** (microempresa de Cúcuta, Norte de Santander).

> Proyecto académico · Análisis y Diseño de Sistemas · Universidad Francisco de
> Paula Santander · equipo de 6 estudiantes.

El alcance, los requerimientos y las reglas de negocio provienen del enunciado
oficial de la asignatura y de la **Primera Entrega** (material frente al cual
se evalúa el proyecto). La numeración es la del enunciado: **RF01–RF32**,
**RN01–RN10** y **RNF01–RNF15**, más los aportes del equipo (RF33–RF36,
RN11–RN14), siempre marcados como tales.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 · Vite 5 · TailwindCSS 3 · React Router 6 · Recharts |
| Backend | Node.js · Express 4 · JWT · bcrypt · mysql2 (ESM, en capas) |
| Base de datos | **MySQL 8.0.46 en Docker** (motor del dump de la entrega) |

> El esquema usa `utf8mb4_0900_ai_ci`, exclusiva de MySQL 8: **cargar
> `docs/schema.sql` requiere MySQL 8, sin modificaciones ni `sed`**. MariaDB
> 10.11 rechaza esa colación (error 1273) y ya no es motor soportado.

## Puesta en marcha

Requiere Node.js 18+, Docker y el cliente `mysql`. Comandos verificados el
2026-09-15 sobre MySQL 8.0.46 en Docker (detalle completo en
`specs/HANDOFF.md`).

```bash
# 1. Base de datos (contenedor `mysql`, publicado en 127.0.0.1:3306)
docker start mysql                                # si no está arriba
mysql -h 127.0.0.1 -uroot -p < docs/schema.sql    # 33 tablas, 4 triggers, 10 CHECK
mysql -h 127.0.0.1 -uroot -p sincoco < docs/seed_usuarios_prueba.sql

# 2. Backend (puerto 3005)
cd backend
npm install
cp .env.example .env        # ajustar credenciales y JWT_SECRET
node scripts/seed.js        # OBLIGATORIO: genera los hashes bcrypt reales
npm run dev                 # http://localhost:3005

# 3. Frontend (en otra terminal, puerto 5173)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`node scripts/seed.js` es obligatorio: el SQL siembra un hash de marcador y sin
este paso ningún usuario puede iniciar sesión.

> Sin migraciones mientras no haya despliegue real: la base se recrea desde
> `schema.sql`. Conectar siempre con `-h 127.0.0.1` (`/usr/bin/mysql` es el
> cliente de la MariaDB local, deshabilitada).

### Usuarios de prueba

Contraseña `Prueba123!` para los cuatro. Cada rol ve un menú distinto.

| Usuario | Rol | Alcance |
|---|---|---|
| `admin` | ADMINISTRADOR | todo el sistema |
| `gerente` | GERENTE | seguimiento, costos, reportes |
| `maestro` | MAESTRO_OBRA | proyectos, materiales, incidencias |
| `bodega` | ENCARGADO_BODEGA | materiales, herramientas, alertas |

El **trabajador operativo no inicia sesión**: es actor del negocio, no del
sistema. Su ficha vive en `trabajadores` porque entregas y devoluciones de
herramientas lo referencian (`entregado_a_trabajador_id`).

## Estado actual

**HU-01 (RF01) está completa**: autenticación con JWT, identificación del rol,
menú y rutas por rol, y pantalla de gestión de usuarios (crear vinculada a un
trabajador con rol asignado, bloquear, activar), cubierta por las pruebas de
navegador de `tests/`.

**HU-02 (RF02) está integrada en su núcleo**: registro de proyectos con
arquitectura en capas (`POST /api/proyectos`) y listado de proyectos en el
frontend consumiendo la API real. El formulario de registro (CU-02) y el
catálogo de clientes quedan para los próximos sprints.

Los demás módulos son marcadores de posición: el menú y las rutas existen, pero
el contenido llega en los próximos sprints. El tablero muestra datos de
demostración (`frontend/src/lib/mockData.js`), no datos reales.

**La documentación va adelante del código** (así debe ser: la entrega manda).
El esquema modela **33 tablas**; el backend expone hoy 3 recursos (`auth`,
`usuarios`, `proyectos`). Las 6 tablas nuevas de la entrega (`clientes`,
`ordenes_compra`, `detalles_orden_compra`, `solicitudes_materiales`,
`detalles_solicitud_materiales`, `solicitudes_herramientas`) no tienen
endpoints ni pantallas todavía. CU-30 / HU-30 están documentados en
`docs/CASOS_DE_USO.md`, pero no existen en el código.

Reglas de negocio aplicadas hoy en la base de datos: RN01, RN02, RN05, RN06,
RN07, RN11 y RN14 (RN06 en los 4 triggers de inventario; RN01 en el CHECK
`chk_mat_existencia`). **RN10 y RN12 no están en ninguna capa aún**: requieren
los servicios de indicadores y de proyectos.

## Estructura

```
SINCOCO/
├── backend/     # Express + JWT (ESM, en capas): auth, usuarios, proyectos
├── frontend/    # React + Vite: interfaz por rol
├── docs/        # casos de uso, HU, esquema, seeds
├── specs/       # handoff y decisiones de sesión
└── tests/       # pruebas de API: login/RBAC, usuarios (CU-01), proyectos (CU-02)
```

> El backend canónico es `backend/`. La primera implementación de HU-02
> (`BACK-END/`, CommonJS, sin autenticación) fue retirada: su funcionalidad
> vive en `backend/` con más reglas de negocio y pruebas.

### Documentación

| Archivo | Contenido |
|---|---|
| `docs/CASOS_DE_USO.md` | los 30 casos de uso (uno por HU: CU-NN ↔ HU-NN) |
| `docs/HU_CRITERIOS_ACEPTACION.md` | las 30 HU con épica, prioridad, estimación y sprint |
| `docs/SEGUIMIENTO_HU.md` | espejo rápido del estado en Jira (Jira es la fuente de verdad) |
| `docs/ACTORES_DEL_NEGOCIO.md` | los actores del sistema y del negocio |
| `docs/DOCUMENTACION_SQL.md` | qué guarda cada tabla del esquema |
| `docs/schema.sql` | dump de la entrega: 33 tablas, 4 triggers, 10 CHECK |
| `docs/seed_usuarios_prueba.sql` | usuarios de prueba por actor |
| `docs/seed_proyectos_prueba.sql` | datos de prueba para HU-02 / CU-02 |

## Pruebas

Con el backend y el frontend corriendo:

```bash
python3 tests/test_login_rbac.py     # login real y menú por rol
python3 tests/test_usuarios_cu01.py  # CU-01: crear, duplicado, bloquear, activar
python3 tests/test_proyectos_hu02.py # CU-02: registro de proyectos (requiere docs/seed_proyectos_prueba.sql)
```

Requieren los usuarios sembrados con hash real (`node scripts/seed.js`). El
build de Vite puede pasar aunque la app esté rota: verificar en navegador, no
solo con `npm run build`.
