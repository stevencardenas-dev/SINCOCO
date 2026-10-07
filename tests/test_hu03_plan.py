# Prueba de HU-03 (RF03 · RF04): etapas y actividades del plan de trabajo.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu03_plan.py
#
# Verifica los criterios de docs/reglas-de-negocio/HU_CRITERIOS_ACEPTACION.md (HU-03):
#  1. la actividad pertenece a una etapa existente; la etapa a un proyecto existente.
#  2. las etapas tienen un orden que el sistema calcula por fecha de inicio, y no se solapan.
#  3. las fechas de etapas y actividades quedan dentro del rango del proyecto.
#  4. la actividad admite responsable y descripción.
#  5. el estado inicial de etapas y actividades es PENDIENTE.
from api_helper import http, login, limpiar, crear_proyecto, crear_trabajador, PREFIJO, scalar

limpiar()
admin = login('admin')
proyecto_id = crear_proyecto(admin)
print('proyecto de prueba ->', proyecto_id)

# Criterio 5 + 2: etapa con estado PENDIENTE y orden asignado.
etapa = {
    'proyecto_id': proyecto_id, 'nombre': 'TEST-Etapa cimentacion',
    'fecha_inicio_programada': '2026-10-01', 'fecha_fin_programada': '2026-12-01',
}
estado, r = http('POST', '/api/etapas', etapa, token=admin)
assert estado == 201, f'se esperaba 201, llego {estado}: {r}'
e = r['etapa']
assert e['estado'] == 'PENDIENTE', 'criterio 5: estado inicial PENDIENTE'
assert e['orden'] == 1, f'criterio 2: primer orden debe ser 1, llego {e["orden"]}'
etapa_id = e['id']
print('crear etapa ->', estado, 'orden', e['orden'], e['estado'])

# Criterio 2: el orden lo calcula el sistema; un orden enviado se ignora.
estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa orden ignorado', orden=7,
                                             fecha_inicio_programada='2026-06-01',
                                             fecha_fin_programada='2026-06-30'), token=admin)
assert estado == 400, f'fuera del rango del proyecto debia dar 400, llego {estado}: {r}'

estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa posterior', orden=1,
                                             fecha_inicio_programada='2027-01-01',
                                             fecha_fin_programada='2027-02-01'), token=admin)
assert estado == 201, f'etapa posterior: {estado} {r}'
assert r['etapa']['orden'] == 2, f'el orden lo fija la fecha, llego {r["etapa"]["orden"]}'
posterior_id = r['etapa']['id']

estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa intermedia',
                                             fecha_inicio_programada='2026-12-15',
                                             fecha_fin_programada='2026-12-31'), token=admin)
assert estado == 201, f'etapa intermedia: {estado} {r}'
assert r['etapa']['orden'] == 2, 'la intermedia pasa a ser la segunda'
estado, r = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=admin)
orden = {x['id']: x['orden'] for x in r}
assert orden[posterior_id] == 3, f'la posterior se renumera a 3: {orden}'
print('orden automatico por fecha ->', sorted(orden.values()))

# Las etapas no pueden solaparse (ni compartir un solo dia).
for inicio, fin in (('2026-10-01', '2026-12-01'), ('2026-11-15', '2026-12-20'), ('2026-12-01', '2026-12-14')):
    estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa solapada',
                                                 fecha_inicio_programada=inicio,
                                                 fecha_fin_programada=fin), token=admin)
    assert estado == 400, f'{inicio}..{fin} se solapa y debia dar 400: {estado} {r}'
print('etapas solapadas -> 400')

# Las fechas son obligatorias: sin ellas no se puede ordenar ni validar el solape.
estado, r = http('POST', '/api/etapas', {'proyecto_id': proyecto_id, 'nombre': 'TEST-Etapa sin fechas'},
                 token=admin)
assert estado == 400, f'etapa sin fechas debia dar 400, llego {estado}: {r}'

