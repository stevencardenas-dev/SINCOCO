# Prueba de interfaz de HU-04 (RF06): registrar personal desde la pantalla.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu04_personal.py
from playwright.sync_api import sync_playwright
from api_helper import limpiar
from ui_helper import login, ir_a, captura

limpiar()

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/personal')
    pg.wait_for_selector('text=Nuevo trabajador', timeout=10000)

    # Criterio 2 (interfaz): sin especialidad, el backend señala el campo.
    pg.click('text=Nuevo trabajador')
    pg.wait_for_selector('#t-doc')
    pg.fill('#t-doc', 'TEST-UI-CC-01')
    pg.fill('#t-nombres', 'Ulises')
    pg.fill('#t-apellidos', 'Interfaz')
    pg.fill('#t-cargo', 'Obrero')
    pg.click('button:has-text("Registrar trabajador")')
    pg.wait_for_selector('[role=alert]', timeout=10000)
    print('sin especialidad ->', pg.locator('[role=alert]').inner_text())
    assert 'especialidad' in pg.locator('[role=alert]').inner_text().lower()

    # Flujo principal: con especialidad se registra y aparece en la tabla.
    pg.fill('#t-especialidad', 'Mamposteria')
    pg.click('button:has-text("Registrar trabajador")')
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('crear ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(600)
    fila = pg.locator('table tbody tr', has_text='TEST-UI-CC-01')
    assert fila.count() == 1, 'el trabajador creado debe aparecer en la tabla'
    texto = fila.inner_text().replace('\n', ' | ')
    print('fila ->', texto)
    assert 'Obrero' in texto and 'Mamposteria' in texto

    # Duplicado: el backend responde 409 y la interfaz lo muestra.
    pg.click('text=Nuevo trabajador')
    pg.wait_for_selector('#t-doc')
    pg.fill('#t-doc', 'TEST-UI-CC-01')
    pg.fill('#t-nombres', 'Otro')
    pg.fill('#t-apellidos', 'Duplicado')
    pg.fill('#t-cargo', 'Obrero')
    pg.fill('#t-especialidad', 'Mamposteria')
    pg.click('button:has-text("Registrar trabajador")')
    pg.wait_for_selector('[role=alert]', timeout=10000)
    print('duplicado ->', pg.locator('[role=alert]').inner_text())
    assert 'documento' in pg.locator('[role=alert]').inner_text().lower()

    captura(pg, 'hu04_personal')
    navegador.close()

limpiar()
print('\nHU-04 (interfaz): TODAS LAS PRUEBAS PASARON')
