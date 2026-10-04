# Prueba de HU-03 (RF03 · RF04): etapas y actividades del plan de trabajo.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu03_plan.py
#
# Verifica los criterios de docs/HU_CRITERIOS_ACEPTACION.md (HU-03):
#  1. la actividad pertenece a una etapa existente; la etapa a un proyecto existente.
#  2. las etapas tienen un campo de orden.
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

# Criterio 2: el orden es la secuencia de la etapa, solo enteros desde 1.
for invalido in (0, -3, 2.5, 'primera'):
    estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa orden invalido',
                                                 orden=invalido), token=admin)
    assert estado == 400 and r.get('campo') == 'orden', \
        f'orden={invalido!r} debia dar 400 en el campo orden: {estado} {r}'
print('orden fuera de rango -> 400 en', '0, -3, 2.5 y "primera"')

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
# pero no lo define. El acceso a proyectos y actividades se administra con
# asignaciones_personal: sin asignación vigente el plan no se consulta.
maestro = login('maestro')
trabajador_maestro = int(scalar("SELECT trabajador_id FROM usuarios WHERE username='maestro'"))

estado, r = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=maestro)
assert estado == 403, f'sin asignación vigente el plan no se consulta, llego {estado}'
print('maestro sin asignación ->', estado, r['error'])

estado, r = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2026-10-01', 'rol_en_proyecto': 'Maestro de obra',
}, token=admin)
assert estado == 201, f'asignar al maestro: {estado} {r}'

estado, _ = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=maestro)
assert estado == 200, f'el maestro asignado debe poder listar etapas, llego {estado}'
estado, r = http('POST', '/api/etapas', etapa, token=maestro)
assert estado == 403, f'se esperaba 403 para maestro, llego {estado}: {r}'
print('maestro asignado ->', 'GET 200 / POST 403 OK')

# Listados: la etapa y la actividad creadas aparecen.
estado, etapas = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=admin)
estado2, actividades = http('GET', f'/api/actividades?proyecto_id={proyecto_id}', token=admin)
assert estado == 200 and any(x['id'] == etapa_id for x in etapas)
assert estado2 == 200 and any(x['id'] == a['id'] for x in actividades)
print('listados ->', len(etapas), 'etapas,', len(actividades), 'actividades')

limpiar()
print('\nHU-03: TODAS LAS PRUEBAS PASARON')
