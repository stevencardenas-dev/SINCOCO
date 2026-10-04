# Utilidades compartidas por las pruebas del sprint 1.
#
# Hablan con la API real (puerto 3005) y con la base usando las credenciales de
# backend/.env, igual que tests/test_proyectos_hu02.py. No requieren Playwright:
# son pruebas de API, así que se pueden correr sin navegador.
#
# Uso: `python tests/test_hu04_personal.py` (con el backend arriba).
import json
import os
import subprocess
import urllib.error
import urllib.request

BASE = 'http://localhost:3005'
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _leer_env():
    env = {}
    with open(os.path.join(RAIZ, 'backend', '.env')) as f:
        for linea in f:
            linea = linea.strip()
            if linea and not linea.startswith('#') and '=' in linea:
                k, v = linea.split('=', 1)
                env[k] = v
    return env


DB_ENV = _leer_env()


def mysql_args(extra):
    host = DB_ENV.get('DB_HOST', '127.0.0.1')
    if host in ('', 'localhost'):
        host = '127.0.0.1'
    return [
        'mysql', '-h', host, '-u' + DB_ENV.get('DB_USER', 'root'),
        '-p' + DB_ENV.get('DB_PASSWORD', ''), '-D', DB_ENV.get('DB_NAME', 'sincoco'),
    ] + extra


def sql(consulta):
    """Ejecuta una consulta y devuelve el CompletedProcess (sin volcar la salida)."""
    return subprocess.run(mysql_args(['-e', consulta]), capture_output=True, text=True)


def scalar(consulta):
    """Devuelve el primer valor de la consulta como texto, o '' si no hay filas."""
    r = subprocess.run(mysql_args(['-N', '-e', consulta]), capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ''


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


def liberar_sesion(usuario):
    """Cierra en la base la sesión abierta de la cuenta.

    Sesión única por cuenta: mientras una sesión esté activa, un segundo
    ingreso se rechaza (409). Cada archivo de prueba es un proceso nuevo que
    vuelve a ingresar con los mismos usuarios, así que antes de cada login se
    libera la cuenta, como si la sesión anterior se hubiera cerrado."""
    sql(f"UPDATE usuarios SET sesion_actual = NULL WHERE username = '{usuario}'")


def login(usuario, password='Prueba123!'):
    liberar_sesion(usuario)
    estado, data = http('POST', '/api/auth/login', {'username': usuario, 'password': password})
    assert estado == 200, f'login de {usuario} fallo: {estado} {data}'
    return data['token']


# Marcador de los datos que crean estas pruebas (para limpiarlos sin tocar el
# resto de la base).
PREFIJO = 'TEST-HU'


def limpiar():
    """Borra los datos de prueba en orden de dependencias y su bitácora."""
    sql(
        "DELETE FROM bitacora_trazabilidad "
        "WHERE tabla_afectada IN ('proyectos','etapas_proyecto','actividades',"
        "'trabajadores','clientes','usuarios') "
        "AND fecha_registro >= NOW() - INTERVAL 1 HOUR"
    )
    # Las asignaciones de personal (acceso a proyectos y actividades) van primero:
    # la FK del proyecto es RESTRICT y sin borrarlas el proyecto no se puede eliminar.
    sql(
        "DELETE FROM asignaciones_personal "
        "WHERE proyecto_id IN (SELECT id FROM proyectos WHERE codigo LIKE 'TEST-%') "
        "OR trabajador_id IN (SELECT id FROM trabajadores WHERE numero_documento LIKE 'TEST-%')"
    )
    sql("DELETE FROM actividades WHERE nombre LIKE 'TEST-%'")
    sql("DELETE FROM etapas_proyecto WHERE nombre LIKE 'TEST-%'")
    # Además de los proyectos de prueba, se quitan los que apunten a un
    # trabajador de prueba: de lo contrario la FK del responsable (RESTRICT)
    # impide borrar ese trabajador y contamina la corrida siguiente.
    sql(
        "DELETE FROM proyectos WHERE codigo LIKE 'TEST-%' "
        "OR responsable_id IN (SELECT id FROM trabajadores WHERE numero_documento LIKE 'TEST-%')"
    )
    sql("DELETE FROM trabajadores WHERE numero_documento LIKE 'TEST-%'")
    sql("DELETE FROM clientes WHERE numero_documento LIKE 'TEST-%'")


def crear_cliente(token, documento=None):
    documento = documento or f'{PREFIJO}-NIT-01'
    estado, data = http('POST', '/api/clientes', {
        'numero_documento': documento, 'tipo_documento': 'NIT',
        'razon_social_nombre': 'Cliente de prueba sprint 1',
    }, token=token)
    assert estado in (201, 409), f'cliente de prueba: {estado} {data}'
    if estado == 409:
        return int(scalar(f"SELECT id FROM clientes WHERE numero_documento='{documento}'"))
    return data['cliente']['id']


def crear_trabajador(token, documento=None, cargo='Maestro de obra'):
    documento = documento or f'{PREFIJO}-CC-01'
    estado, data = http('POST', '/api/trabajadores', {
        'numero_documento': documento, 'tipo_documento': 'CC',
        'nombres': 'Prueba', 'apellidos': 'Sprint', 'cargo': cargo,
        'especialidad': 'Mamposteria',
    }, token=token)
    assert estado in (201, 409), f'trabajador de prueba: {estado} {data}'
    if estado == 409:
        return int(scalar(f"SELECT id FROM trabajadores WHERE numero_documento='{documento}'"))
    return data['trabajador']['id']


def crear_proyecto(token, codigo=None):
    """Crea un proyecto de prueba con cliente y responsable propios."""
    codigo = codigo or f'{PREFIJO}-PRJ-01'
    cliente_id = crear_cliente(token)
    responsable_id = crear_trabajador(token)
    cuerpo = {
        'codigo': codigo, 'cliente_id': cliente_id, 'nombre': 'Proyecto de prueba sprint 1',
        'ubicacion': 'Cucuta', 'fecha_inicio_programada': '2026-10-01',
        'fecha_fin_programada': '2027-06-30', 'responsable_id': responsable_id,
        'presupuesto_inicial': 1000000,
    }
    estado, data = http('POST', '/api/proyectos', cuerpo, token=token)
    assert estado in (201, 409), f'proyecto de prueba: {estado} {data}'
    if estado == 409:
        return int(scalar(f"SELECT id FROM proyectos WHERE codigo='{codigo}'"))
    return data['proyecto']['id']
