# Prueba del monitoreo de roles y permisos (HU-01 · criterio 4 · RF01 · RNF05).
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_roles_permisos.py
#
# La pantalla del administrador no calcula la matriz: la muestra tal como está
# en `roles_permisos`, que es lo que el backend consulta en cada petición con
# requirePermiso. Por eso lo que se comprueba aquí es que lo que la API
# devuelve coincide exactamente con lo que hay en la base, y que nadie que no
# sea administrador puede consultarla.
import subprocess

from api_helper import PREFIJO, crear_trabajador, http, login, mysql_args, scalar, sql
from permisos_core import verificar_matriz_en_base

RUTA = '/api/roles/permisos'


def pares_en_base():
    """Filas de roles_permisos como 'rol_id:permiso_id', leídas de la base."""
    r = subprocess.run(
        mysql_args(['-N', '-e', 'SELECT rol_id, permiso_id FROM roles_permisos']),
        capture_output=True, text=True,
    )
    assert r.returncode == 0, f'no se pudo leer roles_permisos: {r.stderr}'
    return {
        f"{linea.split(chr(9))[0]}:{linea.split(chr(9))[1]}"
        for linea in r.stdout.strip().splitlines()
        if linea.strip()
    }

# Acceso: solo el administrador tiene `usuarios.listar`, el permiso que protege
# la pantalla. El resto debe recibir 403 y sin token, 401.
ESPERADO = {'admin': 200, 'gerente': 403, 'maestro': 403, 'bodega': 403}

TOKENS = {usuario: login(usuario) for usuario in ESPERADO}

for usuario, esperado in ESPERADO.items():
    estado, _ = http('GET', RUTA, token=TOKENS[usuario])
    assert estado == esperado, f'{usuario} GET {RUTA}: se esperaba {esperado}, llego {estado}'
    print(f'{usuario:9} GET {RUTA} -> {estado}')

estado, _ = http('GET', RUTA)
assert estado == 401, f'{RUTA} sin token: se esperaba 401, llego {estado}'
print(f'sin token GET {RUTA} -> 401')

# --- Contenido -----------------------------------------------------------------
estado, datos = http('GET', RUTA, token=TOKENS['admin'])
assert estado == 200, f'admin GET {RUTA}: {estado} {datos}'

roles, permisos, asignaciones = datos['roles'], datos['permisos'], datos['asignaciones']

# La pantalla no puede inventarse roles ni permisos que no existan en la base.
assert len(roles) == int(scalar('SELECT COUNT(*) FROM roles')), 'roles != tabla roles'
assert len(permisos) == int(scalar('SELECT COUNT(*) FROM permisos')), 'permisos != tabla permisos'
print(f'conteos -> {len(roles)} roles · {len(permisos)} permisos · {len(asignaciones)} asignaciones')

# Ni omitir asignaciones: el conjunto mostrado debe ser el de roles_permisos.
en_base = pares_en_base()
en_api = {f"{a['rol_id']}:{a['permiso_id']}" for a in asignaciones}
assert en_api == en_base, f'la matriz mostrada no coincide con roles_permisos: {en_api ^ en_base}'
print('matriz mostrada == roles_permisos de la base')

# El resumen por rol que ve el administrador debe cuadrar con la matriz.
for rol in roles:
    concedidos = sum(1 for a in asignaciones if a['rol_id'] == rol['id'])
    assert rol['permisos_activos'] == concedidos, (
        f"{rol['nombre']}: la API dice {rol['permisos_activos']} permisos y la matriz tiene {concedidos}"
    )
cuentas = sum(r['usuarios'] for r in roles)
assert cuentas == int(scalar('SELECT COUNT(*) FROM usuarios')), 'el conteo de cuentas por rol no cuadra'
print('resumen por rol ->', {r['nombre']: r['permisos_activos'] for r in roles})

# --- Invariantes del seed (docs/seed_permisos_prueba.sql) ----------------------
por_nombre = {r['nombre']: r for r in roles}
assert por_nombre['ADMINISTRADOR']['permisos_activos'] == len(permisos), (
    'el administrador debe tener el catálogo completo de permisos'
)
# El resto de roles se valida por reglas (núcleo y vetados), no por conteos:
# ver tests/permisos_core.py.
verificar_matriz_en_base()
assert 'usuarios.listar' in [p['nombre'] for p in permisos], 'falta usuarios.listar en el catálogo'

# Cada permiso debe traer su módulo: la pantalla agrupa por ahí.
sin_modulo = [p['nombre'] for p in permisos if not p['modulo']]
assert not sin_modulo, f'permisos sin módulo (no se podrían agrupar): {sin_modulo}'
print('invariantes del seed -> ADMIN completo · núcleo y vetados por rol · módulos completos')

# --- Administración de roles (permiso roles.gestionar) ------------------------
NOMBRE_ROL = 'TEST_HU_ROL_GESTION'
sql(f"DELETE FROM roles WHERE nombre = '{NOMBRE_ROL}'")  # por si quedó de otra corrida

# RBAC: el gerente consulta... no; no administra roles.
estado, r = http('POST', '/api/roles', {'nombre': NOMBRE_ROL}, token=TOKENS['gerente'])
assert estado == 403, f'gerente no debe crear roles: {estado} {r}'
print('gerente crea rol ->', estado)

