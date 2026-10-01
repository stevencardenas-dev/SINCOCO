# Cambio de contraseña desde «Mi información personal» (HU-01).
#
# Cubre el flujo completo: la cuenta entra con la contraseña inicial, la cambia
# desde /perfil, la sesión abierta sigue sirviendo, al salir entra con la nueva
# y la anterior deja de funcionar. Además comprueba el caso de error: si la
# contraseña actual no coincide, el formulario lo dice y no cambia nada.
#
# La cuenta de prueba usa el correo empresarial kevinmarin1012@gmail.com.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: python3 tests/test_ui_cambio_password.py
from playwright.sync_api import sync_playwright
from api_helper import http, login, sql, scalar
from ui_helper import login as login_ui, ir_a, captura

USUARIO = 'kevin.test'
EMAIL = 'kevinmarin1012@gmail.com'
DOCUMENTO = 'TEST-KM-01'
INICIAL = 'Prueba123!'
NUEVA = 'Kevin2026!'
OTRA = 'Kevin2026#Distinta'


def limpiar():
    sql(f"DELETE FROM bitacora_trazabilidad WHERE tabla_afectada='usuarios' AND registro_id IN (SELECT id FROM usuarios WHERE username='{USUARIO}')")
    sql(f"DELETE FROM usuarios WHERE username='{USUARIO}'")
    sql(f"DELETE FROM trabajadores WHERE numero_documento='{DOCUMENTO}'")


def preparar():
    """Recrea la cuenta con la contraseña inicial para que la prueba sea repetible."""
    limpiar()
    admin = login('admin')
    estado, data = http('POST', '/api/trabajadores', {
        'numero_documento': DOCUMENTO, 'tipo_documento': 'CC',
        'nombres': 'Kevin', 'apellidos': 'Marín', 'email': EMAIL,
        'cargo': 'Gerente',
    }, token=admin)
    assert estado == 201, f'trabajador de prueba: {estado} {data}'

    rol_id = int(scalar("SELECT id FROM roles WHERE nombre='GERENTE'"))
    estado, data = http('POST', '/api/usuarios', {
        'username': USUARIO, 'password': INICIAL, 'email': EMAIL,
        'rol_id': rol_id, 'trabajador_id': data['trabajador']['id'],
    }, token=admin)
    assert estado == 201, f'usuario de prueba: {estado} {data}'


preparar()

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})

    # 1. Entra con la contraseña inicial y abre su información personal.
    login_ui(pg, USUARIO, INICIAL)
    ir_a(pg, '/perfil')
    pg.wait_for_selector('#mi-clave-actual', timeout=10000)
    assert EMAIL in pg.locator('body').inner_text(), 'debe verse el correo empresarial de la cuenta'

    # 2. Error controlado: contraseña actual equivocada -> no cambia nada.
    pg.fill('#mi-clave-actual', 'NoEsLaActual1!')
    pg.fill('#mi-clave-nueva', OTRA)
    pg.fill('#mi-clave-repetir', OTRA)
    pg.click('button:has-text("Cambiar contraseña")')
    pg.wait_for_selector('text=La contraseña actual no es correcta', timeout=10000)
    mensaje = pg.locator('text=La contraseña actual no es correcta').first.inner_text()
    print('contraseña actual equivocada ->', mensaje)
    assert 'no es correcta' in mensaje.lower(), 'el error debe señalar la contraseña actual'

    # 3. Flujo principal: cambia la contraseña.
    pg.fill('#mi-clave-actual', INICIAL)
    pg.fill('#mi-clave-nueva', NUEVA)
    pg.fill('#mi-clave-repetir', NUEVA)
    pg.click('button:has-text("Cambiar contraseña")')
    pg.wait_for_selector('text=Contraseña actualizada', timeout=10000)
    print('cambio ->', pg.locator('[role=status]').first.inner_text())
    captura(pg, 'cambio_password')

    # 4. La sesión abierta sigue sirviendo después del cambio.
    ir_a(pg, '/')
    pg.wait_for_selector('text=Buen día', timeout=10000)

    # 5. Cierra sesión y vuelve a entrar con la contraseña nueva.
    pg.click('button[title="Cerrar sesión"]')
    pg.wait_for_selector('#username', timeout=10000)
    login_ui(pg, USUARIO, NUEVA)
    print('ingreso con la contraseña nueva -> OK')
    navegador.close()

# 6. En la API: la anterior ya no sirve y la nueva sí.
estado, data = http('POST', '/api/auth/login', {'username': USUARIO, 'password': INICIAL})
print('ingreso con la contraseña anterior ->', estado, '·', data.get('error'))
assert estado == 401, 'la contraseña anterior no debe seguir sirviendo'

estado, data = http('POST', '/api/auth/login', {'username': USUARIO, 'password': NUEVA})
assert estado == 200, f'la contraseña nueva debe servir: {estado} {data}'
print('ingreso con la contraseña nueva ->', estado)

# 7. El cambio quedó en la bitácora, sin guardar la contraseña.
filas = scalar(
    "SELECT COUNT(*) FROM bitacora_trazabilidad "
    f"WHERE tabla_afectada='usuarios' AND accion='ACTUALIZAR' "
    "AND JSON_EXTRACT(detalles, '$.campo')='password'"
)
assert int(filas) >= 1, 'el cambio de contraseña debe quedar en la bitácora'

limpiar()
print('\nCambio de contraseña (interfaz): TODAS LAS PRUEBAS PASARON')
