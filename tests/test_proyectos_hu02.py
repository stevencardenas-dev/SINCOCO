# Prueba de API de HU-02 (RF02 · CU-02): registrar proyecto con la API real.
#
# Requiere el backend corriendo (puerto 3005), el esquema cargado y los
# usuarios de prueba con hash real (backend/scripts/seed.js):
#   cd backend && node src/server.js
#
# Es idempotente: limpia sus datos al comenzar usando las credenciales de
# backend/.env (mismo acceso a la base que el backend). Uso:
#   python3 tests/test_proyectos_hu02.py
import json
import os
import subprocess
import urllib.error
import urllib.request

BASE = 'http://localhost:3005'

# Acceso a la base para sembrar/limpiar casos de prueba, con las mismas
# credenciales que usa el backend (backend/.env). El cliente mysql usa
# socket con 'localhost'; se fuerza TCP como hace mysql2 en el backend.
DB_ENV = {}
with open(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')) as f:
    for linea in f:
        linea = linea.strip()
        if linea and not linea.startswith('#') and '=' in linea:
            k, v = linea.split('=', 1)
            DB_ENV[k] = v

def mysql_args(extra):
    host = DB_ENV.get('DB_HOST', '127.0.0.1')
    if host in ('', 'localhost'):
        host = '127.0.0.1'
    return ['mysql', '-h', host, '-u' + DB_ENV.get('DB_USER', 'root'),
            '-p' + DB_ENV.get('DB_PASSWORD', ''), '-D', DB_ENV.get('DB_NAME', 'sincoco')] + extra

def http(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')

# limpieza para poder relanzar la prueba sin tocar la base a mano
limpieza = subprocess.run(mysql_args(['-e',
    "DELETE FROM bitacora_trazabilidad WHERE tabla_afectada='proyectos'; "
    "DELETE FROM proyectos;"]), capture_output=True, text=True)
assert limpieza.returncode == 0, 'limpieza de proyectos fallo: ' + limpieza.stderr
print('db limpio')

estado, login = http('POST', '/api/auth/login', {'username': 'admin', 'password': 'Prueba123!'})
assert estado == 200, f'login admin fallo: {estado} {login}'
token = login['token']
print('login admin ->', estado)

# ids de referencia
estado, trabajadores = http('GET', '/api/usuarios/trabajadores-disponibles', token=token)
assert estado == 200, 'no se pudieron listar trabajadores'
# Los trabajadores con cuenta no aparecen aqui; para el responsable basta
# cualquier trabajador activo sin cuenta (es actor del negocio, no del sistema).
assert trabajadores, 'no hay trabajadores sin cuenta; revise seed_usuarios_prueba.sql'
preferido = next((t for t in trabajadores if 'maestro' in t['cargo'].lower()), trabajadores[0])
responsable_id = preferido['id']
print('responsable (trabajador sin cuenta) ->', responsable_id, preferido['cargo'])

# cliente de prueba (docs/seed_proyectos_prueba.sql); se garantiza aqui por comodidad
seed = subprocess.run(mysql_args(['-e',
    "INSERT INTO clientes (numero_documento, tipo_documento, razon_social_nombre) "
    "VALUES ('900123456-1','NIT','Constructora XYZ S.A.S.') "
    "ON DUPLICATE KEY UPDATE razon_social_nombre=VALUES(razon_social_nombre)"]),
    capture_output=True, text=True)
assert seed.returncode == 0, 'seed de cliente fallo: ' + seed.stderr
q = subprocess.run(mysql_args(['-N', '-e',
    "SELECT id FROM clientes WHERE numero_documento='900123456-1'"]),
    capture_output=True, text=True)
cliente_id = int(q.stdout.strip())
print('cliente de prueba ->', cliente_id)

PROYECTO = {
    'codigo': 'PRJ-HU02-001',
    'cliente_id': cliente_id,
    'nombre': 'Conjunto Residencial Los Alamos',
    'descripcion': 'Etapa 1: 12 casas de 2 pisos',
    'ubicacion': 'Via El Zulia km 2, Cucuta',
    'fecha_inicio_programada': '2026-10-01',
    'fecha_fin_programada': '2027-06-30',
    'responsable_id': responsable_id,
    'presupuesto_inicial': 450000000,
    'observaciones': 'Presupuesto de referencia (RN02)',
}

# flujo principal: registro exitoso
estado, r = http('POST', '/api/proyectos', PROYECTO, token=token)
assert estado == 201, f'se esperaba 201, llego {estado}: {r}'
p = r['proyecto']
assert p['estado'] == 'PLANIFICACION', 'criterio 4: estado inicial de planificacion'
assert float(p['porcentaje_avance_total']) == 0, 'criterio 4: avance inicial en cero'
assert p['cliente_nombre'], 'el proyecto se devuelve con el nombre del cliente'
print('crear ->', estado, p['codigo'], p['estado'], 'avance', str(p['porcentaje_avance_total']))

# Alt 1: fechas inconsistentes -> 400 y se impide el registro
mal = dict(PROYECTO, codigo='PRJ-HU02-ALT1',
           fecha_inicio_programada='2027-06-30', fecha_fin_programada='2026-10-01')
estado, r = http('POST', '/api/proyectos', mal, token=token)
assert estado == 400, f'se esperaba 400 por fechas, llego {estado}: {r}'
print('fechas inconsistentes ->', estado, r['error'])

# Alt 2: cliente no registrado -> 404
estado, r = http('POST', '/api/proyectos', dict(PROYECTO, codigo='PRJ-HU02-ALT2', cliente_id=99999), token=token)
assert estado == 404, f'se esperaba 404 por cliente, llego {estado}: {r}'
print('cliente inexistente ->', estado, r['error'])

# criterio: presupuesto > 0 -> 400
estado, r = http('POST', '/api/proyectos', dict(PROYECTO, codigo='PRJ-HU02-ALT3', presupuesto_inicial=0), token=token)
assert estado == 400, f'se esperaba 400 por presupuesto, llego {estado}: {r}'
print('presupuesto 0 ->', estado, r['error'])

# criterio: codigo unico -> 409
estado, r = http('POST', '/api/proyectos', PROYECTO, token=token)
assert estado == 409, f'se esperaba 409 por codigo, llego {estado}: {r}'
print('codigo duplicado ->', estado, r['error'])

# criterio: responsable dado de baja (activo=0) -> 400
baja = subprocess.run(mysql_args(['-e',
    "INSERT INTO trabajadores (numero_documento, tipo_documento, nombres, apellidos, cargo, activo, fecha_baja) "
    "VALUES ('1999999999','CC','Dado','De Baja','Operario',0,NOW()) "
    "ON DUPLICATE KEY UPDATE activo=0, fecha_baja=NOW()"]), capture_output=True, text=True)
if baja.returncode == 0:
    q = subprocess.run(mysql_args(['-N', '-e',
        "SELECT id FROM trabajadores WHERE numero_documento='1999999999'"]),
        capture_output=True, text=True)
    id_baja = int(q.stdout.strip())
    estado, r = http('POST', '/api/proyectos', dict(PROYECTO, codigo='PRJ-HU02-ALT4', responsable_id=id_baja), token=token)
    assert estado == 400, f'se esperaba 400 por responsable de baja, llego {estado}: {r}'
    print('responsable de baja ->', estado, r['error'])
else:
    print('responsable de baja -> OMITIDO (sin acceso mysql para sembrar el caso)')

# RBAC: un rol no autorizado no puede registrar
estado, login_m = http('POST', '/api/auth/login', {'username': 'bodega', 'password': 'Prueba123!'})
if estado == 200:
    estado, r = http('POST', '/api/proyectos', PROYECTO, token=login_m['token'])
    assert estado == 403, f'se esperaba 403 para bodega, llego {estado}: {r}'
    print('bodega crea proyecto ->', estado, r['error'])

# RBAC: el maestro de obra consulta (su menu muestra Proyectos) pero no registra
estado, login_mo = http('POST', '/api/auth/login', {'username': 'maestro', 'password': 'Prueba123!'})
if estado == 200:
    estado, r = http('GET', '/api/proyectos', token=login_mo['token'])
    assert estado == 200, f'el maestro debe poder listar, llego {estado}: {r}'
    estado, r = http('POST', '/api/proyectos', PROYECTO, token=login_mo['token'])
    assert estado == 403, f'se esperaba 403 para maestro al crear, llego {estado}: {r}'
    print('maestro lista sin crear ->', 'GET 200 / POST 403 OK')

# listado: el proyecto creado aparece con nombres legibles
estado, lista = http('GET', '/api/proyectos', token=token)
assert estado == 200 and any(p['codigo'] == 'PRJ-HU02-001' for p in lista), 'el proyecto creado debe listar'
creado = next(p for p in lista if p['codigo'] == 'PRJ-HU02-001')
print('listado ->', estado, len(lista), 'proyectos |', creado['codigo'], creado['cliente_nombre'], '/', creado['responsable_nombre'])

# la bitacora debe tener la entrada CREAR (RF31)
q = subprocess.run(mysql_args(['-N', '-e',
    "SELECT COUNT(*) FROM bitacora_trazabilidad WHERE tabla_afectada='proyectos' AND accion='CREAR'"]),
    capture_output=True, text=True)
assert int(q.stdout.strip()) >= 1, 'la bitacora debe registrar el alta del proyecto (RF31)'
print('bitacora -> entrada CREAR en proyectos registrada')

print('\nHU-02: TODAS LAS PRUEBAS PASARON')
