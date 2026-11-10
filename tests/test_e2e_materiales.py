# Prueba E2E por API: flujo completo de una solicitud de materiales.
#
# HU-08 (solicitud con exceso de presupuesto) -> HU-36 (aprobación parcial) ->
# HU-26 (despacho parcial y del saldo) y comprobación final de existencias
# (materiales.existencia_total y existencias_almacen). Incluye dos despachos
# simultáneos del mismo saldo contra la base real: uno debe fallar con 409 y
# las existencias no pueden quedar negativas ni descontarse dos veces.
#
# Requiere el backend corriendo (puerto 3005) y la base con todas las migraciones.
# Crea sus propios datos con el prefijo E2E- (código único por ejecución) para
# no interferir con las demás pruebas. No usa navegador.
# Uso: python tests/test_e2e_materiales.py
import threading
import time

from api_helper import http, login, crear_proyecto, scalar, sql

marca = str(int(time.time()))
admin = login('admin')
admin_id = int(scalar("SELECT id FROM usuarios WHERE username='admin'"))

# --- Datos: proyecto, etapa y actividad por API --------------------------------
proyecto_id = crear_proyecto(admin, codigo=f'E2E-{marca}')
estado, r = http('POST', '/api/etapas', {
    'proyecto_id': proyecto_id, 'nombre': f'E2E-Etapa {marca}',
    'fecha_inicio_programada': '2026-10-01', 'fecha_fin_programada': '2027-03-31',
}, token=admin)
assert estado == 201, f'etapa: {estado} {r}'
estado, r = http('POST', '/api/actividades', {
    'etapa_id': r['etapa']['id'], 'nombre': f'E2E-Actividad {marca}', 'criterios': ['E2E-criterio'],
    'fecha_inicio_programada': '2026-10-05', 'fecha_fin_programada': '2027-02-28',
}, token=admin)
assert estado == 201, f'actividad: {estado} {r}'
actividad_id = r['actividad']['id']
trabajador_id = int(scalar(f'SELECT responsable_id FROM proyectos WHERE id = {proyecto_id}'))

# --- Datos: material con 10 unidades en la bodega central y presupuesto de 5 ----
almacen_id = int(scalar("SELECT id FROM almacenes WHERE codigo = 'ALM-CENTRAL'"))
codigo_material = f'E2E-{marca}'
r = sql(
    "INSERT INTO materiales (codigo, categoria_id, descripcion, unidad_medida, costo_referencia, nivel_minimo) "
    f"SELECT '{codigo_material}', MIN(id), 'Material de prueba E2E', 'UNIDAD', 1000.00, 0 FROM categorias_materiales"
)
assert r.returncode == 0, r.stderr
material_id = int(scalar(f"SELECT id FROM materiales WHERE codigo = '{codigo_material}'"))
r = sql(
    "INSERT INTO proveedores (documento_identificacion, razon_social) "
    f"VALUES ('E2E-{marca}', 'Proveedor de prueba E2E')"
)
assert r.returncode == 0, r.stderr
proveedor_id = int(scalar(f"SELECT id FROM proveedores WHERE documento_identificacion = 'E2E-{marca}'"))
r = sql(
    "INSERT INTO entradas_inventario (almacen_id, proveedor_id, responsable_usuario_id, observaciones) "
    f"VALUES ({almacen_id}, {proveedor_id}, {admin_id}, 'E2E-{marca}')"
)
assert r.returncode == 0, r.stderr
entrada_id = int(scalar(f"SELECT id FROM entradas_inventario WHERE observaciones = 'E2E-{marca}'"))
r = sql(
    "INSERT INTO detalles_entrada_inventario (entrada_id, material_id, cantidad, costo_unitario, costo_subtotal) "
    f"VALUES ({entrada_id}, {material_id}, 10, 1000.00, 10000.00)"
)
assert r.returncode == 0, r.stderr
r = sql(
    "INSERT INTO presupuesto_materiales_actividad (actividad_id, material_id, cantidad_presupuestada) "
    f"VALUES ({actividad_id}, {material_id}, 5)"
)
assert r.returncode == 0, r.stderr


def existencia_total():
    return float(scalar(f'SELECT existencia_total FROM materiales WHERE id = {material_id}'))


def existencia_central():
    valor = scalar(f'SELECT cantidad FROM existencias_almacen WHERE almacen_id = {almacen_id} AND material_id = {material_id}')
    return float(valor or 0)


assert existencia_total() == 10 and existencia_central() == 10, 'la entrada deja 10 unidades en la bodega central'
print('datos E2E listos -> material', material_id, 'con 10 unidades; presupuesto 5')

# --- HU-08: solicitud de 8 cuando el presupuesto es 5 ---------------------------
solicitud = {'proyecto_id': proyecto_id, 'actividad_id': actividad_id,
             'detalles': [{'material_id': material_id, 'cantidad': 8}]}
