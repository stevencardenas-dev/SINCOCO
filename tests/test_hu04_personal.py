# Prueba de HU-04 (RF06 · CU-04): registrar personal con cargo y especialidad.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu04_personal.py
#
# Verifica los criterios de aceptación de docs/HU_CRITERIOS_ACEPTACION.md (HU-04):
#  1. numero_documento único.
#  2. cargo obligatorio; especialidad obligatoria para cargos operativos.
#  3. al crearse: disponible = verdadero y estado ACTIVO.
#  4. los trabajadores dados de baja no pueden asignarse (se cubre en HU-18).
from api_helper import http, login, limpiar, sql, scalar, PREFIJO

limpiar()
admin = login('admin')

BASE_TRABAJADOR = {
    'numero_documento': f'{PREFIJO}-CC-100', 'tipo_documento': 'CC',
    'nombres': 'Ana', 'apellidos': 'Operaria', 'cargo': 'Obrero',
}

# Criterio 2: cargo operativo sin especialidad -> 400 señalando el campo.
estado, r = http('POST', '/api/trabajadores', BASE_TRABAJADOR, token=admin)
assert estado == 400, f'se esperaba 400 por especialidad, llego {estado}: {r}'
assert r.get('campo') == 'especialidad', f'debe señalar especialidad: {r}'
print('operativo sin especialidad ->', estado, r['error'])

# Criterio 3: con especialidad se crea disponible y activo.
cuerpo = dict(BASE_TRABAJADOR, especialidad='Mamposteria')
estado, r = http('POST', '/api/trabajadores', cuerpo, token=admin)
assert estado == 201, f'se esperaba 201, llego {estado}: {r}'
t = r['trabajador']
assert int(t['disponible']) == 1, 'criterio 3: disponible debe ser verdadero'
assert t['estado'] == 'ACTIVO', 'criterio 3: estado inicial ACTIVO'
print('crear con especialidad ->', estado, t['numero_documento'], 'disponible', t['disponible'], t['estado'])

# Criterio 1: numero_documento único -> 409.
estado, r = http('POST', '/api/trabajadores', cuerpo, token=admin)
assert estado == 409, f'se esperaba 409 por documento, llego {estado}: {r}'
print('documento duplicado ->', estado, r['error'])

# Correo único -> 409 (el esquema lo declara UNIQUE).
con_email = dict(BASE_TRABAJADOR, numero_documento=f'{PREFIJO}-CC-101',
                 nombres='Beto', email='sprint.h4@sincoco.test', especialidad='Mamposteria')
estado, r = http('POST', '/api/trabajadores', con_email, token=admin)
assert estado == 201, f'se esperaba 201 con correo, llego {estado}: {r}'
estado, r = http('POST', '/api/trabajadores', dict(con_email, numero_documento=f'{PREFIJO}-CC-102'),
                 token=admin)
assert estado == 409, f'se esperaba 409 por correo, llego {estado}: {r}'
assert r.get('campo') == 'email', f'debe señalar email: {r}'
print('correo duplicado ->', estado, r['error'])

# Cargo no operativo no exige especialidad (criterio 2 acotado a operativos).
estado, r = http('POST', '/api/trabajadores', {
    'numero_documento': f'{PREFIJO}-CC-103', 'tipo_documento': 'CC',
    'nombres': 'Carla', 'apellidos': 'Administrativa', 'cargo': 'Asistente administrativo',
}, token=admin)
assert estado == 201, f'cargo administrativo sin especialidad debía pasar, llego {estado}: {r}'
print('cargo no operativo sin especialidad ->', estado)

# RBAC: un rol sin permiso no puede registrar personal.
bodega = login('bodega')
estado, r = http('POST', '/api/trabajadores', dict(BASE_TRABAJADOR, numero_documento=f'{PREFIJO}-CC-104'),
                 token=bodega)
assert estado == 403, f'se esperaba 403 para bodega, llego {estado}: {r}'
print('bodega registra personal ->', estado)

# El catálogo lista lo creado.
estado, lista = http('GET', '/api/trabajadores', token=admin)
assert estado == 200 and any(x['numero_documento'] == f'{PREFIJO}-CC-100' for x in lista)
print('listado ->', estado, len(lista), 'trabajadores activos')

limpiar()
print('\nHU-04: TODAS LAS PRUEBAS PASARON')
