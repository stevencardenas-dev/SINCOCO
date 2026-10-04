# Prueba de interfaz de «Dar de baja» y «Reactivar» en Personal (HU-04 · HU-18).
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu18_baja.py
#
# Retirar a una persona no es un estado: el selector de la tabla solo ofrece
# Activo, Vacaciones y Licencia. «⚠️ Dar de baja» está en el formulario de
# edición, pide confirmación y deja al trabajador fuera de la lista; con
# «Incluir dados de baja» aparece como Inactivo y se reactiva desde su fila.
import re

from playwright.sync_api import sync_playwright
from api_helper import limpiar, crear_trabajador, login as login_api
from ui_helper import login, ir_a, captura

DOC = 'TEST-UI-CC-18'

limpiar()
admin = login_api('admin')
crear_trabajador(admin, DOC)

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/personal')
    pg.wait_for_selector('table tbody tr', timeout=10000)

    fila = pg.locator('table tbody tr', has_text=DOC)
    assert fila.count() == 1, 'el trabajador activo debe listarse'
    assert 'Disponible' in fila.inner_text(), 'al crear debe estar disponible'

    # Inactivo ya no se elige a mano.
    opciones = fila.locator('select[aria-label^="Estado de"] option').all_text_contents()
    assert 'Inactivo' not in opciones, f'el selector no debe ofrecer Inactivo: {opciones}'

    # Un estado temporal deja de estar disponible sin salir de la lista.
    fila.locator('select[aria-label^="Estado de"]').select_option(label='Vacaciones')
    pg.wait_for_selector('[role=status]', timeout=10000)
    pg.wait_for_timeout(800)
    fila = pg.locator('table tbody tr', has_text=DOC)
    assert 'No disponible' in fila.inner_text(), 'Vacaciones no está disponible'
    fila.locator('select[aria-label^="Estado de"]').select_option(label='Activo')
    pg.wait_for_timeout(800)

    # «⚠️ Dar de baja» en el formulario de edición, con confirmación.
    fila = pg.locator('table tbody tr', has_text=DOC)
    fila.get_by_role('button', name=re.compile('Actualizar información')).click()
    editar = pg.get_by_role('dialog', name='Actualizar información del trabajador')
    editar.get_by_role('button', name=re.compile('Dar de baja')).click()
    confirmar = pg.get_by_role('dialog', name=re.compile('Dar de baja a'))
    confirmar.wait_for()

    # Cancelar no da de baja.
    confirmar.get_by_role('button', name='Cancelar').click()
    assert editar.is_visible(), 'Cancelar vuelve al formulario'

    editar.get_by_role('button', name=re.compile('Dar de baja')).click()
    confirmar.get_by_role('button', name='Dar de baja', exact=True).click()
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('dar de baja ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(800)
    assert pg.locator('table tbody tr', has_text=DOC).count() == 0, \
        'dado de baja: no aparece en la lista por defecto'

    # Con el filtro explícito aparece como Inactivo y solo se puede reactivar.
    pg.get_by_role('button', name='Incluir dados de baja').click()
    fila = pg.locator('table tbody tr', has_text=DOC)
    fila.wait_for(timeout=10000)
    texto = fila.inner_text()
    assert 'Inactivo' in texto and 'De baja desde' in texto, f'debe verse Inactivo con fecha: {texto}'
    assert fila.get_by_role('button', name=re.compile('Actualizar información')).count() == 0, \
        'un registro dado de baja no se edita'
    captura(pg, 'hu18_baja')

    fila.get_by_role('button', name=re.compile('Reactivar')).click()
    pg.wait_for_selector('text=Se reactivó', timeout=10000)
    pg.wait_for_timeout(800)
    fila = pg.locator('table tbody tr', has_text=DOC)
    assert fila.locator('select[aria-label^="Estado de"]').input_value() == 'ACTIVO', \
        'reactivado: vuelve como Activo'

    navegador.close()

limpiar()
print('\nDar de baja y reactivar (interfaz): TODAS LAS PRUEBAS PASARON')
