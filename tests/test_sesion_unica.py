# Sesión única por cuenta (RNF05 · seguridad).
#
# Una misma cuenta no puede mantener dos sesiones abiertas: cada ingreso
# reemplaza el identificador de sesión vigente, así que el token anterior deja
# de servir. El cierre de sesión también lo invalida del lado del servidor, y
# una cuenta bloqueada deja de funcionar en el momento.
#
# Requiere el backend (3005) arriba.
# Uso: python3 tests/test_sesion_unica.py
from api_helper import http, login, sql, scalar

USUARIO = 'test_sesion_unica'
DOCUMENTO = 'TEST-SESION-01'


def limpiar():
    sql(f"DELETE FROM bitacora_trazabilidad WHERE usuario_id IN (SELECT id FROM usuarios WHERE username='{USUARIO}')")
    sql(f"DELETE FROM bitacora_trazabilidad WHERE tabla_afectada='usuarios' AND registro_id IN (SELECT id FROM usuarios WHERE username='{USUARIO}')")
    sql(f"DELETE FROM usuarios WHERE username='{USUARIO}'")
    sql(f"DELETE FROM trabajadores WHERE numero_documento='{DOCUMENTO}'")


limpiar()

# --- Segundo ingreso: el token anterior queda invalidado ---------------------
primero = login('admin')
estado, _ = http('GET', '/api/dashboard', token=primero)
assert estado == 200, f'el primer ingreso debe servir: {estado}'

segundo = login('admin')
estado, data = http('GET', '/api/dashboard', token=primero)
print('token anterior tras un segundo ingreso ->', estado, '·', data.get('error'))
assert estado == 401, 'el token del ingreso anterior debe quedar invalidado'
assert 'otro dispositivo' in data.get('error', ''), 'el mensaje debe explicar por qué se cerró'

estado, _ = http('GET', '/api/dashboard', token=segundo)
assert estado == 200, 'el ingreso vigente debe seguir sirviendo'

# --- Cerrar sesión invalida el token en el servidor --------------------------
estado, _ = http('POST', '/api/auth/logout', token=segundo)
assert estado == 200, f'logout: {estado}'

estado, data = http('GET', '/api/dashboard', token=segundo)
print('token tras cerrar sesión ->', estado, '·', data.get('error'))
assert estado == 401, 'un token cerrado no debe volver a servir'

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
login('admin')
estado, _ = http('GET', '/api/dashboard', token=gerente)
assert estado == 200, 'el ingreso de otra cuenta no debe cerrar sesiones ajenas'

limpiar()
print('\nSesión única por cuenta: TODAS LAS PRUEBAS PASARON')
