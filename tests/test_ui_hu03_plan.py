# Prueba de interfaz de HU-03 (RF03 · RF04): etapas y actividades del plan.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu03_plan.py
from playwright.sync_api import sync_playwright
from api_helper import limpiar, crear_proyecto, login as login_api
from ui_helper import login, ir_a, captura

limpiar()
admin = login_api('admin')
proyecto_id = crear_proyecto(admin, 'TEST-UI-PRJ-03')

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/proyectos')
    pg.wait_for_selector('table tbody tr', timeout=10000)

    # Entrar al plan del proyecto de prueba.
    pg.locator('tr', has_text='TEST-UI-PRJ-03').locator('a:has-text("Plan")').click()
    pg.wait_for_selector('text=Nueva etapa', timeout=10000)
    assert f'/proyectos/{proyecto_id}' in pg.url, f'debe abrir el plan del proyecto: {pg.url}'

    # Criterio 2 + 5: definir una etapa (queda PENDIENTE).
    pg.click('text=Nueva etapa')
    pg.wait_for_selector('#e-nombre')
    pg.fill('#e-nombre', 'TEST-UI-Etapa')
    pg.fill('#e-inicio', '2026-10-01')
    pg.fill('#e-fin', '2026-12-01')
    pg.click('button:has-text("Registrar etapa")')
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('crear etapa ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(600)
    assert pg.locator('text=TEST-UI-Etapa').count() >= 1, 'la etapa debe aparecer en el plan'

    # Criterio 3: fecha fuera del rango del proyecto -> la interfaz muestra el error.
    pg.click('text=Nueva etapa')
    pg.wait_for_selector('#e-nombre')
    pg.fill('#e-nombre', 'TEST-UI-Etapa fuera')
    pg.fill('#e-inicio', '2099-01-01')
    pg.click('button:has-text("Registrar etapa")')
    pg.wait_for_selector('[role=alert]', timeout=10000)
    print('etapa fuera de rango ->', pg.locator('[role=alert]').inner_text())
    assert 'posterior' in pg.locator('[role=alert]').inner_text().lower()
    pg.click('button:has-text("Cancelar")')

    # Criterio 4: actividad con responsable y fechas.
    pg.locator('button:has-text("Actividad")').first.click()
    pg.wait_for_selector('input[id^="a-nombre-"]')
    pg.fill('input[id^="a-nombre-"]', 'TEST-UI-Actividad')
    # El responsable es un campo con búsqueda: se escribe y se elige.
    pg.fill('input[id^="a-resp-"]', 'Prueba')
    pg.locator('ul[id$="-opciones"] li', has_text='Prueba').first.click()
    pg.fill('input[id^="a-inicio-"]', '2026-10-05')
    pg.fill('input[id^="a-fin-"]', '2026-11-05')
    pg.click('button:has-text("Registrar actividad")')
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('crear actividad ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(600)
    assert pg.locator('text=TEST-UI-Actividad').count() >= 1, 'la actividad debe aparecer'

    captura(pg, 'hu03_plan')
    navegador.close()

limpiar()
print('\nHU-03 (interfaz): TODAS LAS PRUEBAS PASARON')
