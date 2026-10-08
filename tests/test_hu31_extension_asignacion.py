# Prueba de HU-31 (AYD-45): extensión o prórroga de asignación de personal.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu31_extension_asignacion.py
#
# Criterios: 1) solo asignaciones vigentes · 2) fecha posterior a la vigente y
# dentro de la actividad y el proyecto · 3) evento propio con motivo obligatorio
# sin perder la fecha original · 4) sin sobreasignación · 5) historial con la fecha
# original y cada extensión · 6) bitácora.
from api_helper import http, login, limpiar, scalar, crear_proyecto, crear_trabajador, PREFIJO

limpiar()
admin, maestro = login('admin'), login('maestro')
proyecto = crear_proyecto(admin)          # 2026-10-01 -> 2027-06-30
w1 = crear_trabajador(admin, f'{PREFIJO}-CC-31A')
w2 = crear_trabajador(admin, f'{PREFIJO}-CC-31B')

_, r = http('POST', '/api/etapas', {'proyecto_id': proyecto, 'nombre': 'TEST-Etapa 31',
            'fecha_inicio_programada': '2026-10-01', 'fecha_fin_programada': '2026-12-01'}, token=admin)
_, r = http('POST', '/api/actividades', {'etapa_id': r['etapa']['id'], 'nombre': 'TEST-Actividad 31',
            'fecha_inicio_programada': '2026-10-05', 'fecha_fin_programada': '2026-11-05',
            'responsable_id': w2}, token=admin)
actividad = r['actividad']['id']


def asignar(trabajador, inicio, fin, actividad_id=None):
    estado, r = http('POST', '/api/asignaciones', {'trabajador_id': trabajador, 'proyecto_id': proyecto,
                     'actividad_id': actividad_id, 'fecha_inicio': inicio, 'fecha_fin_programada': fin}, token=admin)
    assert estado == 201, r
    return r['asignacion']['id']


def extender(id, fecha, motivo='El trabajo requiere más tiempo', token=admin):
    return http('POST', f'/api/asignaciones/{id}/extender', {'fecha_fin_programada': fecha, 'motivo': motivo}, token=token)


a = asignar(w1, '2026-10-05', '2026-10-20', actividad)
otra = asignar(w1, '2026-11-01', '2026-11-30')          # otra asignación activa de w1
c = asignar(w2, '2026-10-05', '2027-06-01')              # a todo el proyecto

# RBAC: solo quien gestiona el acceso extiende.
assert extender(a, '2026-10-30', token=maestro)[0] == 403

# Criterio 3: el motivo es obligatorio.
estado, r = extender(a, '2026-10-30', motivo='  ')
assert estado == 400 and r.get('campo') == 'motivo', (estado, r)

# Alt. 2 / criterio 2: no posterior, fecha inválida, fuera de la actividad o del proyecto.
for fecha in ('2026-10-20', '2026-10-10', 'pronto'):
    assert extender(a, fecha)[0] == 400, f'{fecha} debe rechazarse'
estado, r = extender(a, '2026-11-06')
assert estado == 400 and '2026-11-05' in r['error'], f'debe indicar el límite de la actividad: {r}'
estado, r = extender(c, '2027-07-01')
assert estado == 400 and '2027-06-30' in r['error'], f'debe indicar el límite del proyecto: {r}'

# Alt. 1 / criterio 4: se cruza con la otra asignación activa de w1 -> no se guarda.
estado, r = extender(a, '2026-11-03')
assert estado == 409 and 'obreasignación' in r['error'], (estado, r)
assert scalar(f"SELECT DATE_FORMAT(fecha_fin_programada,'%Y-%m-%d') FROM asignaciones_personal WHERE id={a}") == '2026-10-20'
assert scalar(f'SELECT COUNT(*) FROM extensiones_asignacion WHERE asignacion_id={a}') == '0'

# Escenario principal: extensión válida, dos veces; la fecha original se conserva.
estado, r = extender(a, '2026-10-30')
assert estado == 201 and r['asignacion']['fecha_fin_programada'][:10] == '2026-10-30', r
estado, r = extender(a, '2026-10-31', motivo='Segunda prórroga')
assert estado == 201, r
assert r['fecha_fin_original'] == '2026-10-20', r['fecha_fin_original']
ext = r['extensiones']
assert [(e['fecha_fin_anterior'][:10], e['fecha_fin_nueva'][:10]) for e in ext] == \
    [('2026-10-20', '2026-10-30'), ('2026-10-30', '2026-10-31')], ext
assert ext[0]['motivo'] == 'El trabajo requiere más tiempo' and ext[0]['usuario'] == 'admin' and ext[0]['fecha_registro']
estado, h = http('GET', f'/api/asignaciones/{a}/historial', token=admin)
assert estado == 200 and h['fecha_fin_original'] == '2026-10-20' and len(h['extensiones']) == 2

# Criterio 6: bitácora.
assert scalar(f"SELECT COUNT(*) FROM bitacora_trazabilidad WHERE accion='EXTENDER' AND tabla_afectada='asignaciones_personal' AND registro_id={a}") == '2'

# Alt. 3 / criterio 1: una asignación cerrada no se extiende.
assert http('PATCH', f'/api/asignaciones/{a}', {'estado': 'FINALIZADO'}, token=admin)[0] == 200
estado, r = extender(a, '2026-11-02')
assert estado == 409 and 'nueva asignación' in r['error'], (estado, r)
assert extender(999999, '2026-11-02')[0] == 404

limpiar()
print('HU-31 OK')
