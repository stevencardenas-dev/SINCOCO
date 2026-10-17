# Prueba de la mejora de HU-03: plantillas de etapas.
#
# Requiere el backend corriendo (puerto 3005) y la migración
# docs/migraciones/pendientes/migracion_plantillas_etapas.sql aplicada.
# Uso: python tests/test_hu03_plantillas.py
#
#  1. proyecto vacío: la plantilla crea las etapas en orden, PENDIENTE, sin fechas.
#  2. las etapas son editables (nombre) aunque no tengan fechas.
#  3. proyecto con etapas: pide confirmación (409) y no cambia nada sin ella.
#  4. con confirmación se agregan al final, sin duplicar ni sobrescribir.
#  5. un rol que no es administrador recibe 403.
#  6. aplicar una plantilla queda en la bitácora de trazabilidad (HU-17).
from api_helper import http, login, limpiar, crear_proyecto, scalar

limpiar()
admin = login('admin')
proyecto_id = crear_proyecto(admin)

estado, plantillas = http('GET', '/api/plantillas-etapas', token=admin)
assert estado == 200, f'listar plantillas: {estado} {plantillas}'
nombres = {p['nombre']: p for p in plantillas}
assert {'Vivienda', 'Urbanización', 'Edificio / Multifamiliar', 'Remodelación / Adecuación'} <= set(nombres), 'faltan plantillas del seed'
vivienda = nombres['Vivienda']
assert len(vivienda['etapas']) == 10

# Proyecto vacío: no hay etapas automáticas y la plantilla las crea.
estado, r = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=admin)
assert estado == 200 and r == [], 'un proyecto nuevo no debe tener etapas'

cuerpo = {'proyecto_id': proyecto_id, 'plantilla_id': vivienda['id']}
estado, r = http('POST', '/api/plantillas-etapas/aplicar', cuerpo, token=admin)
assert estado == 201, f'aplicar en proyecto vacio: {estado} {r}'
assert r['creadas'] == 10 and r['omitidas'] == []
etapas = r['etapas']
assert [e['orden'] for e in etapas] == list(range(1, 11)), 'orden 1..10'
assert [e['nombre'] for e in etapas] == [e['nombre'] for e in vivienda['etapas']]
assert all(e['estado'] == 'PENDIENTE' for e in etapas)
assert all(e['fecha_inicio_programada'] is None and e['fecha_fin_programada'] is None for e in etapas), 'sin fechas'
print('plantilla en proyecto vacio -> 10 etapas pendientes, sin fechas')

# Editable aunque no tenga fechas.
estado, r = http('PATCH', f"/api/etapas/{etapas[0]['id']}", {'nombre': 'Gestión previa ajustada'}, token=admin)
assert estado == 200, f'editar etapa sin fechas: {estado} {r}'

# Con etapas existentes: confirmación obligatoria, nada cambia sin ella.
estado, r = http('POST', '/api/plantillas-etapas/aplicar', cuerpo, token=admin)
assert estado == 409 and r.get('codigo') == 'CONFIRMAR_PLANTILLA', f'esperaba 409 de confirmacion: {estado} {r}'
assert scalar(f'SELECT COUNT(*) FROM etapas_proyecto WHERE proyecto_id={proyecto_id}') == '10'

# Confirmado: se agrega al final, omitiendo los nombres que ya existen.
cuerpo_ur = {'proyecto_id': proyecto_id, 'plantilla_id': nombres['Urbanización']['id'], 'confirmar': True}
estado, r = http('POST', '/api/plantillas-etapas/aplicar', cuerpo_ur, token=admin)
assert estado == 201, f'aplicar con confirmacion: {estado} {r}'
assert r['omitidas'] == ['Entrega y cierre'] and r['creadas'] == 6, r
ordenes = [e['orden'] for e in r['etapas']]
assert ordenes == list(range(1, 17)), f'orden continuo al final: {ordenes}'
assert r['etapas'][0]['nombre'] == 'Gestión previa ajustada', 'las existentes no se tocan'
print('plantilla con etapas existentes -> 409, luego agregadas al final sin duplicar')

