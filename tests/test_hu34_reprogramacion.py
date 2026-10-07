# Prueba de HU-34: reprogramación de fechas en el plan de trabajo.
#
# Requiere el backend corriendo (puerto 3005) y la migración
# docs/migracion_reprogramacion_plan.sql aplicada. No usa navegador.
# Uso: python tests/test_hu34_reprogramacion.py
#
# Criterios de aceptación cubiertos (se amplía con cada criterio implementado):
#  1. las fechas originales se conservan inmutables desde la primera reprogramación.
#  2. cada reprogramación registra motivo obligatorio, usuario, fecha y fechas anterior/nueva.
from api_helper import http, login, limpiar, crear_proyecto, scalar, sql

limpiar()
admin = login('admin')
maestro = login('maestro')
proyecto_id = crear_proyecto(admin)  # 2026-10-01 a 2027-06-30
print('proyecto de prueba ->', proyecto_id)

estado, r = http('POST', '/api/etapas', {
    'proyecto_id': proyecto_id, 'nombre': 'TEST-Etapa reprogramable',
    'fecha_inicio_programada': '2026-10-01', 'fecha_fin_programada': '2026-12-01',
}, token=admin)
assert estado == 201, f'etapa: {estado} {r}'
etapa_id = r['etapa']['id']
assert r['etapa']['fecha_inicio_original'] is None, 'sin reprogramar no hay fecha original'

estado, r = http('POST', '/api/actividades', {
    'etapa_id': etapa_id, 'nombre': 'TEST-Actividad reprogramable',
    'fecha_inicio_programada': '2026-10-05', 'fecha_fin_programada': '2026-10-20',
}, token=admin)
assert estado == 201, f'actividad: {estado} {r}'
actividad_id = r['actividad']['id']


def reprogramar_etapa(inicio, fin, motivo='Lluvias', token=admin):
    return http('PATCH', f'/api/etapas/{etapa_id}/reprogramar', {
        'motivo': motivo, 'fecha_inicio_programada': inicio, 'fecha_fin_programada': fin,
    }, token=token)


# Criterio 2: el motivo es obligatorio y solo el administrador reprograma.
estado, r = reprogramar_etapa('2026-10-01', '2026-12-15', motivo='   ')
assert estado == 400 and r.get('campo') == 'motivo', f'sin motivo debia dar 400: {estado} {r}'
estado, r = reprogramar_etapa('2026-10-01', '2026-12-15', token=maestro)
assert estado == 403, f'el maestro de obra no reprograma: {estado} {r}'
print('motivo obligatorio y permiso solo ADMIN -> ok')

# Criterio 1: primera reprogramación fija el original; la vigente cambia.
estado, r = reprogramar_etapa('2026-10-01', '2026-12-15')
assert estado == 200, f'reprogramar etapa: {estado} {r}'
e = r['etapa']
assert e['fecha_fin_programada'] == '2026-12-15', 'el cronograma vigente usa la fecha nueva'
assert e['fecha_inicio_original'] == '2026-10-01' and e['fecha_fin_original'] == '2026-12-01', \
    f'original de la primera programación: {e}'

# Segunda reprogramación: el original no se mueve.
estado, r = reprogramar_etapa('2026-10-01', '2027-01-10', motivo='Falta de material')
assert estado == 200, f'segunda reprogramacion: {estado} {r}'
assert r['etapa']['fecha_fin_original'] == '2026-12-01', 'el original es inmutable'
assert r['etapa']['fecha_fin_programada'] == '2027-01-10'

# Ni siquiera con acceso directo a la base (disparador).
sql(f"UPDATE etapas_proyecto SET fecha_fin_original = '2030-01-01' WHERE id = {etapa_id}")
assert scalar(f"SELECT fecha_fin_original FROM etapas_proyecto WHERE id = {etapa_id}") == '2026-12-01', \
    'el disparador debe restaurar la fecha original'
print('fechas originales inmutables (etapa) -> ok')

# Lo mismo para la actividad.
estado, r = http('PATCH', f'/api/actividades/{actividad_id}/reprogramar', {
    'motivo': 'Retraso del proveedor', 'fecha_inicio_programada': '2026-10-10',
    'fecha_fin_programada': '2026-10-30',
}, token=admin)
assert estado == 200, f'reprogramar actividad: {estado} {r}'
a = r['actividad']
assert a['fecha_inicio_original'] == '2026-10-05' and a['fecha_fin_original'] == '2026-10-20'
assert a['fecha_inicio_programada'] == '2026-10-10' and a['fecha_fin_programada'] == '2026-10-30'
print('fechas originales (actividad) -> ok')

# Criterio 2: historial con motivo, usuario, fecha y fechas anterior/nueva.
estado, h = http('GET', f'/api/etapas/{etapa_id}/reprogramaciones', token=admin)
assert estado == 200 and len(h) == 2, f'dos reprogramaciones registradas: {estado} {h}'
ultima, primera = h[0], h[1]
assert primera['motivo'] == 'Lluvias' and ultima['motivo'] == 'Falta de material'
assert primera['usuario_nombre'] == 'admin' and primera['fecha_registro']
assert primera['fecha_fin_anterior'] == '2026-12-01' and primera['fecha_fin_nueva'] == '2026-12-15'
assert ultima['fecha_fin_anterior'] == '2026-12-15' and ultima['fecha_fin_nueva'] == '2027-01-10'
estado, h = http('GET', f'/api/actividades/{actividad_id}/reprogramaciones', token=admin)
assert estado == 200 and len(h) == 1 and h[0]['motivo'] == 'Retraso del proveedor'
print('historial de reprogramaciones -> ok')

# El historial es inmutable.
r = sql(f"DELETE FROM reprogramaciones_plan WHERE entidad_id = {etapa_id}")
assert r.returncode != 0, 'el historial no se puede borrar'

limpiar()
print('HU-34 criterios 1 y 2: OK')
