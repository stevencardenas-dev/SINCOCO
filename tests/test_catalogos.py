# Prueba de los catálogos del sistema (HU-04 · HU-18 · RF01 · RF06).
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_catalogos.py
#
# Comprueba que `cargo` y `especialidad` dejaron de ser texto libre:
#   1. Cargos y especialidades son tablas de dominio (docs/schema.sql) y el
#      backend solo acepta valores que existan en ellas.
#   2. La regla de HU-04 · criterio 2 (especialidad obligatoria en cargos de
#      obra) la decide la marca `operativo` del catálogo, no una lista del
#      código: al desmarcarla, el mismo cargo deja de exigir especialidad.
#   3. Eliminar es baja lógica (HU-18 · RN07): el valor deja de ofrecerse pero
#      los registros que lo usan conservan el dato, y se puede reactivar.
#   4. La lectura la tiene quien ve el personal; la gestión, el administrador
#      y el gerente (permisos `catalogos.listar` / `catalogos.gestionar`).
from api_helper import PREFIJO, http, login, limpiar, scalar, sql

limpiar()

CARGOS = '/api/catalogos/cargos'
ESPECIALIDADES = '/api/catalogos/especialidades'
TOKEN = {usuario: login(usuario) for usuario in ('admin', 'gerente', 'maestro', 'bodega')}

# --- 1. RBAC de los catálogos -----------------------------------------------
# La lectura la necesita quien consulta personal (admin, gerente y maestro de obra).
for rol in ('admin', 'gerente', 'maestro'):
    assert http('GET', CARGOS, token=TOKEN[rol])[0] == 200, f'{rol} debe leer el catálogo'
estado, _ = http('GET', CARGOS, token=TOKEN['bodega'])
assert estado == 403, f'bodega no debe leer el catálogo: {estado}'
assert http('GET', ESPECIALIDADES, token=TOKEN['admin'])[0] == 200

# Un catálogo que no existe se rechaza por el tipo de la ruta.
estado, r = http('GET', '/api/catalogos/colores', token=TOKEN['admin'])
assert estado == 404, f'catálogo inexistente: {estado} {r}'
print('RBAC ->', 'admin/gerente/maestro 200 · bodega 403 · catálogo inexistente 404')

# --- 2. Alta en el catálogo --------------------------------------------------
NOMBRE_CARGO = f'{PREFIJO}-Cargo de prueba'
NOMBRE_ESPECIALIDAD = f'{PREFIJO}-Especialidad de prueba'

# El gerente administra la Gestión Administrativa (docs/migracion_catalogo_gerente.sql).
estado, r = http('POST', CARGOS, {'nombre': NOMBRE_CARGO, 'operativo': True}, token=TOKEN['gerente'])
assert estado == 201, f'el gerente debe gestionar el catálogo: {estado} {r}'
cargo_id = r['cargo']['id']
assert int(r['cargo']['operativo']) == 1, 'el cargo debe quedar marcado como de obra'
print('crear cargo (gerente) ->', estado, r['cargo']['nombre'], 'operativo', r['cargo']['operativo'])

# El nombre es único (la colación no distingue mayúsculas ni tildes).
estado, r = http('POST', CARGOS, {'nombre': NOMBRE_CARGO.upper()}, token=TOKEN['admin'])
assert estado == 409 and r.get('campo') == 'nombre', f'duplicado: {estado} {r}'

estado, r = http('POST', CARGOS, {'nombre': 'ab'}, token=TOKEN['admin'])
assert estado == 400 and r.get('campo') == 'nombre', f'nombre inválido: {estado} {r}'
print('validaciones -> duplicado 409 · nombre corto 400 (campo nombre)')

estado, r = http('POST', ESPECIALIDADES, {'nombre': NOMBRE_ESPECIALIDAD, 'descripcion': 'Prueba'}, token=TOKEN['admin'])
assert estado == 201, f'no se pudo crear la especialidad: {estado} {r}'
especialidad_id = r['especialidad']['id']

# --- 3. El trabajador solo acepta valores del catálogo ----------------------
BASE = {
    'numero_documento': f'{PREFIJO}-CC-CAT', 'tipo_documento': 'CC',
    'nombres': 'Cata', 'apellidos': 'Logo',
}

