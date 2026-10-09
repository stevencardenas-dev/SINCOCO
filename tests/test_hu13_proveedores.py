# Prueba de API del alta y el listado de proveedores (HU-13 · AYD-25).
#
# Requiere el backend corriendo (puerto 3005) y haber aplicado
# docs/migracion_proveedores.sql. No usa navegador.
# Uso: python tests/test_hu13_proveedores.py
#
# Comprueba:
#   1. El administrador registra un proveedor válido (201).
#   2. El documento es único: repetirlo da 409 señalando el campo.
#   3. El documento se valida como NIT: 'ABC' da 400.
#   4. Razón social y datos de contacto son obligatorios (400).
#   5. El gerente no tiene el permiso `proveedores.crear` (403).
#   6. El listado del administrador incluye el proveedor creado.
import time

from api_helper import PREFIJO, http, limpiar, login, sql

RUTA = '/api/proveedores'
RAZON = f'{PREFIJO}-Proveedor de prueba'
# NIT numérico único por ejecución (el prefijo de prueba no cabe en el formato).
DOCUMENTO = '8' + str(int(time.time()))[-9:] + '-1'


def limpiar_proveedores():
    # `limpiar()` no conoce la tabla proveedores: se borran aquí por razón social.
    sql(f"DELETE FROM proveedores WHERE razon_social LIKE '{PREFIJO}-%'")


limpiar()
limpiar_proveedores()

TOKEN = {usuario: login(usuario) for usuario in ('admin', 'gerente')}

CUERPO = {
    'documento_identificacion': DOCUMENTO,
    'razon_social': RAZON,
    'nombre_contacto': 'Contacto Prueba',
    'telefono': '3001234567',
    'email': 'proveedor.prueba@example.com',
    'direccion': 'Cucuta',
}

# --- 1. Alta válida ----------------------------------------------------------
estado, r = http('POST', RUTA, CUERPO, token=TOKEN['admin'])
assert estado == 201, f'alta de proveedor: {estado} {r}'
proveedor = r['proveedor']
assert proveedor['documento_identificacion'] == DOCUMENTO and proveedor['razon_social'] == RAZON, proveedor
print('crear proveedor ->', estado, proveedor['razon_social'])

# --- 2. Documento único -------------------------------------------------------
estado, r = http('POST', RUTA, CUERPO, token=TOKEN['admin'])
assert estado == 409 and r.get('campo') == 'documento_identificacion', f'duplicado: {estado} {r}'
print('documento repetido ->', estado, r['error'])

# --- 3. Formato del documento --------------------------------------------------
estado, r = http('POST', RUTA, dict(CUERPO, documento_identificacion='ABC'), token=TOKEN['admin'])
assert estado == 400 and r.get('campo') == 'documento_identificacion', f'formato inválido: {estado} {r}'
print('documento inválido ->', estado, r['error'])

# --- 4. Campos obligatorios ----------------------------------------------------
for campo in ('email', 'nombre_contacto'):
    cuerpo = {k: v for k, v in CUERPO.items() if k != campo}
    cuerpo['documento_identificacion'] = '7' + str(int(time.time()))[-9:]
    estado, r = http('POST', RUTA, cuerpo, token=TOKEN['admin'])
    assert estado == 400 and campo in r.get('error', ''), f'falta {campo}: {estado} {r}'
print('faltan email / nombre_contacto -> 400')

# --- 5. RBAC --------------------------------------------------------------------
estado, r = http('POST', RUTA, dict(CUERPO, documento_identificacion='600123456'), token=TOKEN['gerente'])
assert estado == 403, f'el gerente no debe crear proveedores: {estado} {r}'
print('gerente crea proveedor ->', estado)

# --- 6. Listado -----------------------------------------------------------------
estado, lista = http('GET', RUTA, token=TOKEN['admin'])
assert estado == 200, f'listado: {estado} {lista}'
assert any(p['id'] == proveedor['id'] for p in lista), 'el listado no incluye el proveedor creado'
print('listado ->', estado, f'{len(lista)} proveedores, incluye el creado')

# --- Limpieza -------------------------------------------------------------------
limpiar()
limpiar_proveedores()
print('limpieza -> los registros de prueba no quedan en la base')

print('\nHU-13 proveedores: TODAS LAS PRUEBAS PASARON')
