# Presentación del primer sprint (revisión del PO).
#
# Cubre los ajustes pedidos para que la interfaz se vea de producto y no de
# maqueta:
#   - la columna «Acciones» de /proyectos y /personal no se desborda: los
#     botones se apilan en vertical dentro de su celda;
#   - ningún texto visible menciona historias de usuario ni requerimientos
#     (HU-04, RF06, CU-02…): los módulos pendientes se marcan «Próximamente»;
#   - el costo consolidado del panel se abrevia en millones (M) o miles de
#     millones (B) y no se sale de su tarjeta.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: python3 tests/test_ui_presentacion.py
import re

from playwright.sync_api import sync_playwright
from api_helper import http, limpiar, login, scalar, sql, crear_proyecto
from ui_helper import BASE_UI, captura, ir_a, login as login_ui

CODIGO = 'TEST-HU-PRESENT-01'
CODIGO_GRANDE = 'TEST-HU-PRESENT-02'
PATRON_CODIGOS = re.compile(r'\b(HU-\d{1,2}|RF\d{1,2}|CU-\d{1,2}|RNF\d{1,2}|RN\d{1,2})\b')

RUTAS = ['/', '/proyectos', '/personal', '/perfil', '/usuarios', '/roles', '/catalogo', '/auditoria']


def limpiar_datos():
    sql("DELETE FROM asignaciones_personal WHERE proyecto_id IN "
        "(SELECT id FROM proyectos WHERE codigo LIKE 'TEST-HU-PRESENT-%')")
    sql("DELETE FROM proyectos WHERE codigo LIKE 'TEST-HU-PRESENT-%'")
    limpiar()


limpiar_datos()
admin = login('admin')
proyecto_id = crear_proyecto(admin, CODIGO)

# Un proyecto con presupuesto de miles de millones: es el caso que desbordaba
# la tarjeta de costo consolidado.
grande = crear_proyecto(admin, CODIGO_GRANDE)
estado, data = http('PATCH', f'/api/proyectos/{grande}',
                    {'presupuesto_inicial': 12_500_000_000}, token=admin)