# Criterio 3: fecha fuera del rango del proyecto -> 400.
estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa fuera',
                                             fecha_inicio_programada='2099-01-01'), token=admin)
assert estado == 400, f'se esperaba 400 por fecha, llego {estado}: {r}'
print('etapa fuera de rango ->', estado, r['error'])

# Criterio 1: proyecto inexistente -> 404.
estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa sin proyecto',
                                             proyecto_id=999999), token=admin)
assert estado == 404, f'se esperaba 404 por proyecto, llego {estado}: {r}'
print('etapa sin proyecto ->', estado, r['error'])

# Criterio 4 + 5: actividad con responsable y estado PENDIENTE.
responsable_id = crear_trabajador(admin, f'{PREFIJO}-CC-PLAN')
actividad = {
    'etapa_id': etapa_id, 'nombre': 'TEST-Actividad vaciado',
    'fecha_inicio_programada': '2026-10-05', 'fecha_fin_programada': '2026-11-05',
    'responsable_id': responsable_id, 'descripcion': 'Vaciado y nivelacion',
}
estado, r = http('POST', '/api/actividades', actividad, token=admin)
assert estado == 201, f'se esperaba 201, llego {estado}: {r}'
a = r['actividad']
assert a['estado'] == 'PENDIENTE', 'criterio 5: estado inicial PENDIENTE'
assert a['responsable_id'] == responsable_id, 'criterio 4: debe conservar el responsable'
assert a['descripcion'] == 'Vaciado y nivelacion', 'criterio 4: debe conservar la descripcion'
print('crear actividad ->', estado, a['estado'], 'responsable', a['responsable_id'])

# Las fechas de la actividad quedan limitadas por las de su etapa (2026-10-01 a 2026-12-01).
estado, r = http('POST', '/api/actividades', dict(actividad, nombre='TEST-Actividad fuera de etapa',
                                                  fecha_fin_programada='2026-12-20'), token=admin)
assert estado == 400 and r.get('campo') == 'fecha_fin_programada', \
    f'actividad fuera de su etapa debia dar 400: {estado} {r}'
print('actividad fuera de su etapa ->', estado, r['error'])

# Edicion: etapa y actividad se editan; las reglas de fechas se mantienen.
estado, r = http('PATCH', f'/api/actividades/{a["id"]}', {'nombre': 'TEST-Actividad editada',
                                                           'descripcion': 'Nueva descripcion'}, token=admin)
assert estado == 200 and r['actividad']['nombre'] == 'TEST-Actividad editada', f'editar actividad: {estado} {r}'
estado, r = http('PATCH', f'/api/actividades/{a["id"]}', {'fecha_fin_programada': '2026-12-20'}, token=admin)
assert estado == 400, f'editar actividad fuera de su etapa debia dar 400: {estado} {r}'
estado, r = http('PATCH', f'/api/etapas/{etapa_id}', {'fecha_fin_programada': '2026-10-20'}, token=admin)
assert estado == 400 and 'actividad' in r['error'].lower(), \
    f'acortar la etapa dejaria la actividad fuera: {estado} {r}'
estado, r = http('PATCH', f'/api/etapas/{etapa_id}', {'fecha_fin_programada': '2026-12-20'}, token=admin)
assert estado == 400, f'la etapa se solaparia con la intermedia: {estado} {r}'
estado, r = http('PATCH', f'/api/etapas/{etapa_id}', {'nombre': 'TEST-Etapa cimentacion editada'}, token=admin)
assert estado == 200 and r['etapa']['nombre'] == 'TEST-Etapa cimentacion editada', f'editar etapa: {estado} {r}'
estado, r = http('PATCH', f'/api/etapas/{etapa_id}', {}, token=admin)
assert estado == 400, f'PATCH vacio debia dar 400: {estado} {r}'
print('edicion de etapa y actividad -> OK')

