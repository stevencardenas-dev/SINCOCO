# Prueba de interfaz de HU-02 (RF02 · CU-02): registrar un proyecto.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu02_proyecto.py
from playwright.sync_api import sync_playwright
from api_helper import limpiar, crear_proyecto
from ui_helper import login, ir_a, captura

limpiar()

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)

    # Datos de referencia para los selectores (cliente y responsable).
    from api_helper import crear_cliente, crear_trabajador, login as login_api
    admin = login_api('admin')
    crear_cliente(admin, 'TEST-UI-NIT-02')
    crear_trabajador(admin, 'TEST-UI-CC-02')

    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/proyectos')
    pg.wait_for_selector('text=Nuevo proyecto', timeout=10000)

    # Flujo principal de CU-02.
    pg.click('text=Nuevo proyecto')
    pg.wait_for_selector('#p-codigo')
    pg.fill('#p-codigo', 'TEST-UI-PRJ-02')
    pg.fill('#p-nombre', 'Proyecto de interfaz')
    pg.select_option('#p-cliente', index=1)
    pg.select_option('#p-responsable', index=1)
    pg.fill('#p-inicio', '2026-11-01')
    pg.fill('#p-fin', '2027-03-31')
    pg.fill('#p-ubicacion', 'Cucuta')
    pg.fill('#p-presupuesto', '5000000')
    pg.click('button:has-text("Registrar proyecto")')
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('crear ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(600)
    assert pg.locator('table tbody tr', has_text='TEST-UI-PRJ-02').count() == 1, \
        'el proyecto creado debe aparecer en el listado'

    # CU-02 Alt 1: fechas inconsistentes -> la interfaz muestra el error.
    pg.click('text=Nuevo proyecto')
    pg.wait_for_selector('#p-codigo')
    pg.fill('#p-codigo', 'TEST-UI-PRJ-02B')
    pg.fill('#p-nombre', 'Fechas invertidas')
    pg.select_option('#p-cliente', index=1)
    pg.select_option('#p-responsable', index=1)
    pg.fill('#p-inicio', '2027-06-30')
    pg.fill('#p-fin', '2026-10-01')
    pg.fill('#p-ubicacion', 'Cucuta')
    pg.fill('#p-presupuesto', '1000000')
    pg.click('button:has-text("Registrar proyecto")')
    pg.wait_for_selector('[role=alert]', timeout=10000)
    print('fechas invertidas ->', pg.locator('[role=alert]').inner_text())
    assert 'anterior' in pg.locator('[role=alert]').inner_text().lower()

    # Código duplicado -> 409 y el mensaje se muestra.
    pg.fill('#p-inicio', '2026-11-01')
    pg.fill('#p-fin', '2027-03-31')
    pg.fill('#p-codigo', 'TEST-UI-PRJ-02')
    pg.click('button:has-text("Registrar proyecto")')
    pg.wait_for_selector('[role=alert]', timeout=10000)
    print('codigo duplicado ->', pg.locator('[role=alert]').inner_text())
    assert 'código' in pg.locator('[role=alert]').inner_text().lower()

    captura(pg, 'hu02_proyecto')
    navegador.close()

limpiar()
print('\nHU-02 (interfaz): TODAS LAS PRUEBAS PASARON')