# Validaciones de forma.
estado, r = http('POST', '/api/roles', {'nombre': 'ab'}, token=TOKENS['admin'])
assert estado == 400 and r.get('campo') == 'nombre', f'nombre corto: {estado} {r}'

estado, r = http('POST', '/api/roles', {'nombre': NOMBRE_ROL, 'descripcion': 'Rol de prueba'}, token=TOKENS['admin'])
assert estado == 201, f'no se pudo crear el rol: {estado} {r}'
rol_id = r['rol']['id']
print('crear rol ->', estado, r['rol']['nombre'])

estado, r = http('POST', '/api/roles', {'nombre': NOMBRE_ROL}, token=TOKENS['admin'])
assert estado == 409, f'rol duplicado: {estado} {r}'

# Editar la descripción.
estado, r = http('PATCH', f'/api/roles/{rol_id}', {'descripcion': 'Rol de prueba editado'}, token=TOKENS['admin'])
assert estado == 200 and r['rol']['descripcion'] == 'Rol de prueba editado', f'editar rol: {estado} {r}'
print('editar rol ->', estado)

# Asignar permisos al rol nuevo (la ruta reemplaza el conjunto).
_, datos = http('GET', RUTA, token=TOKENS['admin'])
permiso_ids = [p['id'] for p in datos['permisos'][:3]]
estado, r = http('PUT', f'/api/roles/{rol_id}/permisos', {'permiso_ids': permiso_ids}, token=TOKENS['admin'])
assert estado == 200 and r['permisos'] == len(permiso_ids), f'asignar permisos: {estado} {r}'

_, datos = http('GET', RUTA, token=TOKENS['admin'])
asignados = {a['permiso_id'] for a in datos['asignaciones'] if a['rol_id'] == rol_id}
assert asignados == set(permiso_ids), f'los permisos del rol nuevo no coinciden: {asignados}'
print('asignar permisos ->', sorted(permiso_ids))

# Quitar permisos: el conjunto se reemplaza completo.
estado, r = http('PUT', f'/api/roles/{rol_id}/permisos', {'permiso_ids': []}, token=TOKENS['admin'])
assert estado == 200, f'quitar permisos: {estado} {r}'
_, datos = http('GET', RUTA, token=TOKENS['admin'])
assert not [a for a in datos['asignaciones'] if a['rol_id'] == rol_id], 'debían quedar sin permisos'
print('quitar permisos -> 0')

# Salvaguarda: el administrador no puede quitarse a sí mismo roles.gestionar.
rol_admin = next(x for x in datos['roles'] if x['nombre'] == 'ADMINISTRADOR')
estado, r = http('PUT', f"/api/roles/{rol_admin['id']}/permisos", {'permiso_ids': []}, token=TOKENS['admin'])
assert estado == 400, f'no debe poder autobloquearse: {estado} {r}'
print('salvaguarda admin ->', estado)

# Los roles base del sistema no se eliminan.
estado, r = http('DELETE', f"/api/roles/{rol_admin['id']}", token=TOKENS['admin'])
assert estado == 409, f'rol base no se elimina: {estado} {r}'

# Un rol con usuarios asignados no se elimina.
trabajador_id = crear_trabajador(TOKENS['admin'], f'{PREFIJO}-CC-ROLES')
estado, r = http('POST', '/api/usuarios', {
    'username': 'TEST-HU-ROLG', 'email': 'test.hu.rolg@sincoco.test',
    'password': 'Prueba123!', 'rol_id': rol_id, 'trabajador_id': trabajador_id,
}, token=TOKENS['admin'])
assert estado == 201, f'no se pudo crear el usuario del rol nuevo: {estado} {r}'
estado, r = http('DELETE', f'/api/roles/{rol_id}', token=TOKENS['admin'])
assert estado == 409, f'un rol con usuarios no debe eliminarse: {estado} {r}'
print('eliminar rol con usuarios ->', estado, r['error'][:48])
sql("DELETE FROM usuarios WHERE username='TEST-HU-ROLG'")

# Sin usuarios asignados, sí se elimina (y no deja permisos huérfanos).
estado, r = http('DELETE', f'/api/roles/{rol_id}', token=TOKENS['admin'])
assert estado == 200 and r['eliminado'], f'eliminar rol libre: {estado} {r}'
assert scalar(f'SELECT COUNT(*) FROM roles WHERE id={rol_id}') == '0', 'el rol no se eliminó'
assert scalar(f'SELECT COUNT(*) FROM roles_permisos WHERE rol_id={rol_id}') == '0', 'quedaron permisos huérfanos'
print('eliminar rol libre ->', estado)
sql(f"DELETE FROM trabajadores WHERE numero_documento LIKE '{PREFIJO}-CC-ROLES%'")

# Toda la gestión de roles queda en la bitácora (HU-17).
for accion in ('CREAR', 'ACTUALIZAR', 'ASIGNAR_PERMISOS', 'ELIMINAR'):
    n = scalar(
        'SELECT COUNT(*) FROM bitacora_trazabilidad '
        "WHERE tabla_afectada IN ('roles','roles_permisos') "
        f"AND accion='{accion}'"
    )
    assert int(n) >= 1, f'falta {accion} en la bitácora de roles'
print('gestión de roles -> crear/editar/permisos/eliminar + bitácora')

print('\nRoles y permisos (HU-01 · criterio 4): TODAS LAS PRUEBAS PASARON')
