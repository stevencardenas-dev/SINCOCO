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

from api_helper import http, login, mysql_args, scalar

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
assert por_nombre['ENCARGADO_BODEGA']['permisos_activos'] == 0, (
    'bodega no debe tener permisos en esta matriz'
)
assert 'usuarios.listar' in [p['nombre'] for p in permisos], 'falta usuarios.listar en el catálogo'

# Cada permiso debe traer su módulo: la pantalla agrupa por ahí.
sin_modulo = [p['nombre'] for p in permisos if not p['modulo']]
assert not sin_modulo, f'permisos sin módulo (no se podrían agrupar): {sin_modulo}'
print('invariantes del seed -> ADMIN completo · BODEGA sin permisos · módulos completos')

print('\nRoles y permisos (HU-01 · criterio 4): TODAS LAS PRUEBAS PASARON')
