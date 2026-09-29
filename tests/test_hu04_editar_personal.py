# Prueba de HU-04 (RF06 · CU-04): editar los datos del personal.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu04_editar_personal.py
#
# La pantalla de HU-04 registra personal, pero la API también expone
# PATCH /api/trabajadores/:id y esta suite es la red de seguridad de ese
# endpoint, que ninguna otra prueba cubre:
#  - cambio de cargo a operativo re-valida la especialidad (criterio 2),
#  - el correo sigue siendo unico (UNIQUE del esquema) y excluye al propio id,
#  - campos sensibles (numero_documento, activo, id) se ignoran,
#  - 404 para id inexistente y 400 sin campos que actualizar,
#  - RBAC: GERENTE lista el personal pero no puede editarlo.
from api_helper import http, login, limpiar, scalar, PREFIJO

limpiar()
admin = login('admin')

DOCUMENTO = f'{PREFIJO}-CC-200'
NUEVO_DOCUMENTO = f'{PREFIJO}-CC-299'
EMAIL_DUPLICADO = 'sprint.h4.edita@sincoco.test'

# --- Preparación: dos trabajadores activos -----------------------------------
estado, r = http('POST', '/api/trabajadores', {
    'numero_documento': DOCUMENTO, 'tipo_documento': 'CC',
    'nombres': 'Diana', 'apellidos': 'Editable', 'cargo': 'Asistente administrativo',
    'email': 'diana.edita@sincoco.test',
}, token=admin)
assert estado == 201, f'preparacion trabajador 1: {estado} {r}'
id_trabajador = r['trabajador']['id']
print('preparar -> trabajador', id_trabajador, DOCUMENTO)

estado, r = http('POST', '/api/trabajadores', {
    'numero_documento': f'{PREFIJO}-CC-201', 'tipo_documento': 'CC',
    'nombres': 'Elena', 'apellidos': 'Rival', 'cargo': 'Asistente administrativo',
    'email': EMAIL_DUPLICADO,
}, token=admin)
assert estado == 201, f'preparacion trabajador 2: {estado} {r}'

# --- Edición basica: cambio de nombres y telefono ----------------------------
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'nombres': 'Diana Carolina', 'telefono': '3105550000',
}, token=admin)
assert estado == 200, f'edicion basica debia dar 200, llego {estado}: {r}'
t = r['trabajador']
assert t['nombres'] == 'Diana Carolina', f'nombres no editado: {t}'
assert t['telefono'] == '3105550000', f'telefono no editado: {t}'
assert t['email'] == 'diana.edita@sincoco.test', 'la edicion no debe tocar campos no enviados'
print('edicion parcial ->', estado, t['nombres'], '/', t['telefono'])

# --- Criterio 2 en edicion: cargo operativo sin especialidad -> 400 ----------
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'cargo': 'Obrero',
}, token=admin)
assert estado == 400, f'cargo operativo sin especialidad debia dar 400, llego {estado}: {r}'
assert r.get('campo') == 'especialidad', f'debe senalar especialidad: {r}'
print('operativo sin especialidad ->', estado, r['error'])

# El cargo no queda cambiado: el PATCH fallo y no debe dejar estados a medias.
estado, r = http('GET', f'/api/trabajadores/{id_trabajador}', token=admin)
assert r['cargo'] == 'Asistente administrativo', f'el cargo no debio cambiar: {r}'

# --- Criterio 2 en edicion: con especialidad el cambio procede ---------------
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'cargo': 'Obrero', 'especialidad': 'Mamposteria',
}, token=admin)
assert estado == 200, f'cargo operativo con especialidad debia dar 200, llego {estado}: {r}'
assert r['trabajador']['cargo'] == 'Obrero'
assert r['trabajador']['especialidad'] == 'Mamposteria'
print('operativo con especialidad ->', estado, r['trabajador']['cargo'])

# Y a la inversa: quitar la especialidad a un cargo que ya es operativo -> 400
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'especialidad': '',
}, token=admin)
assert estado == 400, f'quitar especialidad a operativo debia dar 400, llego {estado}: {r}'
assert r.get('campo') == 'especialidad'
print('quitar especialidad a operativo ->', estado)

# --- Correo unico en edicion: choca con OTRO trabajador -> 409 ---------------
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'email': EMAIL_DUPLICADO,
}, token=admin)
assert estado == 409, f'correo duplicado debia dar 409, llego {estado}: {r}'
assert r.get('campo') == 'email', f'debe senalar email: {r}'
print('correo duplicado ->', estado, r['error'])

# ...pero dejarse el MISMO correo es valido (exclusion del propio id).
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'email': 'diana.edita@sincoco.test',
}, token=admin)
assert estado == 200, f'mismo correo debia dar 200, llego {estado}: {r}'
print('mismo correo ->', estado)

# Email vacio se guarda como NULL (borrar el correo es posible).
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {'email': ''}, token=admin)
assert estado == 200, f'borrar correo debia dar 200, llego {estado}: {r}'
assert r['trabajador']['email'] is None, f'email vacio debia quedar null: {r}'
print('email vacio -> NULL')

# --- Campos sensibles: se ignoran, no se aplican -----------------------------
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {
    'numero_documento': NUEVO_DOCUMENTO,
    'activo': 0,
    'id': 999999,
    'nombres': 'Diana Carolina',
}, token=admin)
assert estado == 200, f'edicion con campos prohibidos debia dar 200, llego {estado}: {r}'
assert r['trabajador']['numero_documento'] == DOCUMENTO, \
    f'numero_documento debe ser inmutable via PATCH: {r["trabajador"]}'
assert int(r['trabajador']['activo']) == 1, f'activo no debe poder cambiarse: {r["trabajador"]}'
assert r['trabajador']['id'] != 999999, 'id no debe poder reescribirse'
assert scalar(f"SELECT numero_documento FROM trabajadores WHERE id={id_trabajador}") == DOCUMENTO, \
    'la base no debe haber cambiado de documento'
print('campos ignorados -> documento/activo/id intactos')

# --- 404: id inexistente ------------------------------------------------------
estado, r = http('PATCH', '/api/trabajadores/999999', {'nombres': 'Nadie'}, token=admin)
assert estado == 404, f'id inexistente debia dar 404, llego {estado}: {r}'
estado, r = http('GET', '/api/trabajadores/999999', token=admin)
assert estado == 404, f'GET de id inexistente debia dar 404, llego {estado}: {r}'
print('id inexistente -> 404 en PATCH y GET')

# --- 400: sin campos que actualizar ------------------------------------------
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {}, token=admin)
assert estado == 400, f'body vacio debia dar 400, llego {estado}: {r}'
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {'correo': 'no.existe@x.test'}, token=admin)
assert estado == 400, f'solo campos desconocidos debia dar 400, llego {estado}: {r}'
print('sin cambios -> 400')

# --- RBAC: GERENCE lista el personal pero no puede editarlo -------------------
gerente = login('gerente')
estado, r = http('GET', '/api/trabajadores', token=gerente)
assert estado == 200, f'gerente debe poder listar personal: {estado} {r}'
estado, r = http('PATCH', f'/api/trabajadores/{id_trabajador}', {'nombres': 'Pirata'}, token=gerente)
assert estado == 403, f'gerente editando personal debia dar 403, llego {estado}: {r}'
print('rbac -> gerente lista (200) pero no edita (403)')

limpiar()
print('\nHU-04 (edicion): TODAS LAS PRUEBAS PASARON')
