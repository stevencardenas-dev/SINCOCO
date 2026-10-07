# Reacomodo de permisos: cada rol debe poder cumplir sus funciones, y solo ellas.
#
#   GERENTE      gestiona proyectos, clientes, personal, plan de trabajo y la
#                asignación de personal, y administra los catálogos (Gestión
#                Administrativa); NO toca usuarios, roles ni auditoría.
#   MAESTRO_OBRA gestiona etapas y actividades y edita sus proyectos; NO crea ni
#                da de baja proyectos, ni asigna personal. Solo actúa sobre los
#                proyectos donde está asignado.
#   ADMINISTRADOR conserva todo.
#
# Requiere el backend (3005) arriba y docs/migracion_permisos_gerente_maestro.sql
# aplicada. Uso: python tests/test_permisos_gerente_maestro.py
from api_helper import PREFIJO, http, limpiar, login, scalar, sql

limpiar()
admin, gerente, maestro, bodega = login('admin'), login('gerente'), login('maestro'), login('bodega')
trabajador_maestro = int(scalar("SELECT trabajador_id FROM usuarios WHERE username='maestro'"))


def esperar(etiqueta, estado, r, esperado):
    assert estado == esperado, f'{etiqueta}: se esperaba {esperado}, llego {estado}: {r}'
    print(f'  {etiqueta:62} -> {estado}')


# --- Permisos que cada rol expone a la interfaz (GET /auth/permisos) ----------
def permisos(token):
    estado, r = http('GET', '/api/auth/permisos', token=token)
    assert estado == 200, f'/auth/permisos: {estado} {r}'
    return set(r['permisos'])


pa, pg, pm, pb = permisos(admin), permisos(gerente), permisos(maestro), permisos(bodega)
assert len(pa) == 29, f'admin conserva todo (29): {len(pa)}'
assert len(pg) == 22 and len(pm) == 12 and len(pb) == 0, (len(pg), len(pm), len(pb))
assert not any(p.startswith(('usuarios.', 'roles.', 'auditoria.')) for p in pg), \
    'el gerente no administra usuarios, roles ni auditoría'
assert {'catalogos.listar', 'catalogos.gestionar'} <= pg, \
    'el gerente ve y gestiona la Gestión Administrativa (catálogos)'
assert 'proyectos.gestionar_acceso' not in pm and 'proyectos.registrar' not in pm \
    and 'proyectos.dar_baja' not in pm, 'el maestro no crea, da de baja ni asigna'
assert {'proyectos.editar', 'etapas.crear', 'actividades.crear'} <= pm
print('permisos por rol -> admin 29 · gerente 22 · maestro 12 · bodega 0')

# --- GERENTE: crea proyecto con cliente y responsable propios ------------------
print('GERENTE')
estado, r = http('POST', '/api/clientes', {
    'numero_documento': f'{PREFIJO}-NIT-GER', 'tipo_documento': 'NIT',
    'razon_social_nombre': 'Cliente del gerente'}, token=gerente)
esperar('registra un cliente', estado, r, 201)
cliente_id = r['cliente']['id']

estado, r = http('POST', '/api/trabajadores', {
    'numero_documento': f'{PREFIJO}-CC-GER', 'tipo_documento': 'CC', 'nombres': 'Prueba',
    'apellidos': 'Gerente', 'cargo': 'Maestro de obra', 'especialidad': 'Mamposteria'}, token=gerente)
esperar('registra personal', estado, r, 201)
responsable_id = r['trabajador']['id']

NUEVO_PROYECTO = {
    'cliente_id': cliente_id, 'ubicacion': 'Cucuta', 'fecha_inicio_programada': '2026-10-01',
    'fecha_fin_programada': '2027-06-30', 'responsable_id': responsable_id,
    'presupuesto_inicial': 1000000,
}
estado, r = http('POST', '/api/proyectos', dict(
    NUEVO_PROYECTO, codigo=f'{PREFIJO}-PRJ-GER', nombre='Proyecto del gerente'), token=gerente)
esperar('registra un proyecto', estado, r, 201)
proyecto = r['proyecto']['id']

estado, r = http('PATCH', f'/api/proyectos/{proyecto}', {'observaciones': 'ajuste'}, token=gerente)
esperar('edita el proyecto', estado, r, 200)

etapa = {'proyecto_id': proyecto, 'nombre': 'TEST-Etapa gerente',
         'fecha_inicio_programada': '2026-10-05', 'fecha_fin_programada': '2026-12-05'}
estado, r = http('POST', '/api/etapas', etapa, token=gerente)
esperar('define una etapa', estado, r, 201)
etapa_id = r['etapa']['id']

estado, r = http('POST', '/api/actividades', {
    'etapa_id': etapa_id, 'nombre': 'TEST-Actividad gerente', 'responsable_id': responsable_id,
    'fecha_inicio_programada': '2026-10-06', 'fecha_fin_programada': '2026-11-06'}, token=gerente)
esperar('define una actividad', estado, r, 201)
actividad_id = r['actividad']['id']

estado, r = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto,
    'fecha_inicio': '2026-10-05', 'observaciones': 'Residente de obra'}, token=gerente)
esperar('asigna personal al proyecto', estado, r, 201)

estado, r = http('PATCH', f'/api/trabajadores/{responsable_id}', {'telefono': '3001234567'}, token=gerente)
esperar('edita personal', estado, r, 200)