# Criterio 2: el cargo recién creado está marcado como de obra -> exige especialidad.
estado, r = http('POST', '/api/trabajadores', dict(BASE, cargo_id=cargo_id), token=TOKEN['admin'])
assert estado == 400 and r.get('campo') == 'especialidad', f'se esperaba 400: {estado} {r}'
print('cargo de obra sin especialidad ->', estado, r['error'])

estado, r = http('POST', '/api/trabajadores', dict(BASE, cargo_id=cargo_id, especialidad_id=especialidad_id),
                 token=TOKEN['admin'])
assert estado == 201, f'no se pudo registrar con el catálogo: {estado} {r}'
t = r['trabajador']
assert t['cargo'] == NOMBRE_CARGO and t['especialidad'] == NOMBRE_ESPECIALIDAD, t
assert t['cargo_id'] == cargo_id and t['especialidad_id'] == especialidad_id, t
print('trabajador con cargo/especialidad del catálogo ->', estado, t['cargo'], '/', t['especialidad'])

# Los clientes de API anteriores mandan el nombre; el catálogo lo resuelve
# aunque falten las tildes ('Mamposteria' -> 'Mampostería').
estado, r = http('POST', '/api/trabajadores',
                 dict(BASE, numero_documento=f'{PREFIJO}-CC-CAT2', cargo='Obrero', especialidad='Mamposteria'),
                 token=TOKEN['admin'])
assert estado == 201, f'el nombre sin tilde debe encontrarse en el catálogo: {estado} {r}'
assert r['trabajador']['especialidad'] == 'Mampostería', r['trabajador']
print('nombre sin tilde ->', estado, r['trabajador']['especialidad'])

# Un cargo que no está en el catálogo no se inventa: 400 señalando el campo.
estado, r = http('POST', '/api/trabajadores',
                 dict(BASE, numero_documento=f'{PREFIJO}-CC-CAT3', cargo='Astronauta'), token=TOKEN['admin'])
assert estado == 400 and r.get('campo') == 'cargo', f'cargo fuera del catálogo: {estado} {r}'
print('cargo fuera del catálogo ->', estado, r['error'])

# --- 4. La regla de HU-04 la decide el catálogo -----------------------------
estado, r = http('PATCH', f'{CARGOS}/{cargo_id}', {'descripcion': 'Cargo de prueba', 'operativo': False},
                 token=TOKEN['admin'])
assert estado == 200 and int(r['cargo']['operativo']) == 0, f'no se pudo editar: {estado} {r}'

estado, r = http('POST', '/api/trabajadores',
                 dict(BASE, numero_documento=f'{PREFIJO}-CC-CAT4', cargo_id=cargo_id), token=TOKEN['admin'])
assert estado == 201, f'al dejar de ser cargo de obra no debe exigir especialidad: {estado} {r}'
print('cargo sin marca de obra -> sin especialidad', estado)

# El listado informa en cuántos trabajadores está en uso (para el catálogo).
estado, lista = http('GET', CARGOS, token=TOKEN['admin'])
fila = next((c for c in lista if c['id'] == cargo_id), None)
assert fila is not None and int(fila['en_uso']) == 2, f'en_uso incorrecto: {fila}'
print('en uso ->', fila['en_uso'], 'trabajadores')

# --- 5. Eliminar es baja lógica (HU-18 · RN07) ------------------------------
estado, _ = http('PATCH', f'{CARGOS}/{cargo_id}/baja', token=TOKEN['admin'])
assert estado == 200, estado
assert not any(c['id'] == cargo_id for c in http('GET', CARGOS, token=TOKEN['admin'])[1]), \
    'un cargo dado de baja no debe ofrecerse en los formularios'
assert any(c['id'] == cargo_id for c in http('GET', CARGOS + '?incluirInactivos=1', token=TOKEN['admin'])[1]), \
    'el registro sigue en la base (baja lógica)'

estado, r = http('PATCH', f'{CARGOS}/{cargo_id}/baja', token=TOKEN['admin'])
assert estado == 409, f'dar de baja dos veces: {estado} {r}'

