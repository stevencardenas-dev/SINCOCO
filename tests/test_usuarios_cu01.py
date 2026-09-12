# Prueba de CU-01 (HU-01): registrar usuario y asignar rol.
# Requiere backend (3005) y frontend (5173) corriendo. Ver tests/test_login_rbac.py.
# Uso: python3 tests/test_usuarios_cu01.py
# CU-01 (HU-01): registrar usuario y asignar rol; bloquear/activar.
from playwright.sync_api import sync_playwright

def login(pg, u, p='Prueba123!'):
    pg.goto('http://localhost:5173/login'); pg.wait_for_load_state('networkidle')
    pg.fill('#username', u); pg.fill('#password', p)
    pg.click('button[type=submit]'); pg.wait_for_selector('aside nav a', timeout=8000)

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width':1440,'height':900})
    login(pg, 'admin')
    pg.goto('http://localhost:5173/usuarios'); pg.wait_for_selector('table tbody tr', timeout=8000)
    filas0 = pg.locator('table tbody tr').count()
    print(f"lista inicial: {filas0} usuarios")

    # flujo principal: crear con rol
    pg.click('text=Nuevo usuario'); pg.wait_for_selector('#u-username')
    pg.fill('#u-username','carlos.test'); pg.fill('#u-email','carlos.test@sincoco.test')
    pg.fill('#u-password','Test1234!'); pg.select_option('#u-rol', label='Maestro de obra')
    pg.click('button:has-text("Crear usuario")')
    pg.wait_for_selector('[role=status]', timeout=8000)
    print("crear ->", pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(500)
    filas1 = pg.locator('table tbody tr').count()
    fila = pg.locator('table tbody tr', has_text='carlos.test').inner_text().split('\n')
    print(f"lista ahora: {filas1} usuarios | fila: {[c.strip() for c in fila if c.strip()]}")

    # flujo alterno: duplicado
    pg.click('text=Nuevo usuario'); pg.wait_for_selector('#u-username')
    pg.fill('#u-username','carlos.test'); pg.fill('#u-email','otro@sincoco.test')
    pg.fill('#u-password','Test1234!'); pg.select_option('#u-rol', label='Encargado de bodega')
    pg.click('button:has-text("Crear usuario")')
    pg.wait_for_selector('[role=alert]', timeout=8000)
    print("duplicado ->", pg.locator('[role=alert]').inner_text())
    pg.click('button:has-text("Cancelar")')

    # flujo alterno: bloquear y activar
    pg.locator('table tbody tr', has_text='carlos.test').locator('button').click()
    pg.wait_for_selector('[role=status]', timeout=8000); pg.wait_for_timeout(400)
    print("bloquear ->", pg.locator('[role=status]').inner_text())
    estado = pg.locator('table tbody tr', has_text='carlos.test').inner_text()
    print("           estado en tabla:", 'BLOQUEADO' if 'BLOQUEADO' in estado else estado)

    # el bloqueado no puede entrar (backend valida estado)
    pg2 = b.new_page(viewport={'width':1440,'height':900})
    pg2.goto('http://localhost:5173/login'); pg2.wait_for_load_state('networkidle')
    pg2.fill('#username','carlos.test'); pg2.fill('#password','Test1234!')
    pg2.click('button[type=submit]')
    try:
        pg2.wait_for_selector('[role=alert]', timeout=8000)
        print("login de bloqueado ->", pg2.locator('[role=alert]').inner_text())
    except Exception: print("login de bloqueado -> ENTRÓ (mal)")
    pg2.close()

    # reactivar
    pg.locator('table tbody tr', has_text='carlos.test').locator('button').click()
    pg.wait_for_timeout(800)
    print("activar ->", pg.locator('[role=status]').inner_text())

    # un no-admin no ve la pantalla
    pg3 = b.new_page(viewport={'width':1440,'height':900})
    login(pg3,'bodega'); pg3.goto('http://localhost:5173/usuarios')
    pg3.wait_for_load_state('networkidle'); pg3.wait_for_timeout(600)
    print("bodega en /usuarios ->", pg3.url.split('5173')[1], "(BLOQUEADO OK)" if pg3.url.endswith('/') else "(ACCESO INDEBIDO)")
    pg3.close()
    pg.screenshot(path='/tmp/claude-1000/-home-alvaro/5de88b02-ddd6-452e-ac72-8e6512891156/scratchpad/shot_usuarios.png')
    b.close()
