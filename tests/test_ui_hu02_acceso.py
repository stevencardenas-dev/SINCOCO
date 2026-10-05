# Prueba de interfaz del acceso a proyectos (/proyectos/:id) y del botón Plan.
#
# Requiere backend (3005) y frontend (5173) corriendo.
# Uso: .venv/Scripts/python.exe tests/test_ui_hu02_acceso.py
#
# Verifica:
#  - el botón «Plan» de /proyectos es amarillo, como los demás botones de acción;
#  - «Acceso al proyecto» tiene dos bloques retráctiles, cerrados al abrir;
#  - Inicio y Fin no limitan el calendario y sugieren las fechas del proyecto;
#  - «Rol» pasó a «Descripción de la asignación» y se muestra recortada, con copiar;
#  - asignar a «Todo el proyecto» funciona;
#  - la búsqueda filtra por descripción y ya no hay filtro por rol.
from playwright.sync_api import sync_playwright
from api_helper import limpiar, crear_proyecto, login as login_api
from ui_helper import login, ir_a, captura

CODIGO = 'TEST-UI-PRJ-ACC'
# Rango del proyecto de prueba (api_helper.crear_proyecto).
INICIO_PROYECTO, FIN_PROYECTO = '2026-10-01', '2027-06-30'
# Sin espacios al final: el backend recorta el texto y el tooltip debe coincidir exacto.
DESCRIPCION = ('Residente de obra: coordina la cimentación y revisa los planos de cada etapa con el equipo. ' * 3).strip()

limpiar()
admin = login_api('admin')
proyecto_id = crear_proyecto(admin, CODIGO)

with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    pg = navegador.new_page(viewport={'width': 1440, 'height': 900})
    login(pg)
    ir_a(pg, '/proyectos')
    pg.wait_for_selector('table tbody tr', timeout=10000)

    # Botón Plan: mismo estilo de acción que Editar / Dar de baja, en amarillo.
    boton_plan = pg.locator('tr', has_text=CODIGO).locator('a:has-text("Plan")')
    clases = boton_plan.get_attribute('class')
    assert 'btn-accion' in clases and 'btn-accion-plan' in clases, f'el botón Plan usa el estilo de acción: {clases}'
    fondo = boton_plan.evaluate('el => getComputedStyle(el).backgroundColor')
    r, g, b = [int(x) for x in fondo.replace('rgb(', '').replace(')', '').split(',')[:3]]
    assert r > 230 and g > 220 and b < 215, f'el fondo del botón Plan debe ser amarillo, es {fondo}'
    print('botón Plan ->', clases, fondo)

    boton_plan.click()
    pg.wait_for_selector('text=Acceso al proyecto', timeout=10000)
    assert f'/proyectos/{proyecto_id}' in pg.url, f'debe abrir el plan del proyecto: {pg.url}'

    # Los dos bloques de acceso son retráctiles y empiezan cerrados.
    assert pg.locator('button[aria-expanded]:has-text("Asignar acceso")').get_attribute('aria-expanded') == 'false'
    assert pg.locator('button[aria-expanded]:has-text("Buscar y filtrar")').get_attribute('aria-expanded') == 'false'
    assert pg.locator('#ac-inicio').count() == 0, 'el formulario de asignar está plegado'
    assert pg.locator('#fa-buscar').count() == 0, 'los filtros están plegados'

    # Asignar acceso: «Descripción de la asignación» en lugar de «Rol».
    pg.click('button:has-text("Asignar acceso")')
    pg.wait_for_selector('#ac-inicio')
    assert pg.locator('label:has-text("Descripción de la asignación")').count() == 1
    assert pg.locator('#ac-rol').count() == 0, 'ya no existe el campo Rol'
    assert pg.locator('textarea#ac-descripcion').count() == 1, 'la descripción es un área de texto'

    # Inicio y Fin NO limitan el calendario...
    for campo in ('#ac-inicio', '#ac-fin'):
        assert pg.get_attribute(campo, 'min') is None and pg.get_attribute(campo, 'max') is None, \
            f'{campo} no debe limitar el calendario'

    # ...pero sugieren la fecha del proyecto, y al pulsarla se rellena el campo.
    sug_inicio = pg.locator('button:has-text("Sugerida:"):has-text("inicio del proyecto")')
    sug_fin = pg.locator('button:has-text("Sugerida:"):has-text("fin del proyecto")')
    assert sug_inicio.count() == 1 and sug_fin.count() == 1, 'cada campo sugiere su fecha del proyecto'
    sug_inicio.click()
    assert pg.input_value('#ac-inicio') == INICIO_PROYECTO, 'la sugerencia rellena el inicio'
    assert sug_inicio.count() == 0, 'la sugerencia desaparece cuando el campo ya tiene ese día'
    sug_fin.click()
    assert pg.input_value('#ac-fin') == FIN_PROYECTO, 'la sugerencia rellena el fin'
    print('sugerencias ->', INICIO_PROYECTO, FIN_PROYECTO)

    # Una fecha fuera del rango del proyecto se acepta (ya no hay límite).
    pg.fill('#ac-fin', '2030-01-01')
    assert pg.input_value('#ac-fin') == '2030-01-01'

    # Asignar a «Todo el proyecto» (actividad_id null): antes fallaba por la llave foránea.
    pg.fill('#ac-trabajador', 'Prueba')
    pg.locator('#ac-trabajador-opciones li', has_text='Prueba').first.click()
    pg.fill('#ac-descripcion', DESCRIPCION)
    pg.click('button:has-text("Dar acceso")')
    pg.wait_for_selector('[role=status]', timeout=10000)
    print('asignar a todo el proyecto ->', pg.locator('[role=status]').inner_text())
    pg.wait_for_selector('table tbody tr', timeout=10000)

    # La tabla: columna renombrada y descripción con las propiedades de Ubicación.
    assert pg.locator('th:has-text("Descripción de la asignación")').count() == 1
    assert pg.locator('th:has-text("Rol en el proyecto")').count() == 0, 'ya no hay columna Rol'
    celda = pg.locator('table tbody tr').first.locator('td').nth(1)
    texto = celda.locator('span.line-clamp-4')
    assert texto.count() == 1, 'la descripción se recorta a 4 líneas'
    assert 'Residente de obra' in texto.inner_text()
    assert texto.get_attribute('title') == DESCRIPCION, 'el texto completo sale al pasar el cursor'
    assert celda.locator('button[aria-label="Copiar descripción"]').count() == 1, 'tiene botón de copiar'
    print('columna descripción -> recortada a 4 líneas, con tooltip y botón de copiar')

    # Buscar y filtrar: filtra por descripción y ya no hay filtro por rol.
    pg.click('button:has-text("Buscar y filtrar")')
    pg.wait_for_selector('#fa-buscar')
    assert pg.locator('#fa-rol').count() == 0, 'ya no hay filtro por rol'
    pg.fill('#fa-buscar', 'cimentación')
    assert pg.locator('table tbody tr').count() == 1, 'la búsqueda encuentra la asignación por su descripción'
    assert pg.locator('button:has-text("Buscar y filtrar")').inner_text().count('1 filtro') == 1
    pg.fill('#fa-buscar', 'zzz-no-existe')
    pg.wait_for_selector('text=Ningún acceso coincide con los filtros')
    pg.click('button:has-text("Limpiar filtros")')
    assert pg.locator('table tbody tr').count() == 1, 'limpiar filtros devuelve el listado'

    captura(pg, 'hu02_acceso')
    navegador.close()

limpiar()
print('\nAcceso a proyectos (interfaz): TODAS LAS PRUEBAS PASARON')
