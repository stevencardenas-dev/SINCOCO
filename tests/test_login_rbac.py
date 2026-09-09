# Prueba de HU-01 (RF01 · RNF05): login real y menu por rol.
#
# Requiere backend y frontend corriendo:
#   cd backend  && node src/server.js
#   cd frontend && npx vite
# y los usuarios sembrados con hash real:
#   cd backend && node scripts/seed.js
#
# Uso: python3 tests/test_login_rbac.py
from playwright.sync_api import sync_playwright

ESPERADO = {
 'admin':      ['Dashboard','Proyectos','Personal','Materiales','Herramientas','Alertas','Proveedores','Incidencias','Costos','Reportes','Auditoría','Usuarios'],
 'gerente':    ['Dashboard','Proyectos','Personal','Alertas','Proveedores','Incidencias','Costos','Reportes'],
 'maestro':    ['Dashboard','Proyectos','Materiales','Incidencias'],
 'bodega':     ['Dashboard','Materiales','Herramientas','Alertas'],
 'trabajador': ['Dashboard'],
}

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for usuario, esperado in ESPERADO.items():
        pg = b.new_page(viewport={"width":1440,"height":900})
        pg.goto('http://localhost:5173/login')
        pg.wait_for_load_state('networkidle')
        pg.fill('#username', usuario)
        pg.fill('#password', 'Prueba123!')
        pg.click('button[type=submit]')
        pg.wait_for_selector('aside nav a', timeout=8000)
        pg.wait_for_timeout(300)
        url = pg.url
        links = [a.strip() for a in pg.locator('aside nav a').all_inner_texts()]
        rol = pg.locator('aside').count() and pg.inner_text('header') if pg.locator('header').count() else ''
        ok = sorted(links)==sorted(esperado)
        print(f"{usuario:11} url={url.split('5173')[1]:12} menu={len(links):2} {'OK ' if ok else 'DIFF'} {links}")
        if not ok: print(f"{'':11} esperado: {esperado}")
        pg.screenshot(path=f'/tmp/claude-1000/-home-alvaro/5de88b02-ddd6-452e-ac72-8e6512891156/scratchpad/shot_{usuario}.png')
        pg.close()

    # credenciales malas
    pg = b.new_page(viewport={"width":1440,"height":900}); pg.goto('http://localhost:5173/login'); pg.wait_for_load_state('networkidle')
    pg.fill('#username','admin'); pg.fill('#password','incorrecta'); pg.click('button[type=submit]')
    try:
        pg.wait_for_selector('[role=alert]', timeout=8000)
        err = pg.locator('[role=alert]').inner_text()
    except Exception:
        err = '(sin mensaje)'
    print(f"\nlogin malo -> url={pg.url.split('5173')[1]}  mensaje={err!r}")
    pg.close()

    # acceso directo por URL a una ruta prohibida
    pg = b.new_page(viewport={"width":1440,"height":900}); pg.goto('http://localhost:5173/login'); pg.wait_for_load_state('networkidle')
    pg.fill('#username','trabajador'); pg.fill('#password','Prueba123!'); pg.click('button[type=submit]')
    pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(300)
    pg.goto('http://localhost:5173/usuarios'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(800)
    print(f"trabajador -> /usuarios  termina en {pg.url.split('5173')[1]}  {'BLOQUEADO OK' if pg.url.endswith('/') else 'ACCESO INDEBIDO'}")
    pg.close()
    b.close()