assert estado == 200, f'presupuesto grande: {estado} {data}'

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login_ui(pg)

    # --- Acciones en /proyectos: apiladas en vertical -------------------------
    ir_a(pg, '/proyectos')
    pg.wait_for_selector('table tbody tr', timeout=10000)
    fila = pg.locator('table tbody tr', has_text=CODIGO).first
    # Las acciones viven en su columna; la última celda es la ficha móvil («Ver ficha»),
    # así que se buscan por su etiqueta y no por la posición.
    botones = fila.locator('button[aria-label^="Actualizar"], button[aria-label^="Dar de baja"]')
    assert botones.count() == 2, f'la fila debe tener dos acciones: {botones.count()}'
    caja1, caja2 = botones.nth(0).bounding_box(), botones.nth(1).bounding_box()
    print('acciones /proyectos ->', caja1['x'], caja1['y'], '|', caja2['x'], caja2['y'])
    assert abs(caja1['x'] - caja2['x']) < 4, 'las acciones deben alinearse en la misma columna'
    assert caja2['y'] > caja1['y'] + 10, 'una acción debe quedar debajo de la otra, no al lado'

    # --- Acciones en /personal: dentro de su celda ----------------------------
    ir_a(pg, '/personal')
    pg.wait_for_selector('table tbody tr', timeout=10000)
    # La celda «Ver ficha» es la última y está oculta en escritorio: la acción
    # se ubica por su etiqueta y su celda se obtiene desde el propio botón.
    boton = pg.locator('table tbody tr').first.locator('button[aria-label^="Actualizar información"]').first
    assert boton.count() == 1, 'cada trabajador activo debe tener su acción de edición'
    caja_boton = boton.bounding_box()
    caja_celda = boton.evaluate(
        '(el) => { const r = el.closest("td").getBoundingClientRect();'
        ' return { x: r.x, y: r.y, width: r.width, height: r.height } }')
    print('acción /personal ->', caja_boton, 'celda', caja_celda['width'])
    assert caja_boton['x'] >= caja_celda['x'] - 1, 'la acción no debe salirse de su celda'
    assert caja_boton['x'] + caja_boton['width'] <= caja_celda['x'] + caja_celda['width'] + 1, \
        'la acción no debe desbordar la celda'

    # --- Ningún código de historia o requerimiento a la vista -----------------
    for ruta in RUTAS:
        ir_a(pg, ruta)
        pg.wait_for_timeout(400)
        texto = pg.locator('body').inner_text()
        encontrados = PATRON_CODIGOS.findall(texto)
        print(f'{ruta:12} códigos visibles ->', encontrados or 'ninguno')
        assert not encontrados, f'{ruta} no debe mostrar códigos internos: {encontrados}'

    # --- El buscador de la barra superior filtra proyectos --------------------
    ir_a(pg, '/')
    busqueda = pg.locator('input[aria-label="Buscar proyecto"]')
    assert busqueda.count() == 1, 'el administrador debe ver el buscador de proyectos'
    busqueda.fill(CODIGO)
    busqueda.press('Enter')
    pg.wait_for_selector('table tbody tr', timeout=10000)
    pg.wait_for_timeout(400)
    filas = pg.locator('table tbody tr').count()
    print('búsqueda desde la barra superior ->', filas, 'resultado(s) ·', pg.url.split('5173')[1])
    assert filas == 1, 'la búsqueda debe dejar solo el proyecto buscado'
    assert CODIGO in pg.locator('table tbody tr').first.inner_text(), \
        'la fila mostrada debe ser el proyecto buscado'

    # Los módulos pendientes se anuncian como «Próximamente».
    ir_a(pg, '/materiales')
    pg.wait_for_selector('text=Próximamente', timeout=10000)
    print('módulo pendiente -> Próximamente')
    ir_a(pg, '/reportes')
    pg.wait_for_selector('text=Próximamente', timeout=10000)

    # --- Costo consolidado abreviado y sin desbordarse ------------------------
    ir_a(pg, '/')
    pg.wait_for_selector('text=Costo consolidado', timeout=10000)
    valor = pg.locator('p[title]', has_text='$').first
    texto_valor = valor.inner_text()
    completo = valor.get_attribute('title')
    desborda = valor.evaluate('(el) => el.scrollWidth > el.clientWidth + 1')
    print('costo consolidado ->', texto_valor, '· valor exacto:', completo, '· desborda:', desborda)
    assert re.match(r'^\$ [\d.,]+ [MB]$', texto_valor), \
        f'el costo debe venir abreviado en millones o miles de millones: {texto_valor!r}'
    assert not desborda, 'el valor abreviado no debe desbordar su tarjeta'
    assert len(completo) > len(texto_valor), 'el valor exacto queda disponible al pasar el cursor'
    captura(pg, 'presentacion')

    # --- El icono de la pestaña es el logo nuevo ------------------------------
    # Vive en src/assets (no en public/) para que Vite le ponga hash al compilar
    # (/assets/favicon-<hash>.svg en el sitio publicado, /src/assets/favicon.svg
    # en desarrollo). En public/ volvería a ser /favicon.svg sin hash y el
    # navegador se quedaría con el logo anterior hasta un año, porque el
    # despliegue publica el resto de los archivos con caché inmutable.
    icono = pg.get_attribute('link[rel="icon"]', 'href')
    print('icono de la pestaña ->', icono)
    assert icono != '/favicon.svg', \
        'el icono no debe ser la ruta sin hash: el navegador la guarda un año'
    assert re.match(r'^/(src/)?assets/favicon[\w.-]*\.svg$', icono or ''), \
        f'el icono debe venir de src/assets/favicon.svg: {icono!r}'
    respuesta = pg.request.get(f'{BASE_UI}{icono}')
    assert respuesta.status == 200, f'el icono debe responder 200: {respuesta.status}'

    navegador.close()

limpiar_datos()
print('\nPresentación del primer sprint: TODAS LAS PRUEBAS PASARON')
