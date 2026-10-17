# Prueba de interfaz de HU-31: extender una asignación y ver su historial.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: python3 tests/test_ui_hu31_extension_asignacion.py
import re

from playwright.sync_api import sync_playwright
from api_helper import http, limpiar, login as login_api, crear_proyecto, crear_trabajador
from ui_helper import login, ir_a, captura

limpiar()
admin = login_api('admin')
proyecto = crear_proyecto(admin)  # 2026-10-01 -> 2027-06-30
trabajador = crear_trabajador(admin, 'TEST-UI-CC-31')
estado, r = http('POST', '/api/asignaciones', {'trabajador_id': trabajador, 'proyecto_id': proyecto, 'actividad_id': None,
                 'fecha_inicio': '2026-10-05', 'fecha_fin_programada': '2026-10-20'}, token=admin)
assert estado == 201, r

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, f'/proyectos/{proyecto}')
    fila = pg.locator('table tbody tr', has_text='Prueba Sprint')
    fila.first.wait_for(timeout=10000)
    # HU-05: las asignaciones del trabajador se ven en un diálogo propio.
    fila.get_by_role('button', name='Ver asignaciones').first.click()
    grupo = pg.get_by_role('dialog', name='Prueba Sprint')
    grupo.get_by_role('button', name='Extender').first.click()
    dlg = pg.get_by_role('dialog', name='Extender asignación')

    # Fecha fuera del proyecto -> el sistema rechaza e indica el límite.
    dlg.locator('#ext-fecha').fill('2027-07-15')
    dlg.locator('#ext-motivo').fill('Más tiempo')
    dlg.get_by_role('button', name='Extender').click()
    dlg.get_by_role('alert').wait_for(timeout=10000)
    assert '2027-06-30' in dlg.get_by_role('alert').inner_text()

    # Extensión válida: queda en el historial junto a la fecha original.
    dlg.locator('#ext-fecha').fill('2026-11-10')
    dlg.get_by_role('button', name='Extender').click()
    dlg.get_by_text('Más tiempo').wait_for(timeout=10000)
    texto = dlg.inner_text()
    assert 'Fecha fin original' in texto and 'Fecha fin vigente' in texto, texto
    dlg.get_by_role('button', name='Cancelar').click()
    pg.get_by_role('status').filter(has_text='extendida').wait_for(timeout=10000)
    fila = grupo.locator('table tbody tr').first
    assert re.search(r'10\W+nov', fila.inner_text(), re.I), fila.inner_text()
    captura(pg, 'hu31_extension')

    pg2 = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg2, 'gerente')
    ir_a(pg2, f'/proyectos/{proyecto}')
    pg2.locator('table tbody tr', has_text='Prueba Sprint').first.get_by_role('button', name='Ver asignaciones').click()
    g = pg2.get_by_role('dialog', name='Prueba Sprint')
    g.get_by_role('button', name='Historial').first.wait_for(timeout=10000)
    assert g.get_by_role('button', name='Extender').count() == 0, 'el gerente no debe ver Extender'
    g.get_by_role('button', name='Historial').first.click()
    pg2.get_by_role('dialog', name='Historial de la asignación').wait_for(timeout=10000)
    assert pg2.locator('#ext-fecha').count() == 0, 'el gerente no debe ver el formulario'
    navegador.close()

limpiar()
print('HU-31 UI OK')
