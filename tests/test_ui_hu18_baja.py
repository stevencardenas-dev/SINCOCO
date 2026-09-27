# Prueba de interfaz de HU-18 (RN07): baja lógica desde la pantalla de personal.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu18_baja.py
from playwright.sync_api import sync_playwright
from api_helper import limpiar, crear_trabajador, login as login_api
from ui_helper import login, ir_a, captura

limpiar()
admin = login_api('admin')
crear_trabajador(admin, 'TEST-UI-CC-18')

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/personal')
    pg.wait_for_selector('table tbody tr', timeout=10000)

    fila = pg.locator('table tbody tr', has_text='TEST-UI-CC-18')
    assert fila.count() == 1, 'el trabajador activo debe listarse'

    # Criterio 2: dar de baja -> desaparece del listado activo.
    fila.locator('button:has-text("Dar de baja")').click()
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('baja ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(800)
    assert pg.locator('table tbody tr', has_text='TEST-UI-CC-18').count() == 0, \
        'criterio 2: el dado de baja no debe aparecer por defecto'
    print('oculto por defecto -> OK')

    # Criterio 4: el filtro explícito lo muestra.
    pg.click('text=Incluir dados de baja')
    pg.wait_for_timeout(800)
    assert pg.locator('table tbody tr', has_text='TEST-UI-CC-18').count() == 1, \
        'criterio 4: debe aparecer con el filtro activo'
    print('visible con filtro -> OK')

    # Reactivar -> vuelve al estado activo.
    pg.locator('table tbody tr', has_text='TEST-UI-CC-18').locator(
        'button:has-text("Reactivar")').click()
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('reactivar ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(800)
    pg.click('text=Ocultar dados de baja')
    pg.wait_for_timeout(800)
    assert pg.locator('table tbody tr', has_text='TEST-UI-CC-18').count() == 1, \
        'tras reactivar debe listarse como activo'

    captura(pg, 'hu18_baja')
    navegador.close()

limpiar()
print('\nHU-18 (interfaz): TODAS LAS PRUEBAS PASARON')