for ruta, nombre in (('/api/usuarios', 'usuarios'), ('/api/auditoria', 'auditoría'),
                     ('/api/roles/permisos', 'roles y permisos')):
    estado, r = http('GET', ruta, token=gerente)
    esperar(f'NO consulta {nombre}', estado, r, 403)
estado, r = http('POST', '/api/catalogos/cargos', {'nombre': 'TEST-Cargo gerente'}, token=gerente)
esperar('gestiona catálogos (crea un cargo)', estado, r, 201)
cargo_gerente = r['cargo']['id']
estado, r = http('PATCH', f'/api/catalogos/cargos/{cargo_gerente}/baja', token=gerente)
esperar('gestiona catálogos (da de baja el cargo)', estado, r, 200)
estado, r = http('POST', '/api/usuarios', {'username': 'x'}, token=gerente)
esperar('NO crea usuarios', estado, r, 403)

# --- MAESTRO: asignado consulta el plan y edita su proyecto, pero no el plan ---
print('MAESTRO DE OBRA (asignado al proyecto, no es su líder)')
estado, r = http('POST', '/api/etapas', dict(etapa, nombre='TEST-Etapa maestro',
                                             fecha_inicio_programada='2027-01-05',
                                             fecha_fin_programada='2027-03-05'), token=maestro)
esperar('NO define etapas (solo el líder, gerente y admin)', estado, r, 403)
estado, r = http('POST', '/api/actividades', {
    'etapa_id': etapa_id, 'nombre': 'TEST-Actividad maestro', 'responsable_id': responsable_id,
    'fecha_inicio_programada': '2026-10-06', 'fecha_fin_programada': '2026-11-06'}, token=maestro)
esperar('NO define actividades', estado, r, 403)
estado, r = http('PATCH', f'/api/actividades/{actividad_id}', {'nombre': 'x'}, token=maestro)
esperar('NO edita actividades', estado, r, 403)
estado, r = http('PATCH', f'/api/etapas/{etapa_id}/baja', token=maestro)
esperar('NO da de baja etapas', estado, r, 403)
estado, r = http('PATCH', f'/api/proyectos/{proyecto}', {'observaciones': 'del maestro'}, token=maestro)
esperar('edita el proyecto', estado, r, 200)

estado, r = http('POST', '/api/proyectos', dict(
    NUEVO_PROYECTO, codigo=f'{PREFIJO}-PRJ-MAE', nombre='Intento del maestro'), token=maestro)
esperar('NO crea proyectos', estado, r, 403)
estado, r = http('PATCH', f'/api/proyectos/{proyecto}/baja', token=maestro)
esperar('NO da de baja proyectos', estado, r, 403)
estado, r = http('POST', '/api/asignaciones', {
    'trabajador_id': trabajador_maestro, 'proyecto_id': proyecto,
    'fecha_inicio': '2026-10-05', 'observaciones': 'Residente de obra'}, token=maestro)
esperar('NO asigna personal', estado, r, 403)
estado, r = http('POST', '/api/trabajadores', {'numero_documento': f'{PREFIJO}-CC-X'}, token=maestro)
esperar('NO registra personal', estado, r, 403)
estado, r = http('GET', '/api/usuarios', token=maestro)
esperar('NO consulta usuarios', estado, r, 403)

# --- MAESTRO sobre un proyecto donde NO está asignado --------------------------
print('MAESTRO DE OBRA (proyecto ajeno)')
estado, r = http('POST', '/api/proyectos', dict(
    NUEVO_PROYECTO, codigo=f'{PREFIJO}-PRJ-AJENO', nombre='Proyecto ajeno'), token=gerente)
esperar('el gerente crea otro proyecto', estado, r, 201)
ajeno = r['proyecto']['id']
estado, r = http('PATCH', f'/api/proyectos/{ajeno}', {'observaciones': 'x'}, token=maestro)
esperar('NO edita un proyecto ajeno', estado, r, 403)
estado, r = http('POST', '/api/etapas', dict(etapa, proyecto_id=ajeno, nombre='TEST-Etapa ajena'), token=maestro)
esperar('NO define etapas en un proyecto ajeno', estado, r, 403)

# --- ENCARGADO_BODEGA: sin permisos sobre estos módulos (inventario pendiente) --
print('ENCARGADO DE BODEGA')
for ruta in ('/api/proyectos', '/api/trabajadores', '/api/clientes'):
    estado, r = http('GET', ruta, token=bodega)
    esperar(f'NO accede a {ruta}', estado, r, 403)

# --- ADMINISTRADOR conserva todo -----------------------------------------------
print('ADMINISTRADOR')
for ruta in ('/api/usuarios', '/api/auditoria', '/api/roles/permisos', '/api/proyectos'):
    estado, r = http('GET', ruta, token=admin)
    esperar(f'accede a {ruta}', estado, r, 200)
estado, r = http('PATCH', f'/api/proyectos/{ajeno}', {'observaciones': 'admin'}, token=admin)
esperar('edita cualquier proyecto', estado, r, 200)

limpiar()
sql("DELETE FROM cargos WHERE nombre LIKE 'TEST-%'")
print('\nPermisos de gerente y maestro: TODAS LAS PRUEBAS PASARON')
