# SINCOCO — Sistema de Información para el Control Integral de Proyectos de Construcción, Inventarios y Personal

Sistema de información web para la **gestión, control y trazabilidad** de los
proyectos de construcción, inventarios, personal y servicios externos de la
**Constructora XYZ** (microempresa de Cúcuta, Norte de Santander).

> Proyecto académico · Análisis y Diseño de Sistemas · Universidad Francisco de
> Paula Santander · equipo de 6 estudiantes.

El alcance, los requerimientos y las reglas de negocio provienen del enunciado
oficial de la asignatura. La numeración de este repositorio es la del
enunciado: **RF01–RF32**, **RN01–RN10** y **RNF01–RNF15**, más los aportes del
equipo (RF33–RF36, RN11–RN14), siempre marcados como tales.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 · Vite 5 · TailwindCSS 3 · React Router 6 · Recharts |
| Backend | Node.js · Express 4 · JWT · bcrypt · mysql2 |
| Base de datos | MySQL 8 (objetivo) — verificado también en MariaDB 10.11 |

## Puesta en marcha

Requiere Node.js 18+ y MySQL 8 (o MariaDB 10.11+).

```bash
# 1. Base de datos: esquema y usuarios de prueba
mysql -u root -p < docs/schema.sql
mysql -u root -p sincoco < docs/seed_usuarios_prueba.sql

# 2. Backend
cd backend
cp .env.example .env        # ajustar credenciales y JWT_SECRET
npm install
node scripts/seed.js        # genera los hashes bcrypt reales
npm run dev                 # http://localhost:3005

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`node scripts/seed.js` es obligatorio: el SQL siembra un hash de marcador y sin
este paso ningún usuario puede iniciar sesión.

### Usuarios de prueba

Contraseña `Prueba123!` para los cinco. Cada rol ve un menú distinto.

| Usuario | Rol | Alcance |
|---|---|---|
| `admin` | ADMINISTRADOR | todo el sistema |
| `gerente` | GERENTE | seguimiento, costos, reportes |
| `maestro` | MAESTRO_OBRA | proyectos, materiales, incidencias |
| `bodega` | ENCARGADO_BODEGA | materiales, herramientas, alertas |
| `trabajador` | TRABAJADOR | solo el tablero |

## Estado actual

Sprint 1 en curso. **HU-01 (RF01) está completa**: autenticación con JWT,
identificación del rol y menú por rol, más la pantalla de gestión de usuarios
(crear con rol asignado, bloquear y activar).

Los demás módulos son marcadores de posición: el menú y las rutas existen, pero
el contenido llega en los sprints 2 a 4. El tablero muestra datos de
demostración (`frontend/src/lib/mockData.js`), no datos reales.

Reglas de negocio aplicadas hoy en la base de datos: RN01, RN02, RN05, RN06,
RN07, RN11 y RN14. El detalle de dónde vive cada regla está en
`docs/REGLAS_DE_NEGOCIO.md`.

## Estructura

```
SINCOCO/
├── backend/     # Express + JWT: autenticación, usuarios, bitácora
├── frontend/    # React + Vite: interfaz por rol
├── docs/        # requerimientos, reglas, casos de uso, esquema, diagramas
└── tests/       # pruebas de navegador (Playwright)
```

### Documentación

| Archivo | Contenido |
|---|---|
| `docs/REQUERIMIENTOS.md` | RF01–RF36 y RNF01–RNF16 con su caso de uso y soporte en el modelo |
| `docs/REGLAS_DE_NEGOCIO.md` | RN01–RN14 y dónde se aplica cada una |
| `docs/CASOS_DE_USO.md` | los 29 casos de uso |
| `docs/TRAZABILIDAD.md` | matriz problema → requerimiento → caso de uso → épica → HU → sprint |
| `docs/MATRIZ_CARACTERIZACION.md` | entregable del OE1: 52 variables en 16 dimensiones |
| `docs/schema.sql` | 27 tablas, 3 triggers de inventario, baja lógica |
| `docs/bpmn/` | proceso actual (AS-IS) y propuesto (TO-BE) |
| `docs/casos_de_uso/puml/` | los 29 diagramas UML |

## Pruebas

Con el backend y el frontend corriendo:

```bash
python3 tests/test_login_rbac.py     # login y menú por rol
python3 tests/test_usuarios_cu01.py  # CU-01: crear, duplicado, bloquear, activar
```
