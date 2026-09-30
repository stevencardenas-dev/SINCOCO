# Prueba del panel de inicio (RF04 · RF09 · RF22 · RF26).
#
# Requiere el backend corriendo (puerto 3005). No usa navegador.
# Uso: python tests/test_dashboard.py
#
# Lo que se comprueba es lo que pidió el equipo: que el panel muestre la
# realidad de los datos almacenados, no cifras de demostración. Cada indicador
# que devuelve GET /api/dashboard se contrasta contra un COUNT(*) de la tabla
# correspondiente, primero con la base como esté y después creando datos a
# propósito (un proyecto activo, un material bajo mínimo, un trabajador dado de
# baja) para ver que los números reaccionan.
from api_helper import crear_proyecto, http, limpiar, login, scalar, sql

RUTA = '/api/dashboard'
CATEGORIA = 'TEST-DASH-CAT'

# El panel es la pantalla de aterrizaje de los cuatro roles: solo exige sesión.
TOKENS = {usuario: login(usuario) for usuario in ('admin', 'gerente', 'maestro', 'bodega')}
for usuario, token in TOKENS.items():
    estado, _ = http('GET', RUTA, token=token)
    assert estado == 200, f'{usuario} GET {RUTA}: se esperaba 200, llego {estado}'
    print(f'{usuario:9} GET {RUTA} -> {estado}')

estado, _ = http('GET', RUTA)
assert estado == 401, f'{RUTA} sin token: se esperaba 401, llego {estado}'
print(f'sin token GET {RUTA} -> 401')

TOKEN = TOKENS['admin']


def coincide(valor_api, consulta, concepto):
    """El indicador del panel debe ser exactamente lo que dice la base."""
    # float() porque los SUM() de columnas DECIMAL llegan como '0.00'.
    esperado = int(float(scalar(consulta)))
    assert int(valor_api) == esperado, (
        f'{concepto}: el panel muestra {valor_api} y la base tiene {esperado}'
    )
    return esperado


def indicadores():
    estado, datos = http('GET', RUTA, token=TOKEN)
    assert estado == 200, f'GET {RUTA}: {estado} {datos}'
    return datos


# --- La base como está --------------------------------------------------------
# Se limpia primero para partir de un estado conocido: así el contador de
# proyectos deja de arrastrar los datos de pruebas anteriores.
limpiar()
d = indicadores()
proyectos_activos = coincide(
    d['proyectos']['activos'], 'SELECT COUNT(*) FROM proyectos WHERE activo=1', 'proyectos activos')
coincide(d['proyectos']['total'], 'SELECT COUNT(*) FROM proyectos', 'proyectos totales')
coincide(d['personal']['activos'], 'SELECT COUNT(*) FROM trabajadores WHERE activo=1', 'personal activo')
coincide(d['personal']['total'], 'SELECT COUNT(*) FROM trabajadores', 'personal total')
coincide(d['personal']['con_cuenta'], 'SELECT COUNT(*) FROM usuarios WHERE activo=1', 'cuentas activas')
coincide(d['inventario']['materiales'], 'SELECT COUNT(*) FROM materiales WHERE activo=1', 'materiales activos')
coincide(
    d['inventario']['bajo_stock'],
    'SELECT COUNT(*) FROM materiales WHERE activo=1 AND existencia_total <= nivel_minimo',
    'materiales bajo mínimo',
)
coincide(
    d['inventario']['alertas_pendientes'],
    'SELECT COUNT(*) FROM alertas WHERE atendida = 0',
    'alertas sin atender',
)
coincide(
    d['incidencias']['abiertas'],
    "SELECT COUNT(*) FROM incidencias WHERE estado IN ('ABIERTA','EN_REVISION')",
    'incidencias abiertas',
)
coincide(
    d['proyectos']['presupuesto_activos'],
    'SELECT COALESCE(SUM(presupuesto_inicial),0) FROM proyectos WHERE activo=1',
    'presupuesto vigente',
)
print('agregados ->', {
    'proyectos': d['proyectos']['activos'],
    'personal': d['personal']['activos'],
    'materiales': d['inventario']['materiales'],
    'bajo_minimo': d['inventario']['bajo_stock'],
    'incidencias': d['incidencias']['abiertas'],
})

# El costo consolidado es la suma de sus tres componentes (fórmula de HU-15).
componentes = [d['costos'][k] for k in ('materiales_despachados', 'servicios_externos', 'ordenes_compra')]
assert d['costos']['total'] == sum(componentes), f'el costo no es la suma de sus partes: {d["costos"]}'
esperado_costo = int(float(scalar(
    'SELECT (SELECT COALESCE(SUM(d.cantidad_despachada * d.costo_unitario_momento),0) '
    '          FROM detalles_salida_materiales d) + '
    '       (SELECT COALESCE(SUM(valor_contratado),0) FROM servicios_externos) + '
    '       (SELECT COALESCE(SUM(monto_total),0) FROM ordenes_compra WHERE activo=1)'
)))
assert d['costos']['total'] == esperado_costo, (
    f'costo consolidado: el panel dice {d["costos"]["total"]} y la base {esperado_costo}'
)
print('costo consolidado ->', d['costos']['total'], '(materiales + servicios + órdenes)')

# Coherencia interna del bloque de proyectos.
assert len(d['proyectos']['por_estado']) <= proyectos_activos or proyectos_activos == 0, (
    'el desglose por estado no puede tener más proyectos que los activos'
)
assert len(d['proyectos']['avance']) <= proyectos_activos, 'el gráfico no lista más proyectos que los activos'