# Los trabajadores que ya lo usaban conservan el cargo.
estado, lista = http('GET', '/api/trabajadores', token=TOKEN['admin'])
assert any(x['cargo'] == NOMBRE_CARGO for x in lista), 'el trabajador perdió su cargo al dar de baja el catálogo'

estado, _ = http('PATCH', f'{CARGOS}/{cargo_id}/reactivar', token=TOKEN['admin'])
assert estado == 200, estado
assert any(c['id'] == cargo_id for c in http('GET', CARGOS, token=TOKEN['admin'])[1]), 'no se reactivó'
print('eliminar -> baja lógica reversible · 409 al repetir · el trabajador conserva el cargo')

# --- 6. Clientes desde Gestión Administrativa (editar y eliminar) ------------
documento = f'{PREFIJO}-NIT-CAT'
estado, r = http('POST', '/api/clientes',
                 {'numero_documento': documento, 'tipo_documento': 'NIT', 'razon_social_nombre': 'Cliente catálogo'},
                 token=TOKEN['admin'])
assert estado == 201, f'no se pudo crear el cliente: {estado} {r}'
cliente_id = r['cliente']['id']

estado, r = http('PATCH', f'/api/clientes/{cliente_id}', {'telefono': '3001234567'}, token=TOKEN['gerente'])
assert estado == 200 and r['cliente']['telefono'] == '3001234567', f'el gerente debe editar clientes: {estado} {r}'

estado, r = http('PATCH', f'/api/clientes/{cliente_id}',
                 {'nombre_contacto': 'Ana', 'direccion': 'Cúcuta'}, token=TOKEN['admin'])
assert estado == 200 and r['cliente']['nombre_contacto'] == 'Ana' \
    and r['cliente']['telefono'] == '3001234567', f'editar cliente: {estado} {r}'
print('editar cliente ->', estado, r['cliente']['nombre_contacto'], r['cliente']['telefono'])

estado, r = http('PATCH', f'/api/clientes/{cliente_id}', {'tipo_documento': 'XX'}, token=TOKEN['admin'])
assert estado == 400 and r.get('campo') == 'tipo_documento', f'tipo inválido: {estado} {r}'

estado, _ = http('PATCH', f'/api/clientes/{cliente_id}/baja', token=TOKEN['admin'])
assert estado == 200, estado
assert not any(c['id'] == cliente_id for c in http('GET', '/api/clientes', token=TOKEN['admin'])[1]), \
    'un cliente dado de baja no debe aparecer en el formulario de proyectos'
assert any(c['id'] == cliente_id for c in http('GET', '/api/clientes?incluirInactivos=1', token=TOKEN['admin'])[1])

estado, _ = http('PATCH', f'/api/clientes/{cliente_id}/reactivar', token=TOKEN['admin'])
assert estado == 200, estado
print('cliente -> editar 200 · tipo inválido 400 · baja/reactivación 200')

# --- 7. Todo queda en la bitácora (HU-17) -----------------------------------
for tabla, accion in (('cargos', 'CREAR'), ('cargos', 'ACTUALIZAR'), ('cargos', 'DAR_DE_BAJA'),
                      ('especialidades', 'CREAR'), ('clientes', 'ACTUALIZAR'), ('clientes', 'DAR_DE_BAJA')):
    n = scalar("SELECT COUNT(*) FROM bitacora_trazabilidad "
               f"WHERE tabla_afectada='{tabla}' AND accion='{accion}'")
    assert int(n) >= 1, f'falta el registro de {accion} en {tabla}'
print('bitácora -> crear/editar/dar de baja quedan registrados')

# --- Limpieza ---------------------------------------------------------------
limpiar()
sql(f"DELETE FROM trabajadores WHERE numero_documento LIKE '{PREFIJO}-%'")
sql(f"DELETE FROM cargos WHERE nombre LIKE '{PREFIJO}-%'")
sql(f"DELETE FROM especialidades WHERE nombre LIKE '{PREFIJO}-%'")
sql(f"DELETE FROM clientes WHERE numero_documento LIKE '{PREFIJO}-%'")
print('limpieza -> los registros de prueba no quedan en la base')

print('\nCatálogos: TODAS LAS PRUEBAS PASARON')
