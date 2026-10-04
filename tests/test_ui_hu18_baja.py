# Prueba de interfaz del estado del trabajador (HU-04 · HU-18).
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu18_baja.py
#
# La interfaz ya no ofrece «Dar de baja» en Personal: el estado se cambia con el
# selector de la tabla. Al pasar a un estado distinto de Activo el trabajador
# deja de estar disponible; al volver a Activo recupera la disponibilidad según
# sus actividades vigentes.
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
    # Al crearse queda Activo y disponible.
    assert 'Disponible' in fila.inner_text(), 'al crear debe estar disponible'

    # Cambiar a Inactivo -> deja de estar disponible, sin desaparecer del listado.
    fila.locator('select[aria-label^="Estado de"]').select_option(label='Inactivo')
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('cambiar estado ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(800)
    fila = pg.locator('table tbody tr', has_text='TEST-UI-CC-18')
    assert fila.count() == 1, 'el trabajador sigue en la lista, solo cambió de estado'
    assert 'No disponible' in fila.inner_text(), 'un estado distinto de Activo no está disponible'

    # Volver a Activo -> recupera la disponibilidad.
    fila.locator('select[aria-label^="Estado de"]').select_option(label='Activo')
    pg.wait_for_selector('[role=status]', timeout=10000)
    pg.wait_for_timeout(800)
    fila = pg.locator('table tbody tr', has_text='TEST-UI-CC-18')
    assert 'Disponible' in fila.inner_text(), 'al volver a Activo debe quedar disponible de nuevo'

    captura(pg, 'hu18_baja')
    navegador.close()

limpiar()
print('\nEstado del trabajador (interfaz): TODAS LAS PRUEBAS PASARON')