# --- Con datos creados a propósito -------------------------------------------
# Proyecto activo: debe subir el contador y aparecer en el gráfico de avance.
proyecto_id = crear_proyecto(TOKEN, codigo='TEST-HU-DASH-01')
d2 = indicadores()
assert d2['proyectos']['activos'] == proyectos_activos + 1, (
    f'el proyecto nuevo no se contó: {d2["proyectos"]["activos"]} vs {proyectos_activos}'
)
etiquetas = [p['codigo'] for p in d2['proyectos']['avance']]
assert 'TEST-HU-DASH-01' in etiquetas, f'el proyecto nuevo no aparece en el gráfico: {etiquetas}'
nuevo = next(p for p in d2['proyectos']['avance'] if p['id'] == proyecto_id)
assert nuevo['avance'] == 0, f'un proyecto recién creado debe ir en 0 %: {nuevo}'
assert d2['proyectos']['presupuesto_activos'] == int(float(scalar(
    'SELECT COALESCE(SUM(presupuesto_inicial),0) FROM proyectos WHERE activo=1'))), 'el presupuesto no cuadra'
print(f'\nproyecto de prueba #{proyecto_id} -> activos {proyectos_activos} a {d2["proyectos"]["activos"]}, '
      f'y aparece en el gráfico con {nuevo["avance"]} % de avance')

# Inventario: la alerta depende de existencia_total <= nivel_minimo (RF23).
try:
    assert sql(
        "INSERT INTO categorias_materiales (nombre) VALUES ('%s') "
        'ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)' % CATEGORIA
    ).returncode == 0, 'no se pudo sembrar la categoría de prueba'
    categoria_id = int(scalar(f"SELECT id FROM categorias_materiales WHERE nombre='{CATEGORIA}'"))
    for codigo, existencia, minimo in (('TEST-DASH-BAJO', 3, 10), ('TEST-DASH-OK', 20, 5)):
        assert sql(
            'INSERT INTO materiales (codigo, categoria_id, descripcion, unidad_medida, '
            'existencia_total, costo_referencia, nivel_minimo) '
            f"VALUES ('{codigo}', {categoria_id}, 'Material de prueba', 'Und', {existencia}, 1000, {minimo}) "
            'ON DUPLICATE KEY UPDATE existencia_total = VALUES(existencia_total), '
            'nivel_minimo = VALUES(nivel_minimo), activo = 1'
        ).returncode == 0, f'no se pudo sembrar {codigo}'

    d3 = indicadores()
    assert d3['inventario']['materiales'] == int(scalar('SELECT COUNT(*) FROM materiales WHERE activo=1'))
    assert d3['inventario']['bajo_stock'] == int(scalar(
        'SELECT COUNT(*) FROM materiales WHERE activo=1 AND existencia_total <= nivel_minimo'))
    detalle = [m['codigo'] for m in d3['inventario']['detalle']]
    assert 'TEST-DASH-BAJO' in detalle, f'el material bajo mínimo no se alerta: {detalle}'
    assert 'TEST-DASH-OK' not in detalle, f'el material con existencia suficiente no debe alertar: {detalle}'
    fila = next(m for m in d3['inventario']['detalle'] if m['codigo'] == 'TEST-DASH-BAJO')
    assert (fila['existencia_total'], fila['nivel_minimo']) == (3, 10), f'valores distintos: {fila}'
    print(f'inventario -> {d3["inventario"]["bajo_stock"]} bajo mínimo; detalle incluye '
          f'{fila["codigo"]} ({fila["existencia_total"]} < {fila["nivel_minimo"]}) y excluye TEST-DASH-OK')
finally:
    sql("DELETE FROM materiales WHERE codigo LIKE 'TEST-DASH-%'")
    sql(f"DELETE FROM categorias_materiales WHERE nombre='{CATEGORIA}'")

# Personal dado de baja lógica (HU-18): no debe contar como activo.
# `cargo_id` es clave foránea del catálogo `cargos` (ya no hay columna de
# texto), así que se resuelve el id del cargo 'Operario' del seed.
trabajadores_activos = int(scalar('SELECT COUNT(*) FROM trabajadores WHERE activo=1'))
assert sql(
    'INSERT INTO trabajadores (numero_documento, tipo_documento, nombres, apellidos, cargo_id, activo, fecha_baja) '
    "SELECT 'TEST-DASH-BAJA','CC','Dado','De Baja', c.id, 0, NOW() FROM cargos c WHERE c.nombre='Operario' "
    'ON DUPLICATE KEY UPDATE activo=0, fecha_baja=NOW()'
).returncode == 0, 'no se pudo sembrar el trabajador de baja'
assert scalar("SELECT COUNT(*) FROM trabajadores WHERE numero_documento='TEST-DASH-BAJA'") == '1', (
    'no se pudo sembrar el trabajador de baja (¿está cargado docs/seed_catalogos_prueba.sql?)'
)
try:
    d4 = indicadores()
    assert d4['personal']['activos'] == trabajadores_activos, (
        f'un trabajador de baja no debe contar como activo: {d4["personal"]["activos"]} vs {trabajadores_activos}'
    )
    coincide(d4['personal']['total'], 'SELECT COUNT(*) FROM trabajadores', 'personal total')
    print(f'personal -> {d4["personal"]["activos"]} activos de {d4["personal"]["total"]} registrados '
          '(el de baja no suma)')
finally:
    sql("DELETE FROM trabajadores WHERE numero_documento='TEST-DASH-BAJA'")

limpiar()
print('\nPanel de inicio: TODAS LAS PRUEBAS PASARON')