# Permiso denegado a un rol que no es administrador.
for usuario in ('gerente', 'maestro'):
    token = login(usuario)
    estado, r = http('POST', '/api/plantillas-etapas/aplicar', cuerpo_ur, token=token)
    assert estado == 403, f'{usuario} debia recibir 403, llego {estado}: {r}'
    estado, r = http('GET', '/api/plantillas-etapas', token=token)
    assert estado == 403, f'{usuario} no debe listar plantillas: {estado}'
print('rol no administrador -> 403')


# Etapa de plantilla sin fechas: admite actividades (rango del proyecto) y reprogramación.
etapa_id = etapas[1]['id']
estado, r = http('POST', '/api/actividades', {
    'etapa_id': etapa_id, 'nombre': 'TEST-Actividad en etapa sin fechas', 'criterios': ['TEST-criterio'],
    'fecha_inicio_programada': '2026-10-05', 'fecha_fin_programada': '2026-10-20',
}, token=admin)
assert estado == 201, f'actividad en etapa sin fechas: {estado} {r}'
estado, r = http('POST', '/api/actividades', {
    'etapa_id': etapa_id, 'nombre': 'TEST-Actividad fuera del proyecto', 'criterios': ['TEST-criterio'],
    'fecha_inicio_programada': '2020-01-01', 'fecha_fin_programada': '2020-01-10',
}, token=admin)
assert estado == 400, f'fuera del rango del proyecto debia dar 400, llego {estado}: {r}'
# La actividad debe quedar dentro de las fechas que se le den a la etapa.
estado, r = http('PATCH', f'/api/etapas/{etapa_id}/reprogramar', {
    'motivo': 'Definir fechas', 'fecha_inicio_programada': '2026-11-01', 'fecha_fin_programada': '2026-11-30',
}, token=admin)
assert estado == 400, f'etapa que deja fuera a su actividad debia dar 400, llego {estado}: {r}'
estado, r = http('PATCH', f'/api/etapas/{etapa_id}/reprogramar', {
    'motivo': 'Definir fechas', 'fecha_inicio_programada': '2026-10-01', 'fecha_fin_programada': '2026-10-31',
}, token=admin)
assert estado == 200, f'reprogramar etapa sin fechas: {estado} {r}'
assert r['etapa']['fecha_inicio_programada'][:10] == '2026-10-01'
print('etapa sin fechas -> admite actividad y se puede reprogramar')

# Bitácora (HU-17).
n = scalar(f"SELECT COUNT(*) FROM bitacora_trazabilidad WHERE accion='APLICAR_PLANTILLA' "
           f"AND tabla_afectada='etapas_proyecto' AND registro_id={proyecto_id}")
assert n == '2', f'se esperaban 2 registros en bitacora, hay {n}'
print('bitacora -> 2 registros APLICAR_PLANTILLA')

# Plantilla «Edificio / Multifamiliar»: 12 etapas en orden, sin fechas, y queda en bitácora.
edificio = nombres['Edificio / Multifamiliar']
assert len(edificio['etapas']) == 12 and edificio['etapas'][0]['nombre'] == 'Gestión previa'
assert edificio['etapas'][-1]['nombre'] == 'Pruebas, entrega y cierre'
proyecto2 = crear_proyecto(admin, 'TEST-PRJ-02')
estado, r = http('POST', '/api/plantillas-etapas/aplicar',
                 {'proyecto_id': proyecto2, 'plantilla_id': edificio['id']}, token=admin)
assert estado == 201 and r['creadas'] == 12, f'aplicar edificio: {estado} {r}'
assert [e['nombre'] for e in r['etapas']] == [e['nombre'] for e in edificio['etapas']]
assert [e['orden'] for e in r['etapas']] == list(range(1, 13))
assert all(e['estado'] == 'PENDIENTE' and e['fecha_inicio_programada'] is None for e in r['etapas'])
n = scalar(f"SELECT COUNT(*) FROM bitacora_trazabilidad WHERE accion='APLICAR_PLANTILLA' "
           f"AND tabla_afectada='etapas_proyecto' AND registro_id={proyecto2}")
assert n == '1', f'se esperaba 1 registro en bitacora del edificio, hay {n}'
print('plantilla edificio -> 12 etapas en orden, pendientes, en bitacora')

limpiar()
print('OK: plantillas de etapas')
