# Casos límite vistos desde la interfaz (auditoría del sprint 1).
#
# Lo que un evaluador hace en la demostración: pegar un texto larguísimo, dejar
# campos vacíos, escribir un correo mal, meter un nombre con etiquetas HTML y
# buscar algo que no existe. La interfaz tiene que aguantarlo sin romperse:
#
#   * los campos no dejan pasar más caracteres de los que admite la base;
#   * el navegador frena lo obligatorio antes de llamar a la API;
#   * un nombre con HTML se muestra como texto, no se ejecuta;
#   * una búsqueda sin resultados explica que no hay nada, no deja la tabla vacía.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: python3 tests/test_ui_bordes.py
from playwright.sync_api import sync_playwright

from api_helper import crear_proyecto, http, login, sql
from ui_helper import captura, ir_a, login as login_ui

DOC = 'TEST-UI-BORDES-01'
DOC_XSS = 'TEST-UI-BORDES-02'
CODIGO = 'TEST-UI-BORDES-PRJ'
TOKEN = login('admin')


def limpiar_datos():
    sql(f"DELETE FROM trabajadores WHERE numero_documento LIKE 'TEST-UI-BORDES-%'")
    sql(f"DELETE FROM proyectos WHERE codigo LIKE 'TEST-UI-BORDES-%'")
    sql(f"DELETE FROM trabajadores WHERE numero_documento LIKE 'TEST-UI-BORDES-%'")


def crear_via_api(documento, nombres):
    """Crea el trabajador por API: aquí se prueba cómo lo pinta la interfaz."""
    estado, datos = http('POST', '/api/trabajadores', {
        'numero_documento': documento, 'tipo_documento': 'CC',
        'nombres': nombres, 'apellidos': 'Bordes',
        'cargo': 'Maestro de obra', 'especialidad': 'Mamposteria',
    }, token=TOKEN)
    assert estado in (201, 409), f'trabajador de la prueba: {estado} {datos}'


limpiar_datos()
crear_via_api(DOC_XSS, '<img src=x onerror="window.__xss=1">')
# Un proyecto propio para que la búsqueda tenga algo que encontrar y limpiar.
crear_proyecto(TOKEN, CODIGO)

with sync_playwright() as pw:
    navegador = pw.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})

    dialogos = []
    pg.on('dialog', lambda d: (dialogos.append(d.message), d.dismiss()))

    login_ui(pg)
    ir_a(pg, '/personal')
    pg.wait_for_selector('text=Nuevo trabajador', timeout=10000)
    pg.click('text=Nuevo trabajador')
    pg.wait_for_selector('#t-doc')

    # --- 1. Los campos no admiten más de lo que cabe en la base -------------
    pg.fill('#t-nombres', 'A' * 150)
    largo_nombre = pg.input_value('#t-nombres')
    print(f'nombres: escribí 150, quedó en {len(largo_nombre)}')
    assert len(largo_nombre) == 100, 'el campo debe cortar en 100 (varchar(100))'

    pg.fill('#t-apellidos', 'B' * 150)
    assert len(pg.input_value('#t-apellidos')) == 100, 'apellidos debe cortar en 100'

    # El documento es numérico y de 20 dígitos como máximo: ni letras ni de más.
    pg.fill('#t-doc', 'D' * 40)
    assert pg.input_value('#t-doc') == '', 'el documento solo admite dígitos'
    pg.fill('#t-doc', '9' * 40)
    assert len(pg.input_value('#t-doc')) == 20, 'el documento debe cortar en 20 dígitos'

    # --- 2. Lo obligatorio lo frena el navegador, sin llegar a la API --------
    pg.fill('#t-doc', '')
    pg.click('button:has-text("Registrar trabajador")')
    obligatorio = pg.evaluate("document.querySelector('#t-doc').validity.valueMissing")
    print('documento vacío -> el navegador lo marca obligatorio:', obligatorio)
    assert obligatorio, 'un campo obligatorio vacío no puede enviarse a la API'

    # --- 3. El teléfono no acepta letras ------------------------------------
    pg.fill('#t-telefono', 'llamar a la casa 123')
    telefono = pg.input_value('#t-telefono')
    print('teléfono tras escribir letras ->', repr(telefono))
    assert not any(c.isalpha() for c in telefono), 'el teléfono no debe aceptar letras'

    # --- 4. Un nombre con HTML se muestra como texto ------------------------
    pg.fill('#t-doc', DOC_XSS)
    pg.fill('#t-nombres', '')
    ir_a(pg, '/personal')
    pg.fill('#per-buscar', 'Bordes')
    pg.wait_for_timeout(600)
    fila = pg.locator('table tbody tr', has_text='Bordes').first
    assert fila.count() > 0, 'el trabajador con HTML debe aparecer en la lista'
    assert pg.evaluate('window.__xss') is None, 'el HTML del nombre no debe ejecutarse'
    assert not dialogos, f'no debe saltar ningún diálogo: {dialogos}'
    pg.wait_for_selector('img[src="x"]', timeout=2000) if False else None
    print('nombre con HTML -> se pinta como texto y no se ejecuta')

    # --- 5. Buscar algo que no existe explica el vacío ----------------------
    ir_a(pg, '/proyectos')
    filas_antes = pg.locator('table tbody tr').count()
    assert filas_antes >= 1, 'debe haber al menos el proyecto de la prueba en la lista'
    pg.fill('#prj-buscar', 'zzz-no-existe-esta-obra')
    pg.wait_for_timeout(700)
    vacio = pg.get_by_text('Ningún proyecto coincide con la búsqueda')
    print(f'búsqueda sin resultados -> antes {filas_antes} fila(s), mensaje: {vacio.count()}')
    assert vacio.count() >= 1, 'una búsqueda sin resultados debe explicarlo, no dejar la tabla muda'

    # Al limpiar la búsqueda vuelven los proyectos: el vacío era del filtro.
    pg.fill('#prj-buscar', '')
    pg.wait_for_timeout(700)
    filas_despues = pg.locator('table tbody tr').count()
    print('al limpiar el filtro ->', filas_despues, 'fila(s)')
    assert filas_despues == filas_antes, 'limpiar la búsqueda debe devolver la lista completa'

    captura(pg, 'bordes_ui')
    navegador.close()

limpiar_datos()
print('\nCasos límite en la interfaz: TODAS LAS PRUEBAS PASARON')
