# Permisos "núcleo" de cada rol: la única fuente de verdad de las pruebas de RBAC.
#
# POR QUÉ EXISTE ESTE ARCHIVO
# ---------------------------
# Las pruebas de permisos NO deben contar permisos (`== 33`, `== 22`...). Un
# número fijo se rompe cada vez que una historia de usuario agrega permisos
# (HU-10 sumó cuatro `herramientas.*` y tumbó tres pruebas y el despliegue), y
# además el administrador puede cambiar la matriz desde la pantalla "Roles y
# permisos" (`roles.gestionar`), así que ningún conteo es una verdad estable.
#
# Lo que sí es estable son las reglas de negocio, y son las que se comprueban:
#
#   1. ADMINISTRADOR tiene TODOS los permisos del catálogo (tabla `permisos`),
#      sean los que sean y cuántos sean. Si mañana hay 50, la prueba sigue bien.
#   2. Cada otro rol conserva sus permisos NÚCLEO (PERMISOS_CORE): los mínimos
#      sin los cuales no puede cumplir su función. Tener de más no rompe nada.
#   3. Cada otro rol NO tiene los permisos/módulos vetados (VETADOS): los que
#      son del administrador o de otro rol por regla de negocio.
#
# CÓMO MANTENERLO
# ---------------
# - Agregaste permisos nuevos (una HU nueva): NO toques este archivo. ADMIN los
#   recibe solo y los demás roles no están obligados a tenerlos.
# - Un rol gana una función que debe conservar siempre: añade el permiso a su
#   conjunto en PERMISOS_CORE.
# - Una regla de "este rol jamás debe poder X": añádela a VETADOS. Admite el
#   nombre exacto (`proyectos.dar_baja`) o un prefijo de módulo terminado en
#   punto (`usuarios.`).
# - No pongas aquí un total ni un conteo de permisos.
#
# La matriz inicial la carga docs/seed_permisos_prueba.sql; este archivo solo
# fija el mínimo y los límites que las pruebas defienden.

ADMIN = 'ADMINISTRADOR'

PERMISOS_CORE = {
    # Opera el negocio: proyectos, clientes, personal y plan de trabajo.
    'GERENTE': {
        'clientes.listar',
        'proyectos.listar', 'proyectos.registrar', 'proyectos.editar',
        'proyectos.acceso_total', 'proyectos.gestionar_acceso',
        'trabajadores.listar', 'trabajadores.crear',
        'etapas.listar', 'actividades.listar',
        'catalogos.listar',
    },
    # Gestiona el plan de sus proyectos; los selectores piden clientes y personal.
    'MAESTRO_OBRA': {
        'proyectos.listar', 'proyectos.editar',
        'etapas.listar', 'etapas.crear',
        'actividades.listar', 'actividades.crear',
        'clientes.listar', 'trabajadores.listar',
    },
    # Inventario de herramientas (HU-10) y catálogo de materiales (HU-07).
    'ENCARGADO_BODEGA': {
        'herramientas.listar', 'herramientas.crear', 'herramientas.editar',
        'materiales.listar', 'materiales.crear', 'materiales.editar',
    },
}

# Lo que cada rol no debe tener JAMÁS. Los permisos de seguridad (usuarios,
# roles, auditoría) son solo del administrador.
_SEGURIDAD = ('usuarios.', 'roles.', 'auditoria.')

VETADOS = {
    'GERENTE': _SEGURIDAD,
    'MAESTRO_OBRA': _SEGURIDAD + (
        'proyectos.registrar', 'proyectos.dar_baja', 'proyectos.gestionar_acceso',
    ),
    'ENCARGADO_BODEGA': _SEGURIDAD + (
        'proyectos.', 'clientes.', 'trabajadores.', 'etapas.', 'actividades.',
    ),
}


def _vetado(permiso, reglas):
    return any(permiso == r or (r.endswith('.') and permiso.startswith(r)) for r in reglas)


def verificar_rol(rol, concedidos, catalogo=None):
    """Comprueba las reglas de `rol` sobre el conjunto de permisos concedidos.

    `concedidos`: nombres de permisos que tiene el rol (de la base o de la API).
    `catalogo`: todos los nombres de la tabla `permisos`; obligatorio para el
    administrador, que debe tenerlos todos.
    """
    concedidos = set(concedidos)
    if rol == ADMIN:
        assert catalogo is not None, 'el administrador se compara contra el catálogo completo'
        faltan = set(catalogo) - concedidos
        assert not faltan, f'{ADMIN} debe tener todos los permisos; le faltan: {sorted(faltan)}'
        return
    faltan = PERMISOS_CORE[rol] - concedidos
    assert not faltan, f'{rol} perdió permisos núcleo: {sorted(faltan)}'
    sobran = sorted(p for p in concedidos if _vetado(p, VETADOS[rol]))
    assert not sobran, f'{rol} tiene permisos vetados: {sobran}'


def _nombres(consulta):
    import subprocess
    from api_helper import mysql_args
    r = subprocess.run(mysql_args(['-N', '-e', consulta]), capture_output=True, text=True)
    assert r.returncode == 0, f'no se pudo consultar permisos: {r.stderr}'
    return {linea.strip() for linea in r.stdout.splitlines() if linea.strip()}


def catalogo_en_base():
    """Todos los permisos de la tabla `permisos`."""
    return _nombres('SELECT nombre FROM permisos')


def permisos_en_base(rol):
    """Permisos que `roles_permisos` concede hoy a `rol`."""
    return _nombres(
        'SELECT p.nombre FROM roles_permisos rp JOIN roles r ON r.id = rp.rol_id '
        f"JOIN permisos p ON p.id = rp.permiso_id WHERE r.nombre = '{rol}'"
    )


def verificar_matriz_en_base():
    """Reglas de los cuatro roles contra la matriz guardada en la base."""
    catalogo = catalogo_en_base()
    for rol in (ADMIN, *PERMISOS_CORE):
        verificar_rol(rol, permisos_en_base(rol), catalogo)
    return {rol: len(permisos_en_base(rol)) for rol in (ADMIN, *PERMISOS_CORE)}
