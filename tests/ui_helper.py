# Utilidades de Playwright para las pruebas de interfaz.
#
# Requieren el frontend (5173) y el backend (3005) corriendo, y Playwright
# instalado (recomendado: el .venv del proyecto).
#
# Uso: .venv/Scripts/python.exe tests/test_ui_hu04_personal.py
import os

BASE_UI = 'http://localhost:5173'
_DIR = os.path.dirname(os.path.abspath(__file__))


def captura(page, nombre):
    """Guarda una captura junto a las pruebas (ignorada por git)."""
    return page.screenshot(path=os.path.join(_DIR, f'_{nombre}.png'))


def login(page, usuario='admin', password='Prueba123!'):
    """Inicia sesión y espera a que cargue el menú lateral."""
    # Sesión única por cuenta: libera la sesión que haya dejado otra prueba.
    from api_helper import liberar_sesion
    liberar_sesion(usuario)
    page.goto(f'{BASE_UI}/login')
    page.wait_for_load_state('networkidle')
    page.fill('#username', usuario)
    page.fill('#password', password)
    page.click('button[type=submit]')
    page.wait_for_selector('aside nav a', timeout=10000)


def ir_a(page, ruta):
    """Navega a una ruta de la aplicación autenticada."""
    page.goto(f'{BASE_UI}{ruta}')
    page.wait_for_load_state('networkidle')