# Criterio 1: etapa inexistente -> 404.
estado, r = http('POST', '/api/actividades', dict(actividad, etapa_id=999999), token=admin)
assert estado == 404, f'se esperaba 404 por etapa, llego {estado}: {r}'
print('actividad sin etapa ->', estado, r['error'])

# Criterio 3: fecha de la actividad fuera del rango del proyecto -> 400.
estado, r = http('POST', '/api/actividades', dict(actividad, nombre='TEST-Actividad fuera',
                                                  fecha_fin_programada='2099-01-01'), token=admin)
assert estado == 400, f'se esperaba 400 por fecha, llego {estado}: {r}'
print('actividad fuera de rango ->', estado, r['error'])

# RBAC: el maestro de obra consulta el plan del proyecto al que está asignado,
# pero solo el líder del proyecto, el gerente y el administrador lo modifican. El acceso a proyectos y actividades se administra con
# asignaciones_personal: sin asignación vigente el plan no se consulta.
maestro = login('maestro')
trabajador_maestro = int(scalar("SELECT trabajador_id FROM usuarios WHERE username='maestro'"))

estado, r = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=maestro)
assert estado == 403, f'sin asignación vigente el plan no se consulta, llego {estado}'
print('maestro sin asignación ->', estado, r['error'])
# Tiene el permiso etapas.crear, pero sin asignación vigente no actúa sobre el proyecto.
estado, r = http('POST', '/api/etapas', etapa, token=maestro)
assert estado == 403, f'sin asignación el maestro no define etapas, llego {estado}: {r}'

estado, r = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2026-10-01', 'observaciones': 'Maestro de obra',
}, token=admin)
assert estado == 201, f'asignar al maestro: {estado} {r}'

estado, _ = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=maestro)
assert estado == 200, f'el maestro asignado debe poder listar etapas, llego {estado}'
# Asignado, pero no líder del proyecto: consulta el plan sin modificarlo.
estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa del maestro',
                                             fecha_inicio_programada='2027-03-01',
                                             fecha_fin_programada='2027-04-01'), token=maestro)
assert estado == 403, f'el asignado que no es líder no define etapas, llego {estado}: {r}'
print('maestro asignado ->', 'GET 200 / POST 403 OK')

# Estados de ejecucion: Empezar (En curso) y Finalizar (Finalizado).
estado, r = http('PATCH', f'/api/actividades/{a["id"]}/finalizar', token=admin)
assert estado == 409, f'no se finaliza una actividad pendiente, llego {estado}: {r}'
estado, r = http('PATCH', f'/api/actividades/{a["id"]}/iniciar', token=maestro)
assert estado == 403, f'el asignado al proyecto (no a la actividad) no la cambia, llego {estado}: {r}'
estado, r = http('PATCH', f'/api/actividades/{a["id"]}/iniciar', token=admin)
assert estado == 200 and r['actividad']['estado'] == 'EN_PROCESO' and r['actividad']['fecha_inicio_real'], f'empezar: {estado} {r}'
estado, r = http('PATCH', f'/api/actividades/{a["id"]}/iniciar', token=admin)
assert estado == 409, f'no se empieza dos veces, llego {estado}'
estado, r = http('PATCH', f'/api/actividades/{a["id"]}/finalizar', token=admin)
assert estado == 200 and r['actividad']['estado'] == 'COMPLETADA' and float(r['actividad']['porcentaje_avance']) == 100, f'finalizar: {estado} {r}'
print('estados -> empezar 200 · finalizar 200 · repetir 409 · asignado ajeno 403')

# Listados: la etapa y la actividad creadas aparecen.
estado, etapas = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=admin)
estado2, actividades = http('GET', f'/api/actividades?proyecto_id={proyecto_id}', token=admin)
assert estado == 200 and any(x['id'] == etapa_id for x in etapas)
assert estado2 == 200 and any(x['id'] == a['id'] for x in actividades)
print('listados ->', len(etapas), 'etapas,', len(actividades), 'actividades')

limpiar()
print('\nHU-03: TODAS LAS PRUEBAS PASARON')
