# Prueba de HU-33 (CU-33): disponibilidad de personal por especialidad.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu33_disponibilidad.py
#
# Verifica los criterios de docs/reglas-de-negocio/HU_CRITERIOS_ACEPTACION.md (HU-33):
#  1. se filtra por especialidad y por disponibilidad (libre o asignado).
#  2. la disponibilidad sale de las asignaciones vigentes en el momento de la consulta.
#  3. con un periodo (desde/hasta) solo aparecen quienes no tienen asignaciones solapadas.
#  4. los trabajadores dados de baja no aparecen.
#  5. el periodo debe venir completo y en orden (400 si no).
from api_helper import http, login, limpiar, crear_proyecto, crear_trabajador, PREFIJO, scalar

limpiar()
admin = login('admin')
proyecto_id = crear_proyecto(admin)
especialidad_id = scalar("SELECT id FROM especialidades WHERE nombre = 'Mamposteria' LIMIT 1")
assert especialidad_id, 'falta la especialidad Mamposteria en el catalogo'

ocupado = crear_trabajador(admin, f'{PREFIJO}-CC-HU33A')
libre = crear_trabajador(admin, f'{PREFIJO}-CC-HU33B')


def ids(consulta):
    estado, r = http('GET', '/api/trabajadores?' + consulta, token=admin)
    assert estado == 200, f'{consulta}: {estado} {r}'
    return {t['id'] for t in r}


# Asignación vigente del 10 al 20 de octubre.
estado, r = http('POST', '/api/asignaciones', {
    'trabajador_id': ocupado, 'proyecto_id': proyecto_id,
    'fecha_inicio': '2026-10-10', 'fecha_fin_programada': '2026-10-20',
}, token=admin)
assert estado == 201, f'asignar: {estado} {r}'
base = f'especialidad_id={especialidad_id}'

# Criterios 1 y 2: libre / asignado según las asignaciones de este momento.
disp = ids(base + '&disponible=libre')
assert libre in disp and ocupado not in disp, 'libre: solo el que no tiene asignaciones'
asig = ids(base + '&disponible=asignado')
assert ocupado in asig and libre not in asig, 'asignado: solo el que tiene asignacion vigente'
print('filtro especialidad + disponibilidad ->', len(disp), 'libres,', len(asig), 'asignados')

# Criterio 3: con periodo, quien se solapa queda fuera; sin solape, entra.
solapa = ids(base + '&desde=2026-10-15&hasta=2026-10-25')
assert ocupado not in solapa and libre in solapa, 'el periodo solapado excluye al asignado'
sin_solape = ids(base + '&desde=2026-11-01&hasta=2026-11-10')
assert ocupado in sin_solape and libre in sin_solape, 'sin solape ambos estan libres en el periodo'
print('periodo con y sin solape -> ok')

# Criterio 5: periodo completo y en orden.
for consulta in ('desde=2026-10-01', 'hasta=2026-10-01', 'desde=2026-10-10&hasta=2026-10-01', 'desde=hoy&hasta=2026-10-01'):
    estado, r = http('GET', '/api/trabajadores?' + consulta, token=admin)
    assert estado == 400, f'{consulta} debia dar 400, llego {estado}: {r}'
print('periodo incompleto o invertido -> 400')

# Criterio 4: el dado de baja no aparece.
estado, r = http('PATCH', f'/api/trabajadores/{libre}/baja', token=admin)
assert estado == 200, f'baja: {estado} {r}'
assert libre not in ids(base + '&disponible=libre'), 'el dado de baja no aparece'
assert libre not in ids(base + '&desde=2026-11-01&hasta=2026-11-10'), 'el dado de baja no aparece con periodo'
print('dado de baja -> no aparece')

limpiar()
print('OK: disponibilidad de personal')
