# Prueba de HU-34: reprogramación de fechas en el plan de trabajo.
#
# Requiere el backend corriendo (puerto 3005) y la migración
# docs/migracion_reprogramacion_plan.sql aplicada. No usa navegador.
# Uso: python tests/test_hu34_reprogramacion.py
#
# Criterios de aceptación cubiertos (se amplía con cada criterio implementado):
#  1. las fechas originales se conservan inmutables desde la primera reprogramación.
#  2. cada reprogramación registra motivo obligatorio, usuario, fecha y fechas anterior/nueva.
#  3. al reprogramar una etapa se recalculan las posteriores, en orden y sin solapes.
#  4. si el recálculo excede el fin del proyecto: advertencia, confirmación y fin reprogramado.
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


# Criterio 3: el recálculo mantiene el orden, sin solapes (desplazamiento rígido).
def crear_etapa(nombre, inicio, fin):
    estado, r = http('POST', '/api/etapas', {
        'proyecto_id': proyecto_id, 'nombre': nombre,
        'fecha_inicio_programada': inicio, 'fecha_fin_programada': fin,
    }, token=admin)
    assert estado == 201, f'{nombre}: {estado} {r}'
    return r['etapa']['id']


etapa_b = crear_etapa('TEST-Etapa B', '2027-01-15', '2027-02-15')
etapa_c = crear_etapa('TEST-Etapa C', '2027-03-01', '2027-03-31')
estado, r = http('POST', '/api/actividades', {
    'etapa_id': etapa_b, 'nombre': 'TEST-Actividad de B',
    'fecha_inicio_programada': '2027-01-20', 'fecha_fin_programada': '2027-02-10',
}, token=admin)
assert estado == 201, f'actividad de B: {estado} {r}'
actividad_b = r['actividad']['id']

# La etapa A pasa a terminar el 25-ene: choca con B (15-ene) -> B y C se corren 11 días.
estado, r = reprogramar_etapa('2026-10-01', '2027-01-25', motivo='Cambio de diseno')
assert estado == 200, f'cascada: {estado} {r}'
movidas = {m['id']: m for m in r['etapas_desplazadas']}
assert set(movidas) == {etapa_b, etapa_c}, f'B y C se desplazan: {r["etapas_desplazadas"]}'
assert movidas[etapa_b]['fecha_inicio_nueva'] == '2027-01-26' and movidas[etapa_b]['fecha_fin_nueva'] == '2027-02-26'
assert movidas[etapa_c]['fecha_inicio_nueva'] == '2027-03-12' and movidas[etapa_c]['fecha_fin_nueva'] == '2027-04-11',     'C conserva su duracion y su hueco con B'
assert r['actividades_desplazadas'] == 1
estado, acts = http('GET', f'/api/actividades?etapa_id={etapa_b}', token=admin)
assert acts[0]['fecha_inicio_programada'] == '2027-01-31' and acts[0]['fecha_fin_programada'] == '2027-02-21'
assert acts[0]['fecha_inicio_original'] == '2027-01-20', 'la actividad movida conserva su original'
estado, etapas = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=admin)
assert [e['id'] for e in etapas] == [etapa_id, etapa_b, etapa_c], 'el orden se mantiene'
for anterior, siguiente in zip(etapas, etapas[1:]):
    assert anterior['fecha_fin_programada'] < siguiente['fecha_inicio_programada'], 'sin solapamientos'
assert etapas[1]['fecha_inicio_original'] == '2027-01-15' and etapas[2]['fecha_fin_original'] == '2027-03-31'
estado, h = http('GET', f'/api/etapas/{etapa_b}/reprogramaciones', token=admin)
assert h[0]['origen'] == 'CASCADA' and h[0]['motivo'] == 'Cambio de diseno'
print('cascada de etapas posteriores -> ok')

# Sin choque no se mueve nada.
estado, r = reprogramar_etapa('2026-10-01', '2027-01-20', motivo='Se recupera tiempo')
assert estado == 200 and r['etapas_desplazadas'] == [], f'sin choque no hay cascada: {r}'

# La etapa no puede invadir a la anterior.
estado, r = http('PATCH', f'/api/etapas/{etapa_b}/reprogramar', {
    'motivo': 'Adelantar', 'fecha_inicio_programada': '2027-01-10',
    'fecha_fin_programada': '2027-02-26',
}, token=admin)
assert estado == 400, f'B no puede empezar antes de que termine A: {estado} {r}'

print('criterio 3 ok')

# Criterio 4: si el recálculo excede el fin del proyecto (30-jun-2027) se advierte
# y se exige confirmación explícita; no se aplica nada sin ella.
estado, r = reprogramar_etapa('2026-10-01', '2027-06-01', motivo='Muy largo')
assert estado == 409 and r.get('codigo') == 'REQUIERE_CONFIRMACION', f'debia advertir: {estado} {r}'
assert r['fin_proyecto_actual'] == '2027-06-30' and r['fin_proyecto_nuevo'] > '2027-06-30'
assert scalar(f"SELECT fecha_fin_programada FROM etapas_proyecto WHERE id = {etapa_c}") == '2027-04-11',     'sin confirmar no se cambia nada (C conserva la fecha vigente anterior)'
assert scalar(f"SELECT fecha_fin_programada FROM proyectos WHERE id = {proyecto_id}") == '2027-06-30'
print('advertencia al exceder el proyecto -> ok')

# Confirmado: el fin del proyecto también se reprograma y conserva el original.
estado, r = http('PATCH', f'/api/etapas/{etapa_id}/reprogramar', {
    'motivo': 'Muy largo', 'fecha_inicio_programada': '2026-10-01',
    'fecha_fin_programada': '2027-06-01', 'confirmar': True,
}, token=admin)
assert estado == 200, f'confirmado debia aplicarse: {estado} {r}'
nuevo_fin = r['proyecto']['fecha_fin_programada']
assert nuevo_fin > '2027-06-30' and nuevo_fin == scalar(f"SELECT MAX(fecha_fin_programada) FROM etapas_proyecto WHERE proyecto_id = {proyecto_id}")
assert r['proyecto']['fecha_fin_original'] == '2027-06-30', 'se conserva el fin original del proyecto'
assert r['proyecto']['fecha_inicio_original'] == '2026-10-01'
filas = scalar(f"SELECT COUNT(*) FROM reprogramaciones_plan WHERE entidad_tipo = 'PROYECTO' AND entidad_id = {proyecto_id} AND origen = 'FIN_PROYECTO'")
assert filas == '1', 'el cambio del fin del proyecto queda en el historial'
print('criterio 4 ok')

limpiar()
print('HU-34 criterios 1 a 4: OK')
