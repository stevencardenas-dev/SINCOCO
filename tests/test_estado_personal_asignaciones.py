# Prueba: pasar a vacaciones o licencia a personal con asignaciones vigentes.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_estado_personal_asignaciones.py
#
# Regla (mejora de HU-04): no se bloquea, pero exige confirmación explícita y
# el servidor informa a qué proyectos y actividades afecta. Las asignaciones
# no se modifican.
#  1. sin asignaciones vigentes el cambio de estado es directo.
#  2. con asignaciones vigentes responde 409 REQUIERE_CONFIRMACION con el detalle.
#  3. con confirmar=true el estado cambia y las asignaciones siguen ACTIVAS.
#  4. lo mismo aplica a la edición del trabajador (PATCH /api/trabajadores/:id).
#  5. volver a Activo no pide confirmación.
from api_helper import http, login, limpiar, crear_proyecto, crear_trabajador, PREFIJO, scalar

limpiar()
admin = login('admin')
proyecto_id = crear_proyecto(admin)
libre = crear_trabajador(admin, f'{PREFIJO}-CC-EST1')
asignado = crear_trabajador(admin, f'{PREFIJO}-CC-EST2')
editado = crear_trabajador(admin, f'{PREFIJO}-CC-EST3')

for trabajador_id in (asignado, editado):
    estado, r = http('POST', '/api/asignaciones', {
        'trabajador_id': trabajador_id, 'proyecto_id': proyecto_id,
        'fecha_inicio': '2026-10-10', 'fecha_fin_programada': '2026-12-20',
    }, token=admin)
    assert estado == 201, f'asignar: {estado} {r}'

# 1. Sin asignaciones vigentes: directo.
estado, r = http('PATCH', f'/api/trabajadores/{libre}/estado', {'estado': 'VACACIONES'}, token=admin)
assert estado == 200 and r['trabajador']['estado'] == 'VACACIONES', f'sin asignaciones: {estado} {r}'
print('sin asignaciones -> cambio directo')

# 2. Con asignaciones vigentes: pide confirmación y no cambia nada.
estado, r = http('PATCH', f'/api/trabajadores/{asignado}/estado', {'estado': 'LICENCIA'}, token=admin)
assert estado == 409 and r.get('codigo') == 'REQUIERE_CONFIRMACION', f'esperaba 409: {estado} {r}'
assert len(r['compromisos']) == 1 and r['compromisos'][0]['codigo'] == f'{PREFIJO}-PRJ-01', r
assert scalar(f"SELECT estado FROM trabajadores WHERE id={asignado}") == 'ACTIVO', 'sin confirmar no cambia'
print('con asignaciones -> 409 con el detalle')

# 3. Confirmado: cambia y la asignación sigue vigente.
estado, r = http('PATCH', f'/api/trabajadores/{asignado}/estado', {'estado': 'LICENCIA', 'confirmar': True}, token=admin)
assert estado == 200 and r['trabajador']['estado'] == 'LICENCIA', f'confirmado: {estado} {r}'
assert scalar(f"SELECT COUNT(*) FROM asignaciones_personal WHERE trabajador_id={asignado} AND estado='ACTIVO'") == '1', \
    'la asignacion no se modifica'
print('confirmado -> cambia y la asignación sigue ACTIVA')

# 4. Edición del trabajador: misma regla.
estado, r = http('PATCH', f'/api/trabajadores/{editado}', {'estado': 'VACACIONES'}, token=admin)
assert estado == 409 and r.get('codigo') == 'REQUIERE_CONFIRMACION', f'edicion sin confirmar: {estado} {r}'
estado, r = http('PATCH', f'/api/trabajadores/{editado}', {'estado': 'VACACIONES', 'confirmar': True}, token=admin)
assert estado == 200 and r['trabajador']['estado'] == 'VACACIONES', f'edicion confirmada: {estado} {r}'
print('edición -> misma regla')

# 5. Volver a Activo no pide confirmación.
estado, r = http('PATCH', f'/api/trabajadores/{asignado}/estado', {'estado': 'ACTIVO'}, token=admin)
assert estado == 200 and r['trabajador']['estado'] == 'ACTIVO', f'volver a activo: {estado} {r}'
print('volver a Activo -> directo')

limpiar()
print('OK: estado del personal con asignaciones')
