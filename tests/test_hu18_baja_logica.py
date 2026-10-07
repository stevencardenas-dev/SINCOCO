# Prueba de HU-18 (RN07): baja lógica, sin borrado físico.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu18_baja_logica.py
#
# Verifica los criterios de docs/reglas-de-negocio/HU_CRITERIOS_ACEPTACION.md (HU-18):
#  1. ninguna eliminación ejecuta borrado físico: se marca inactivo, con fecha
#     de baja y usuario que la ejecuta.
#  2. los registros inactivos no aparecen por defecto en los listados.
#  3. las relaciones se conservan (el registro sigue existiendo en la base).
#  4. hay un filtro explícito para consultar los inactivos.
from api_helper import (
    http, login, limpiar, scalar, crear_proyecto, crear_trabajador, PREFIJO,
)

limpiar()
admin = login('admin')

# --- Personal ----------------------------------------------------------------
trabajador_id = crear_trabajador(admin, f'{PREFIJO}-CC-180')
estado, _ = http('GET', f'/api/trabajadores', token=admin)
activos_antes = len(_)

estado, r = http('PATCH', f'/api/trabajadores/{trabajador_id}/baja', token=admin)
assert estado == 200 and r['activo'] == 0, f'baja de trabajador fallo: {estado} {r}'
print('baja trabajador ->', estado, r)

# Criterio 3: el registro sigue en la base (no hubo borrado físico).
assert scalar(f'SELECT COUNT(*) FROM trabajadores WHERE id={trabajador_id}') == '1', \
    'criterio 1: el registro no debe borrarse físicamente'
# Criterio 1: quedó inactivo con fecha de baja y usuario.
assert scalar(
    f'SELECT COUNT(*) FROM trabajadores WHERE id={trabajador_id} '
    'AND activo=0 AND fecha_baja IS NOT NULL AND baja_por_usuario_id IS NOT NULL'
) == '1', 'criterio 1: debe quedar activo=0 con fecha y usuario de baja'
print('sigue en la base, inactivo con fecha y usuario -> OK')

# Criterio 2: no aparece por defecto.
estado, activos = http('GET', '/api/trabajadores', token=admin)
assert all(t['id'] != trabajador_id for t in activos), 'criterio 2: no debe listarse por defecto'
# Criterio 4: aparece con el filtro explícito.
estado, todos = http('GET', '/api/trabajadores?incluirInactivos=1', token=admin)
assert any(t['id'] == trabajador_id for t in todos), 'criterio 4: debe aparecer con el filtro'
print('filtro inactivos ->', 'oculto por defecto, visible con incluirInactivos')

# Reactivación.
estado, r = http('PATCH', f'/api/trabajadores/{trabajador_id}/reactivar', token=admin)
assert estado == 200 and r['activo'] == 1, f'reactivacion fallo: {estado} {r}'
assert scalar(f'SELECT activo FROM trabajadores WHERE id={trabajador_id}') == '1'
print('reactivar trabajador ->', estado, r)

# --- Proyectos ---------------------------------------------------------------
proyecto_id = crear_proyecto(admin, f'{PREFIJO}-PRJ-180')
estado, r = http('PATCH', f'/api/proyectos/{proyecto_id}/baja', token=admin)
assert estado == 200 and r['activo'] == 0, f'baja de proyecto fallo: {estado} {r}'

estado, activos = http('GET', '/api/proyectos', token=admin)
assert all(p['id'] != proyecto_id for p in activos), 'el proyecto no debe listarse por defecto'
estado, todos = http('GET', '/api/proyectos?incluirInactivos=1', token=admin)
assert any(p['id'] == proyecto_id for p in todos), 'el proyecto debe aparecer con el filtro'
assert scalar(f'SELECT COUNT(*) FROM proyectos WHERE id={proyecto_id}') == '1', \
    'el proyecto no debe borrarse físicamente'
print('baja/reactivar contexto proyecto ->', 'oculto / visible / sigue en la base')

estado, r = http('PATCH', f'/api/proyectos/{proyecto_id}/reactivar', token=admin)
assert estado == 200 and r['activo'] == 1
print('reactivar proyecto ->', estado, r)

# Cada baja y cada reactivación debe quedar en la bitácora de trazabilidad, con
# su usuario, su tabla, el registro afectado y la fecha (HU-17).
estado, log = http('GET', '/api/auditoria?limite=200', token=admin)
assert estado == 200, f'no se pudo consultar la bitácora: {estado} {log}'
eventos = {
    (f['tabla_afectada'], f['registro_id'], f['accion'])
    for f in log['filas']
    if f['tabla_afectada'] in ('trabajadores', 'proyectos')
}
for esperado in (
    ('trabajadores', trabajador_id, 'DAR_DE_BAJA'),
    ('trabajadores', trabajador_id, 'REACTIVAR'),
    ('proyectos', proyecto_id, 'DAR_DE_BAJA'),
    ('proyectos', proyecto_id, 'REACTIVAR'),
):
    assert esperado in eventos, f'falta en la bitácora el evento {esperado}'

fila = next(
    f for f in log['filas']
    if f['tabla_afectada'] == 'proyectos' and f['registro_id'] == proyecto_id
    and f['accion'] == 'DAR_DE_BAJA'
)
assert fila['username'] == 'admin', f'la baja debe quedar a nombre de quien la ejecutó: {fila}'
assert fila['fecha_registro'], f'la baja debe quedar con fecha: {fila}'
print('bitácora -> baja y reactivación de trabajador y proyecto registradas, con usuario y fecha')

# Doble baja -> 409 (no cambia nada dos veces).
http('PATCH', f'/api/proyectos/{proyecto_id}/baja', token=admin)
estado, r = http('PATCH', f'/api/proyectos/{proyecto_id}/baja', token=admin)
assert estado == 409, f'la segunda baja debía dar 409, llego {estado}: {r}'
print('doble baja ->', estado, r['error'])

# RBAC: un rol sin permiso no puede dar de baja.
bodega = login('bodega')
estado, r = http('PATCH', f'/api/trabajadores/{trabajador_id}/baja', token=bodega)
assert estado == 403, f'se esperaba 403 para bodega, llego {estado}: {r}'
print('bodega da de baja ->', estado)

limpiar()
print('\nHU-18: TODAS LAS PRUEBAS PASARON')
