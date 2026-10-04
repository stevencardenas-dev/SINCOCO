# Ubicación en el mapa (Leaflet) y teléfono con bandera del país.
#
# Cubre la revisión del PO: el selector de ubicación se puede mover, acercar y
# marcar con el ratón, y está disponible en /personal, /proyectos y /perfil.
# El teléfono trae la lista completa de países con su bandera y guarda el número
# en formato internacional (E.164) con el indicativo del país elegido.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: python3 tests/test_ui_mapa_telefono.py
from playwright.sync_api import sync_playwright
from api_helper import limpiar, scalar, sql
from ui_helper import login, ir_a, captura

DOC = '900777222'


def limpiar_datos():
    sql(f"DELETE FROM trabajadores WHERE numero_documento='{DOC}'")
    limpiar()


limpiar_datos()

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/personal')
    pg.wait_for_selector('text=Nuevo trabajador', timeout=10000)
    pg.click('text=Nuevo trabajador')
    pg.wait_for_selector('#t-doc', timeout=10000)

    # --- Mapa interactivo en /personal ---------------------------------------
    pg.click('button:has-text("Mapa")')
    pg.wait_for_selector('.leaflet-container', timeout=15000)
    caja = pg.locator('.leaflet-container').bounding_box()
    cx, cy = caja['x'] + caja['width'] / 2, caja['y'] + caja['height'] / 2

    # Se puede mover: el desplazamiento del mapa cambia al arrastrar.
    pane = pg.locator('.leaflet-map-pane')
    antes = pane.get_attribute('style')
    pg.mouse.move(cx, cy)
    pg.mouse.down()
    pg.mouse.move(cx - 160, cy - 90, steps=12)
    pg.mouse.up()
    pg.wait_for_timeout(700)
    despues = pane.get_attribute('style')
    print('mapa antes  ->', (antes or '')[:60])
    print('mapa después ->', (despues or '')[:60])
    assert despues != antes, 'el mapa debe responder al arrastre'

    # Un clic coloca el punto exacto (marcador).
    assert pg.locator('.leaflet-marker-icon').count() == 0, 'todavía no hay marcador'
    pg.mouse.click(cx, cy)
    pg.wait_for_selector('.leaflet-marker-icon', timeout=10000)
    print('marcador colocado -> OK')

    # La dirección vuelve al formulario (geocodificación inversa o coordenadas).
    pg.wait_for_selector('button:has-text("Usar esta dirección"):not([disabled])', timeout=20000)
    pg.click('button:has-text("Usar esta dirección")')
    direccion = pg.input_value('#t-direccion')
    print('dirección devuelta ->', direccion[:70])
    assert direccion.strip() != '', 'la dirección debe llegar al formulario'

    # --- Teléfono con bandera -------------------------------------------------
    pais = pg.locator('select.PhoneInputCountrySelect')
    assert pais.count() == 1, 'el teléfono debe traer el selector de país'
    assert pg.locator('.PhoneInputCountryIcon').count() == 1, 'debe verse la bandera del país'
    total_paises = pais.locator('option').count()
    print('países disponibles ->', total_paises)
    assert total_paises > 200, 'la lista debe traer todos los países, no solo Colombia'
    assert pais.input_value() == 'CO', 'por defecto el país es Colombia'

    pais.select_option('MX')
    pg.wait_for_timeout(300)
    pg.fill('#t-telefono', '5555555555')
    pg.wait_for_timeout(300)
    print('teléfono en México ->', pg.input_value('#t-telefono'))
    assert pais.input_value() == 'MX', 'el país debe cambiar a México'

    # Se registra el trabajador: el teléfono queda con el indicativo de México.
    pg.fill('#t-doc', DOC)
    pg.fill('#t-nombres', 'Mapa')
    pg.fill('#t-apellidos', 'Prueba')
    pg.select_option('#t-cargo', label='Obrero · obra')
    pg.select_option('#t-especialidad', label='Mampostería')
    pg.click('button:has-text("Registrar trabajador")')
    pg.wait_for_selector('[role=status]', timeout=10000)
    guardado = scalar(f"SELECT telefono FROM trabajadores WHERE numero_documento='{DOC}'")
    print('teléfono guardado ->', guardado)
    assert guardado.startswith('+52'), 'debe guardarse el indicativo del país elegido (+52)'

    fila = pg.locator('table tbody tr', has_text=DOC)
    assert fila.count() == 1 and '+52' in fila.inner_text(), \
        'la tabla debe mostrar el teléfono con su indicativo'
    captura(pg, 'mapa_telefono')

    # --- El mismo mapa en /proyectos -----------------------------------------
    ir_a(pg, '/proyectos')
    pg.wait_for_selector('text=Nuevo proyecto', timeout=10000)
    pg.click('text=Nuevo proyecto')
    pg.wait_for_selector('#p-ubicacion', timeout=10000)
    pg.click('button:has-text("Mapa")')
    pg.wait_for_selector('.leaflet-container', timeout=15000)
    print('mapa en /proyectos -> OK')
    pg.locator('div[role=dialog]', has_text='Seleccionar ubicación') \
        .locator('button:has-text("Cancelar")').click()
    pg.wait_for_timeout(300)
    pg.locator('div[role=dialog]', has_text='Registrar proyecto') \
        .locator('button:has-text("Cancelar")').click()

    # --- Y en /perfil ---------------------------------------------------------
    ir_a(pg, '/perfil')
    pg.wait_for_selector('#mi-direccion', timeout=10000)
    pg.click('button:has-text("Mapa")')
    pg.wait_for_selector('.leaflet-container', timeout=15000)
    print('mapa en /perfil -> OK')
    pg.locator('div[role=dialog]', has_text='Seleccionar ubicación') \
        .locator('button:has-text("Cancelar")').click()

    navegador.close()

limpiar_datos()
print('\nUbicación (Leaflet) y teléfono con bandera: TODAS LAS PRUEBAS PASARON')
