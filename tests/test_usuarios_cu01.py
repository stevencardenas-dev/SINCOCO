# Prueba de CU-01 (HU-01): registrar usuario y asignar rol.
# Requiere backend (3005) y frontend (5173) corriendo. Ver tests/test_login_rbac.py.
# Uso: python3 tests/test_usuarios_cu01.py
# CU-01 (HU-01): registrar usuario y asignar rol; bloquear/activar.
from playwright.sync_api import sync_playwright

# Precondiciones de datos: esta prueba crea un usuario y lo vincula a un
# trabajador (usuarios.trabajador_id es UNIQUE). Se elimina el usuario de una
# corrida anterior —lo que libera su trabajador— y, si aun así no hay ninguno
# libre, se registra uno de prueba.
from api_helper import login as _login_api, http as _http, scalar as _scalar, sql as _sql
from ui_helper import captura

_token = _login_api('admin')
_sql("DELETE FROM usuarios WHERE username='carlos.test'")
if _scalar(
    'SELECT COUNT(*) FROM trabajadores t LEFT JOIN usuarios u ON u.trabajador_id = t.id '
    'WHERE u.id IS NULL AND t.activo = 1'
) == '0':
    # La especialidad sale del catálogo (ya no es texto libre): 'General' no existe.
    _estado, _data = _http('POST', '/api/trabajadores', {
        'numero_documento': 'TEST-HU-CU01', 'tipo_documento': 'CC',
        'nombres': 'Trabajador', 'apellidos': 'Sin cuenta',
        'cargo': 'Operario', 'especialidad': 'Mamposteria',
    }, token=_token)
    assert _estado in (201, 409), f'trabajador de prueba CU-01: {_estado} {_data}'

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
    # criterio 1: la cuenta debe vincularse a un trabajador (usuarios.trabajador_id).
    # #u-trabajador es un buscador con lista (combobox), no un <select>.
    pg.fill('#u-trabajador', 'Trabajador')
    pg.locator('#u-trabajador-opciones li[role=option]').first.click()
    pg.click('button:has-text("Crear usuario")')
    pg.wait_for_selector('[role=status]', timeout=8000)
    print("crear ->", pg.locator('[role=status]').inner_text())
    pg.wait_for_timeout(500)
    filas1 = pg.locator('table tbody tr').count()
    fila = pg.locator('table tbody tr', has_text='carlos.test').inner_text().split('\n')
    print(f"lista ahora: {filas1} usuarios | fila: {[c.strip() for c in fila if c.strip()]}")

    # criterio 1: el buscador ya no ofrece al trabajador recien vinculado
    pg.click('text=Nuevo usuario'); pg.wait_for_selector('#u-trabajador')
    pg.fill('#u-trabajador', 'Trabajador')
    pg.wait_for_timeout(300)
    libres = pg.locator('#u-trabajador-opciones li[role=option]').count()
    print(f"trabajadores sin cuenta que ofrece el buscador: {libres}")
    pg.click('button:has-text("Cancelar")')

    # flujo alterno 1: duplicado. Se valida contra la API porque el formulario
    # exige trabajador y ya no hay ninguno libre que seleccionar.
    tok = pg.evaluate("() => localStorage.getItem('sincoco_token')")
    dup = pg.evaluate("""async ([t]) => {
        const r = await fetch('http://localhost:3005/api/usuarios', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
          body: JSON.stringify({username:'carlos.test',email:'otro@sincoco.test',
                                password:'Test1234!',rol_id:4,trabajador_id:1})});
        return [r.status, await r.text()];
      }""", [tok])
    print("duplicado ->", dup[0], dup[1])
    assert dup[0] == 409, f"se esperaba 409, llego {dup[0]}"

    # flujo alterno 3: cambiar el rol de un usuario existente
    fila = pg.locator('table tbody tr', has_text='carlos.test')
    print("rol antes ->", fila.inner_text().split('\t')[2] if '\t' in fila.inner_text() else 'Maestro de obra')
    pg.select_option('select[aria-label="Rol de carlos.test"]', label='Encargado de bodega')
    pg.wait_for_selector('[role=status]', timeout=8000); pg.wait_for_timeout(400)
    print("cambiar rol ->", pg.locator('[role=status]').inner_text())

    # flujo alterno: bloquear y activar
    pg.locator('table tbody tr', has_text='carlos.test').locator(
        'button:has-text("Bloquear"), button:has-text("Activar")').click()
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
    pg.locator('table tbody tr', has_text='carlos.test').locator(
        'button:has-text("Bloquear"), button:has-text("Activar")').click()
    pg.wait_for_timeout(800)
    print("activar ->", pg.locator('[role=status]').inner_text())

    # un no-admin no ve la pantalla
    pg3 = b.new_page(viewport={'width':1440,'height':900})
    login(pg3,'bodega'); pg3.goto('http://localhost:5173/usuarios')
    pg3.wait_for_load_state('networkidle'); pg3.wait_for_timeout(600)
    print("bodega en /usuarios ->", pg3.url.split('5173')[1], "(BLOQUEADO OK)" if pg3.url.endswith('/') else "(ACCESO INDEBIDO)")
    pg3.close()
    captura(pg, 'usuarios_cu01')
    b.close()
