# Sesión única por cuenta (RNF05 · seguridad).
#
# Una misma cuenta no puede mantener dos sesiones abiertas: mientras haya una
# sesión activa, un segundo ingreso se RECHAZA (409) y la sesión abierta sigue
# intacta. La cuenta se libera al cerrar sesión o tras unos minutos sin
# actividad. Una cuenta bloqueada deja de funcionar en el momento.
#
# Requiere el backend (3005) arriba.
# Uso: python3 tests/test_sesion_unica.py
from api_helper import http, login, sql, scalar

USUARIO = 'test_sesion_unica'
DOCUMENTO = 'TEST-SESION-01'
CREDENCIALES_ADMIN = {'username': 'admin', 'password': 'Prueba123!'}


def limpiar():
    sql(f"DELETE FROM bitacora_trazabilidad WHERE usuario_id IN (SELECT id FROM usuarios WHERE username='{USUARIO}')")
    sql(f"DELETE FROM bitacora_trazabilidad WHERE tabla_afectada='usuarios' AND registro_id IN (SELECT id FROM usuarios WHERE username='{USUARIO}')")
    sql(f"DELETE FROM usuarios WHERE username='{USUARIO}'")
    sql(f"DELETE FROM trabajadores WHERE numero_documento='{DOCUMENTO}'")


limpiar()

# --- Segundo ingreso: se rechaza y la sesión abierta sigue sirviendo ----------
primero = login('admin')
estado, _ = http('GET', '/api/auth/sesion', token=primero)
assert estado == 200, f'el latido de la sesión abierta debe servir: {estado}'

estado, data = http('POST', '/api/auth/login', CREDENCIALES_ADMIN)
print('segundo ingreso con la misma cuenta ->', estado, '·', data.get('error'))
assert estado == 409, f'el segundo ingreso debe rechazarse: {estado} {data}'
assert data.get('codigo') == 'SESION_ACTIVA', data
assert 'token' not in data, 'el ingreso rechazado no debe entregar token'

estado, _ = http('GET', '/api/dashboard', token=primero)
assert estado == 200, 'la sesión abierta no debe cerrarse por el intento'

rechazos = scalar(
    "SELECT COUNT(*) FROM bitacora_trazabilidad b JOIN usuarios u ON u.id = b.usuario_id "
    "WHERE u.username = 'admin' AND b.accion = 'SESION_RECHAZADA'"
)
assert int(rechazos or 0) >= 1, 'el intento rechazado debe quedar en la bitácora'
print('sesión abierta intacta · intento registrado en la bitácora')

# --- Cerrar sesión libera la cuenta e invalida el token -----------------------
estado, _ = http('POST', '/api/auth/logout', token=primero)
assert estado == 200, f'logout: {estado}'

estado, data = http('GET', '/api/dashboard', token=primero)
print('token tras cerrar sesión ->', estado, '·', data.get('error'))
assert estado == 401, 'un token cerrado no debe volver a servir'

estado, data = http('POST', '/api/auth/login', CREDENCIALES_ADMIN)
assert estado == 200, f'tras cerrar sesión se debe poder ingresar: {estado} {data}'
segundo = data['token']

# --- Sesión abandonada (sin actividad): expira y la cuenta queda libre --------
sql("UPDATE usuarios SET sesion_actividad = NOW() - INTERVAL 1 DAY WHERE username = 'admin'")
estado, data = http('GET', '/api/dashboard', token=segundo)
print('sesión inactiva ->', estado, '·', data.get('error'))
assert estado == 401 and data.get('codigo') == 'SESION_EXPIRADA', 'una sesión inactiva debe expirar'

estado, data = http('POST', '/api/auth/login', CREDENCIALES_ADMIN)
assert estado == 200, f'tras la inactividad se debe poder ingresar: {estado} {data}'
http('POST', '/api/auth/logout', token=data['token'])

# --- Una cuenta bloqueada deja de servir en el momento -----------------------
admin = login('admin')
estado, data = http('POST', '/api/trabajadores', {
    'numero_documento': DOCUMENTO, 'tipo_documento': 'CC',
    'nombres': 'Sesión', 'apellidos': 'Única', 'email': 'sesion.unica@sincoco.test',
    'cargo': 'Encargado de bodega',
}, token=admin)
assert estado == 201, f'trabajador de prueba: {estado} {data}'
trabajador_id = data['trabajador']['id']

rol_id = int(scalar("SELECT id FROM roles WHERE nombre='ENCARGADO_BODEGA'"))
estado, data = http('POST', '/api/usuarios', {
    'username': USUARIO, 'password': 'Prueba123!', 'email': 'sesion.unica@sincoco.test',
    'rol_id': rol_id, 'trabajador_id': trabajador_id,
}, token=admin)
assert estado == 201, f'usuario de prueba: {estado} {data}'
usuario_id = data['id']

token_temp = login(USUARIO)
estado, _ = http('GET', '/api/dashboard', token=token_temp)
assert estado == 200, 'la cuenta temporal debe poder entrar'

estado, data = http('PATCH', f'/api/usuarios/{usuario_id}/estado', {'estado': 'BLOQUEADO'}, token=admin)
assert estado == 200, f'bloquear: {estado} {data}'

estado, data = http('GET', '/api/dashboard', token=token_temp)
print('token de cuenta bloqueada ->', estado, '·', data.get('error'))
assert estado == 401, 'una cuenta bloqueada no debe seguir usando su token'

# --- Las sesiones de otras cuentas no se tocan --------------------------------
gerente = login('gerente')
estado, _ = http('POST', '/api/auth/login', CREDENCIALES_ADMIN)
assert estado == 409, 'admin sigue con su sesión abierta'
estado, _ = http('GET', '/api/dashboard', token=gerente)
assert estado == 200, 'el intento de otra cuenta no debe afectar sesiones ajenas'

# Deja las cuentas libres para las demás pruebas.
http('POST', '/api/auth/logout', token=admin)
http('POST', '/api/auth/logout', token=gerente)
limpiar()
print('\nSesión única por cuenta: TODAS LAS PRUEBAS PASARON')
