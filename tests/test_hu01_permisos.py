# Prueba de HU-01 · criterio 4 (RF01 · RNF05): permisos del rol en la base.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu01_permisos.py
#
# El criterio pide que los permisos del usuario provengan de los permisos de su
# rol (roles_permisos), no de una lista fija en el código. Esta prueba comprueba
# que el RBAC coincide con la matriz cargada por docs/seed_permisos_prueba.sql:
#   ADMIN 20 · GERENTE 5 · MAESTRO_OBRA 3 · ENCARGADO_BODEGA 0.
#   (20 desde que HU-17 añadió `auditoria.listar`.)
from api_helper import http, login, scalar

# La matriz del seed, por rol. Con 'incluirInactivos' se evita depender de datos.
ESPERADO_GET = {
    'admin': {'/api/usuarios': 200, '/api/clientes': 200, '/api/trabajadores': 200,
              '/api/proyectos': 200, '/api/roles/permisos': 200, '/api/auditoria': 200},
    'gerente': {'/api/usuarios': 403, '/api/clientes': 200, '/api/trabajadores': 200,
                '/api/proyectos': 200, '/api/roles/permisos': 403, '/api/auditoria': 403},
    'maestro': {'/api/usuarios': 403, '/api/clientes': 403, '/api/trabajadores': 403,
                '/api/proyectos': 200, '/api/roles/permisos': 403, '/api/auditoria': 403},
    'bodega': {'/api/usuarios': 403, '/api/clientes': 403, '/api/trabajadores': 403,
               '/api/proyectos': 403, '/api/roles/permisos': 403, '/api/auditoria': 403},
}

TOKENS = {usuario: login(usuario) for usuario in ESPERADO_GET}

for usuario, rutas in ESPERADO_GET.items():
    for ruta, esperado in rutas.items():
        estado, r = http('GET', ruta, token=TOKENS[usuario])
        assert estado == esperado, f'{usuario} GET {ruta}: se esperaba {esperado}, llego {estado}'
    print(f'{usuario:9} ->', ' '.join(f'{r.split("/")[-1]}={esperado}' for r, esperado in rutas.items()))

# La matriz de la base debe tener los conteos del seed.
conteos = {}
for rol in ('ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA', 'ENCARGADO_BODEGA'):
    conteos[rol] = scalar(
        'SELECT COUNT(*) FROM roles_permisos rp JOIN roles r ON r.id = rp.rol_id '
        f"WHERE r.nombre='{rol}'"
    )
assert conteos['ADMINISTRADOR'] == '20', f'ADMIN debe tener 20 permisos: {conteos}'
assert conteos['GERENTE'] == '5', f'GERENTE debe tener 5 permisos: {conteos}'
assert conteos['MAESTRO_OBRA'] == '3', f'MAESTRO_OBRA debe tener 3 permisos: {conteos}'
assert conteos['ENCARGADO_BODEGA'] == '0', f'BODEGA no debe tener permisos: {conteos}'
print('matriz en roles_permisos ->', conteos)

# Sin token, toda ruta protegida responde 401 (requireAuth sigue vigente).
for ruta in ('/api/usuarios', '/api/clientes', '/api/trabajadores', '/api/proyectos',
             '/api/roles/permisos', '/api/auditoria'):
    estado, _ = http('GET', ruta)
    assert estado == 401, f'{ruta} sin token: se esperaba 401, llego {estado}'
print('sin token -> 401 en todas las rutas protegidas')

print('\nHU-01 (permisos): TODAS LAS PRUEBAS PASARON')