estado, r = http('POST', '/api/solicitudes-materiales', solicitud, token=admin)
assert estado == 409, f'exceso sin confirmar debe dar 409: {estado} {r}'
estado, r = http('POST', '/api/solicitudes-materiales', {**solicitud, 'confirmar_exceso': True}, token=admin)
assert estado == 400 and r.get('campo') == 'observaciones', f'exceso sin justificación debe dar 400: {estado} {r}'
estado, r = http('POST', '/api/solicitudes-materiales',
                 {**solicitud, 'confirmar_exceso': True, 'observaciones': 'E2E: se requiere más por cambio de diseño'},
                 token=admin)
assert estado == 201, f'solicitud con exceso justificado: {estado} {r}'
solicitud_id = r['solicitud']['id']
detalle_id = r['solicitud']['detalles'][0]['id']
print('HU-08 exceso: 409 sin confirmar, 400 sin justificación, 201 justificado -> ok')

# --- HU-36: aprobación parcial (6 de 8) -----------------------------------------
estado, r = http('PATCH', f'/api/solicitudes-materiales/{solicitud_id}/aprobar',
                 {'detalles': [{'detalle_id': detalle_id, 'cantidad_aprobada': 6, 'observacion': 'E2E parcial'}]},
                 token=admin)
assert estado == 200 and r['solicitud']['estado'] == 'APROBADA_PARCIAL', f'aprobación parcial: {estado} {r}'
print('HU-36 aprobación parcial -> APROBADA_PARCIAL')

despacho = {'almacen_origen_id': almacen_id, 'entregado_a_trabajador_id': trabajador_id}

# --- HU-26: despacho de lo aprobado (6) -----------------------------------------
estado, r = http('PATCH', f'/api/solicitudes-materiales/{solicitud_id}/despachar', despacho, token=admin)
assert estado == 200 and r['solicitud']['estado'] == 'DESPACHADA_PARCIAL', f'despacho parcial: {estado} {r}'
assert existencia_total() == 4 and existencia_central() == 4, 'tras despachar 6 quedan 4'

# Despachar más de lo pendiente (quedan 2 por despachar) responde 409 y no descuenta.
estado, r = http('PATCH', f'/api/solicitudes-materiales/{solicitud_id}/despachar',
                 {**despacho, 'detalles': [{'detalle_id': detalle_id, 'cantidad': 3}]}, token=admin)
assert estado == 409, f'despachar más de lo pendiente debe dar 409: {estado} {r}'
assert existencia_total() == 4, 'un despacho rechazado no descuenta'
print('HU-26 despacho parcial y rechazo por exceso -> ok')

# --- Concurrencia: dos despachos simultáneos del saldo (2) ----------------------
resultados = []


def despachar_saldo():
    resultados.append(http('PATCH', f'/api/solicitudes-materiales/{solicitud_id}/despachar',
                           {**despacho, 'detalles': [{'detalle_id': detalle_id, 'cantidad': 2}]}, token=admin))


hilos = [threading.Thread(target=despachar_saldo) for _ in range(2)]
for h in hilos:
    h.start()
for h in hilos:
    h.join()
codigos = sorted(c for c, _ in resultados)
assert codigos == [200, 409], f'uno despacha y el otro recibe 409: {resultados}'
print('despachos simultáneos ->', codigos)

# --- Estado final consistente ---------------------------------------------------
estado, r = http('GET', '/api/solicitudes-materiales', token=admin)
assert estado == 200
final = next(s for s in r if s['id'] == solicitud_id) if isinstance(r, list) else None
if final is None:
    final_estado = scalar(f'SELECT estado FROM solicitudes_materiales WHERE id = {solicitud_id}')
else:
    final_estado = final['estado']
assert final_estado == 'DESPACHADA_TOTAL', f'la solicitud queda despachada en total: {final_estado}'
despachado = float(scalar(f'SELECT cantidad_despachada FROM detalles_solicitud_materiales WHERE id = {detalle_id}'))
salidas = float(scalar(
    'SELECT COALESCE(SUM(d.cantidad_despachada), 0) FROM salidas_materiales s '
    f'JOIN detalles_salida_materiales d ON d.salida_id = s.id WHERE s.solicitud_id = {solicitud_id}'))
assert despachado == 8 and salidas == 8, f'se despacharon exactamente 8: detalle {despachado}, salidas {salidas}'
assert existencia_total() == 2 and existencia_central() == 2, \
    f'existencias finales 10 - 8 = 2: total {existencia_total()}, central {existencia_central()}'
print('estado final: DESPACHADA_TOTAL, 8 despachadas, existencias 2 (total y bodega central) -> ok')
print('E2E materiales -> OK')
