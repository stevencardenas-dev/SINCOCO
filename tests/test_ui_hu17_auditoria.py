# Prueba de interfaz de HU-17 (AYD-29): consulta de la bitácora desde la pantalla.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: python3 tests/test_ui_hu17_auditoria.py
#
# Criterios: 3) solo el administrador ve la auditoría (el gerente es redirigido);
# 4) la pantalla filtra por usuario y por rango de fechas; 1 y 2) (sin coincidencias)
# CU-17 Alt: un criterio sin filas muestra el aviso de «no hay resultados».
from playwright.sync_api import sync_playwright
from ui_helper import login, ir_a, captura, BASE_UI

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)

    # Gerente: la ruta no se abre; vuelve al panel.
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg, 'gerente')
    ir_a(pg, '/auditoria')
    pg.wait_for_timeout(800)
    assert pg.url.rstrip('/') == BASE_UI.rstrip('/') or pg.url.endswith('/'), f'el gerente no debe ver la auditoría: {pg.url}'
    assert pg.get_by_text('Trazabilidad y auditoría').count() == 0, 'el gerente no debe ver la pantalla'
    pg.close()

    # Administrador: la bitácora carga y se puede filtrar por usuario.
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg, 'admin')
    ir_a(pg, '/auditoria')
    pg.wait_for_selector('table tbody tr', timeout=10000)
    assert pg.get_by_text('Trazabilidad y auditoría').count() >= 1, 'la pantalla de auditoría debe abrir'
    if pg.locator('#a-usuario').count() == 0:
        pg.get_by_role('button', name='Buscar en la bitácora').click()  # abre el panel de filtros
    filas_sin_filtro = pg.locator('table tbody tr').count()
    assert filas_sin_filtro > 0, 'la bitácora debe mostrar operaciones'

    pg.locator('#a-usuario').select_option(label='gerente')
    pg.wait_for_timeout(800)
    pg.wait_for_selector('table tbody tr', timeout=10000)
    usuarios = pg.locator('table tbody tr td:nth-child(2)').all_inner_texts()
    assert usuarios and all('gerente' in u.lower() for u in usuarios), f'filtro por usuario: {usuarios[:5]}'
    pg.locator('#a-usuario').select_option(value='')

    # CU-17 Alt: un rango de fechas sin operaciones -> aviso, sin error.
    pg.locator('#a-desde').fill('2001-01-01')
    pg.locator('#a-hasta').fill('2001-01-02')
    pg.get_by_text('No existen resultados para ese criterio').wait_for(timeout=10000)
    captura(pg, 'hu17_auditoria')
    navegador.close()

print('HU-17 UI OK')
