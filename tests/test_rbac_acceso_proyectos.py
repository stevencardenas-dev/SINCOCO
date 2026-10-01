# RBAC: gestión de acceso a proyectos y actividades (RNF05).
#
# `proyectos.listar` da entrada al módulo; el alcance decide qué se ve dentro:
#   - ADMINISTRADOR y GERENTE (`proyectos.acceso_total`) ven todos los proyectos;
#   - los demás roles ven solo los proyectos donde están asignados o de los que
#     son responsables.
# Asignar personal exige `proyectos.gestionar_acceso`, que solo tiene el
# administrador; finalizar una asignación retira el acceso sin borrar nada.
#
# Requiere el backend (3005) arriba.
# Uso: python3 tests/test_rbac_acceso_proyectos.py
from api_helper import http, login, limpiar, scalar, sql, crear_proyecto

CODIGO = 'TEST-HU-ACCESO-01'


def limpiar_accesos():
    sql(
        "DELETE FROM asignaciones_personal "
        "WHERE proyecto_id IN (SELECT id FROM proyectos WHERE codigo LIKE 'TEST-HU-ACCESO-%')"
    )
    limpiar()


limpiar_accesos()

admin = login('admin')
maestro = login('maestro')
gerente = login('gerente')
trabajador_maestro = int(scalar("SELECT trabajador_id FROM usuarios WHERE username='maestro'"))

# Se crea con el helper: cliente y responsable propios (marcados TEST-).
proyecto_id = crear_proyecto(admin, CODIGO)

# --- Sin asignación: el maestro no ve el proyecto ni su plan ------------------
estado, proyectos = http('GET', '/api/proyectos', token=maestro)
assert estado == 200, f'maestro debe poder listar (con alcance): {estado}'
assert all(p['codigo'] != CODIGO for p in proyectos), 'sin asignación no debe ver el proyecto'
print('maestro sin asignación ->', len(proyectos), 'proyectos visibles')

estado, data = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=maestro)
print('maestro al plan ajeno ->', estado, '·', data.get('error'))
assert estado == 403, 'sin acceso al proyecto, sus etapas tampoco se consultan'

# --- El maestro no administra asignaciones ------------------------------------
estado, data = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2026-10-05', 'rol_en_proyecto': 'Residente de obra',
}, token=maestro)
print('maestro intenta asignar personal ->', estado, '·', data.get('error'))
assert estado == 403, 'solo quien tiene proyectos.gestionar_acceso puede asignar'

# --- El administrador asigna al maestro ---------------------------------------
estado, data = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2026-10-05', 'fecha_fin_programada': '2027-06-30',
    'rol_en_proyecto': 'Residente de obra',
}, token=admin)
assert estado == 201, f'asignar: {estado} {data}'
asignacion_id = data['asignacion']['id']
print('asignación creada ->', data['asignacion']['trabajador_nombre'], '·', data['asignacion']['rol_en_proyecto'])

# Fechas fuera del rango del proyecto: se rechaza.
estado, data = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2029-01-01',
}, token=admin)
assert estado == 400, f'fuera de rango debe rechazarse: {estado} {data}'

# Actividad inexistente: se rechaza con el campo señalado.
estado, data = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'actividad_id': 999999, 'fecha_inicio': '2026-10-05',
}, token=admin)
assert estado == 404 and data.get('campo') == 'actividad_id', f'actividad inexistente: {estado} {data}'

# Duplicado activo: se rechaza.
estado, data = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2026-10-06',
}, token=admin)
print('asignación duplicada ->', estado, '·', data.get('error'))
assert estado == 409, 'no se duplica una asignación activa al mismo destino'

# --- Con la asignación vigente, el maestro ve el proyecto y su plan -----------
estado, proyectos = http('GET', '/api/proyectos', token=maestro)
codigos = [p['codigo'] for p in proyectos]
print('maestro tras la asignación ->', codigos)
assert CODIGO in codigos, 'la asignación vigente da acceso al proyecto'

estado, etapas = http('GET', f'/api/etapas?proyecto_id={proyecto_id}', token=maestro)
assert estado == 200, f'con acceso, las etapas se consultan: {estado} {etapas}'
estado, actividades = http('GET', f'/api/actividades?proyecto_id={proyecto_id}', token=maestro)
assert estado == 200, f'con acceso, las actividades se consultan: {estado} {actividades}'

# El maestro no puede finalizar su propia asignación (no administra accesos).
estado, _ = http('PATCH', f'/api/asignaciones/{asignacion_id}', {'estado': 'FINALIZADO'}, token=maestro)
assert estado == 403, 'finalizar una asignación exige gestionar_acceso'

# El gerente tiene alcance total: ve todos los proyectos sin asignación.
estado, proyectos_gerente = http('GET', '/api/proyectos', token=gerente)
assert estado == 200 and any(p['codigo'] == CODIGO for p in proyectos_gerente), \
    'el gerente debe ver todos los proyectos'
print('gerente ve ->', len(proyectos_gerente), 'proyectos (alcance total)')

# --- Finalizar la asignación retira el acceso ---------------------------------
estado, data = http('PATCH', f'/api/asignaciones/{asignacion_id}', {'estado': 'FINALIZADO'}, token=admin)
assert estado == 200, f'finalizar: {estado} {data}'
assert data['asignacion']['fecha_fin_real'] is not None, 'al finalizar se registra la fecha real'

estado, proyectos = http('GET', '/api/proyectos', token=maestro)
assert all(p['codigo'] != CODIGO for p in proyectos), 'finalizada la asignación, el acceso se retira'
print('acceso retirado tras finalizar -> OK')

# La asignación no se borra: queda como historial.
estado, data = http('GET', f'/api/asignaciones?proyecto_id={proyecto_id}', token=admin)
assert estado == 200 and len(data) == 1 and data[0]['estado'] == 'FINALIZADO', \
    'la asignación finalizada se conserva como historial'
print('historial conservado ->', data[0]['trabajador_nombre'], '·', data[0]['estado'])

limpiar_accesos()
print('\nRBAC de acceso a proyectos y actividades: TODAS LAS PRUEBAS PASARON')
