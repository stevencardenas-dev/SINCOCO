# Prueba de HU-17 (RF31 · RF32 · CU-17): consulta de la bitácora de trazabilidad.
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_hu17_auditoria.py
#
# Criterios que se comprueban:
#   1. Cada operación crítica queda en la bitácora con usuario, acción, tabla,
#      registro afectado y fecha.
#   2. El registro es de solo lectura e inmutable (no hay ruta que lo modifique).
#   3. El acceso se restringe al rol con permiso específico (`auditoria.listar`).
#   4. La consulta filtra por usuario, tabla afectada y rango de fechas.
import subprocess

from api_helper import crear_proyecto, http, limpiar, login, mysql_args, scalar

RUTA = '/api/auditoria'
ESPERADO = {'admin': 200, 'gerente': 403, 'maestro': 403, 'bodega': 403}

# Criterio 3: solo el administrador tiene `auditoria.listar`.
TOKENS = {usuario: login(usuario) for usuario in ESPERADO}
for usuario, esperado in ESPERADO.items():
    estado, _ = http('GET', RUTA, token=TOKENS[usuario])
    assert estado == esperado, f'{usuario} GET {RUTA}: se esperaba {esperado}, llego {estado}'
    print(f'{usuario:9} GET {RUTA} -> {estado}')

estado, _ = http('GET', RUTA)
assert estado == 401, f'{RUTA} sin token: se esperaba 401, llego {estado}'
print(f'sin token GET {RUTA} -> 401')

TOKEN = TOKENS['admin']

# Criterio 2: la bitácora es inmutable. No debe existir ninguna ruta de escritura.
for metodo in ('POST', 'PATCH', 'DELETE'):
    estado, _ = http(metodo, RUTA, {}, token=TOKEN)
    assert estado == 404, f'{metodo} {RUTA}: se esperaba 404 (no hay ruta de escritura), llego {estado}'
    print(f'{metodo:6} {RUTA} -> 404 (inmutable)')

# --- Criterio 1: una operación crítica deja su rastro -------------------------
# Se limpia primero para que la creación sea nueva y genere una fila propia.
limpiar()
proyecto_id = crear_proyecto(TOKEN)
print(f'\noperación crítica ejecutada: proyecto #{proyecto_id} (TEST-HU-PRJ-01)')

estado, datos = http('GET', f'{RUTA}?tabla=proyectos&accion=CREAR&usuario=admin', token=TOKEN)
assert estado == 200, f'filtro por tabla+accion+usuario: {estado} {datos}'
fila = next((f for f in datos['filas'] if f['registro_id'] == proyecto_id), None)
assert fila, f'la creación del proyecto #{proyecto_id} no quedo en la bitacora: {datos["filas"][:3]}'
for campo in ('username', 'accion', 'tabla_afectada', 'registro_id', 'fecha_registro'):
    assert fila.get(campo) is not None, f'la fila de bitacora no trae {campo}: {fila}'
assert fila['username'] == 'admin', f'la acción debe quedar a nombre del administrador: {fila}'
assert fila['tabla_afectada'] == 'proyectos', fila
print(f'bitacora -> {fila["username"]} · {fila["accion"]} · {fila["tabla_afectada"]} '
      f'#{fila["registro_id"]} · {fila["fecha_registro"]}')

# --- Criterio 4: filtros ------------------------------------------------------
dia = scalar('SELECT DATE(MAX(fecha_registro)) FROM bitacora_trazabilidad')
assert dia, 'la bitacora quedo vacia tras una operacion critica'

def ids_en_base(condicion=''):
    """Ids de la bitácora que cumplen una condición, leídos de la base."""
    r = subprocess.run(
        mysql_args(['-N', '-e', f'SELECT id FROM bitacora_trazabilidad {condicion}']),
        capture_output=True, text=True,
    )
    assert r.returncode == 0, f'no se pudo leer la bitacora: {r.stderr}'
    return {int(x) for x in r.stdout.split()}


estado, hoy = http('GET', f'{RUTA}?desde={dia}&hasta={dia}', token=TOKEN)
assert estado == 200 and hoy['total'] > 0, f'el rango de fechas {dia} no devolvio nada: {hoy}'
# El día se contrasta contra la base, no recortando el ISO: `fecha_registro`
# viaja en UTC y el filtro trabaja con el día local, así que de noche las dos
# fechas no coinciden como texto aunque la fila sí sea del día pedido.
ids_del_dia = ids_en_base(f"WHERE DATE(fecha_registro) = '{dia}'")
assert {f['id'] for f in hoy['filas']} <= ids_del_dia, 'el rango devolvio filas de otro dia'
print(f'filtro por rango {dia} -> {hoy["total"]} registros, todos de ese dia')

# El total de la API debe cuadrar con la base para el mismo filtro.
en_base = int(scalar(f"SELECT COUNT(*) FROM bitacora_trazabilidad WHERE DATE(fecha_registro)='{dia}'"))
assert hoy['total'] == en_base, f'la API dice {hoy["total"]} y la base tiene {en_base}'
print(f'total de la API == COUNT(*) de la base ({en_base})')

# Filtro por usuario: el administrador no debe ser el único con actividad.
por_usuario = {}
for usuario in ('admin', 'gerente', 'maestro', 'bodega'):
    _, r = http('GET', f'{RUTA}?usuario={usuario}', token=TOKEN)
    por_usuario[usuario] = r['total']
    esperado = int(scalar(
        "SELECT COUNT(*) FROM bitacora_trazabilidad b JOIN usuarios u ON u.id = b.usuario_id "
        f"WHERE u.username = '{usuario}'"
    ))
    assert r['total'] == esperado, f'filtro por {usuario}: {r["total"]} != {esperado}'
print('filtro por usuario ->', por_usuario)

# Filtro sin coincidencias (CU-17 Alt): no falla, informa cero resultados.
estado, vacio = http('GET', f'{RUTA}?desde=2000-01-01&hasta=2000-01-02', token=TOKEN)
assert estado == 200, f'filtro sin coincidencias: {estado}'
assert vacio['total'] == 0 and vacio['filas'] == [], f'se esperaba cero resultados: {vacio}'
print('rango sin actividad -> 0 registros (sin coincidencias)')

# Paginación: el límite se respeta y las páginas cuadran con el total.
_, pag = http('GET', f'{RUTA}?limite=1', token=TOKEN)
assert len(pag['filas']) == 1, f'limite=1 devolvio {len(pag["filas"])} filas'
assert pag['paginas'] == pag['total'], f'con limite=1 las paginas deben ser {pag["total"]}: {pag["paginas"]}'
_, tope = http('GET', f'{RUTA}?limite=9999', token=TOKEN)
assert tope['limite'] <= 200, f'el limite no se acota: {tope["limite"]}'
print(f'paginacion -> limite=1 da {pag["paginas"]} paginas; limite=9999 se acota a {tope["limite"]}')

# Entradas inválidas: la API valida, no confía en el formulario (RNF04).
for consulta in ('desde=26-09-2026', 'hasta=2026/09/28', 'desde=2026-09-30&hasta=2026-09-01'):
    estado, r = http('GET', f'{RUTA}?{consulta}', token=TOKEN)
    assert estado == 400, f'{consulta}: se esperaba 400, llego {estado} {r}'
print('fechas invalidas o invertidas -> 400')

print('\nHU-17 (auditoria): TODAS LAS PRUEBAS PASARON')
