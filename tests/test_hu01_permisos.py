# Prueba de HU-01 · criterio 4 (RF01 · RNF05): permisos del rol en la base.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu01_permisos.py
#
# El criterio pide que los permisos del usuario provengan de los permisos de su
# rol (roles_permisos), no de una lista fija en el código. Esta prueba comprueba
# que el RBAC cumple las reglas de cada rol sobre la matriz de la base (cargada
# por docs/seed_permisos_prueba.sql y editable desde "Roles y permisos"):
# ADMINISTRADOR tiene todos los permisos del catálogo y los demás roles
# conservan sus permisos núcleo sin tener los vetados. Las reglas viven en
# tests/permisos_core.py. NO se cuentan permisos: un total fijo se rompe con cada
# HU que agrega permisos (ver la explicación en ese archivo).
from api_helper import PREFIJO, crear_trabajador, http, login, scalar, sql
from permisos_core import verificar_matriz_en_base

# La matriz del seed, por rol. Con 'incluirInactivos' se evita depender de datos.
ESPERADO_GET = {
    'admin': {'/api/usuarios': 200, '/api/clientes': 200, '/api/trabajadores': 200,
              '/api/proyectos': 200, '/api/roles/permisos': 200, '/api/auditoria': 200,
              '/api/catalogos/cargos': 200},
    'gerente': {'/api/usuarios': 403, '/api/clientes': 200, '/api/trabajadores': 200,
                '/api/proyectos': 200, '/api/roles/permisos': 403, '/api/auditoria': 403,
                '/api/catalogos/cargos': 200},
    'maestro': {'/api/usuarios': 403, '/api/clientes': 200, '/api/trabajadores': 200,
                '/api/proyectos': 200, '/api/roles/permisos': 403, '/api/auditoria': 403,
                '/api/catalogos/cargos': 200},
    'bodega': {'/api/usuarios': 403, '/api/clientes': 403, '/api/trabajadores': 403,
               '/api/proyectos': 403, '/api/roles/permisos': 403, '/api/auditoria': 403,
               '/api/catalogos/cargos': 403},
}

TOKENS = {usuario: login(usuario) for usuario in ESPERADO_GET}

for usuario, rutas in ESPERADO_GET.items():
    for ruta, esperado in rutas.items():
        estado, r = http('GET', ruta, token=TOKENS[usuario])
        assert estado == esperado, f'{usuario} GET {ruta}: se esperaba {esperado}, llego {estado}'
    print(f'{usuario:9} ->', ' '.join(f'{r.split("/")[-1]}={esperado}' for r, esperado in rutas.items()))

# La matriz de la base cumple las reglas de cada rol (sin contar permisos).
conteos = verificar_matriz_en_base()
print('matriz en roles_permisos cumple las reglas de cada rol ->', conteos)

# Sin token, toda ruta protegida responde 401 (requireAuth sigue vigente).
for ruta in ('/api/usuarios', '/api/clientes', '/api/trabajadores', '/api/proyectos',
             '/api/roles/permisos', '/api/auditoria', '/api/catalogos/cargos'):
    estado, _ = http('GET', ruta)
    assert estado == 401, f'{ruta} sin token: se esperaba 401, llego {estado}'
print('sin token -> 401 en todas las rutas protegidas')

# Validaciones del rol asignado (criterio 1): el usuario va vinculado a un
# trabajador y a un único rol ACTIVO, y ese rol tiene que existir.
sql("DELETE FROM usuarios WHERE username='TEST-HU-ROL'")
libre_id = crear_trabajador(TOKENS['admin'], f'{PREFIJO}-CC-ROL')
NUEVO = {
    'username': 'TEST-HU-ROL', 'email': 'test.hu.rol@sincoco.test',
    'password': 'Prueba123!', 'trabajador_id': libre_id,
}

estado, r = http('POST', '/api/usuarios', dict(NUEVO, rol_id=99999), token=TOKENS['admin'])
assert estado == 400, f'un rol inexistente debe rechazarse, llego {estado}: {r}'
print('rol inexistente al crear ->', estado, r['error'])

estado, r = http('POST', '/api/usuarios', dict(NUEVO, rol_id=4), token=TOKENS['admin'])
assert estado == 201, f'no se pudo crear el usuario de prueba: {estado} {r}'
usuario_id = r['id']

estado, r = http('PATCH', f'/api/usuarios/{usuario_id}/rol', {'rol_id': 99999}, token=TOKENS['admin'])
assert estado == 400, f'un cambio a un rol inexistente debe rechazarse, llego {estado}: {r}'
print('rol inexistente al cambiar ->', estado, r['error'])

# El rol de un usuario solo puede cambiarlo quien tenga el permiso, y el cambio
# queda en la bitácora sin tocar el rol_id anterior del historial.
estado, r = http('PATCH', f'/api/usuarios/{usuario_id}/rol', {'rol_id': 2}, token=TOKENS['gerente'])
assert estado == 403, f'gerente no debe cambiar roles, llego {estado}: {r}'
estado, r = http('PATCH', f'/api/usuarios/{usuario_id}/rol', {'rol_id': 2}, token=TOKENS['admin'])
assert estado == 200 and r['rol_id'] == 2, f'el cambio de rol valido fallo: {estado} {r}'
assert scalar(
    "SELECT COUNT(*) FROM bitacora_trazabilidad WHERE tabla_afectada='usuarios' "
    f"AND registro_id={usuario_id} AND accion='ACTUALIZAR'"
) == '1', 'el cambio de rol debe quedar en la bitacora'
print('cambio de rol -> 403 para gerente · 200 para admin · registrado en la bitácora')

# Limpieza: la cuenta y el trabajador de prueba no deben quedar en la base.
sql(f'DELETE FROM usuarios WHERE id={usuario_id}')
sql(f"DELETE FROM trabajadores WHERE numero_documento='{PREFIJO}-CC-ROL'")
assert scalar("SELECT COUNT(*) FROM usuarios WHERE username='TEST-HU-ROL'") == '0', \
    'la cuenta de prueba no se limpio'
print('limpieza -> la cuenta de prueba se elimino')

print('\nHU-01 (permisos): TODAS LAS PRUEBAS PASARON')
