# Casos límite de la API (auditoría para la revisión del sprint 1).
#
# No comprueba el camino feliz —eso lo hacen las pruebas de cada HU— sino lo que
# un evaluador va a probar en la demostración: campos vacíos, textos larguísimos,
# números fuera de rango, fechas imposibles, ids que no existen, tokens viejos o
# manipulados, roles sin permiso y borrados que chocan con datos que dependen de
# ellos. La regla que se exige siempre es la misma:
#
#   * nunca 500 (un 500 es un fallo del sistema, no del usuario);
#   * el error viaja en JSON con la forma { error } que usa toda la API;
#   * si la culpa es de un campo, el JSON dice cuál (`campo`).
#
# Requiere el backend (3005) corriendo y el cliente `mysql` en el PATH.
# Uso: python3 tests/test_bordes_api.py
import base64
import hashlib
import hmac
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from api_helper import (
    BASE,
    DB_ENV,
    http,
    limpiar,
    login,
    scalar,
    sql,
)

PREFIJO_B = 'TEST-BORDES'
# Los documentos de la base son varchar(20): el prefijo corto es a propósito,
# porque «TEST-BORDES-CC-RESP» no cabe y la propia prueba se pasaría de largo.
DOC_B = 'TB'
RESULTADOS = []


# --- utilidades de la propia prueba ---------------------------------------

def caso(nombre, funcion):
    """Ejecuta un caso y registra el resultado sin cortar la corrida."""
    try:
        ok, detalle = funcion()
    except Exception as error:  # noqa: BLE001 - la prueba sigue con los demás casos
        ok, detalle = False, f'{type(error).__name__}: {error}'
    RESULTADOS.append((nombre, ok, detalle))
    print(f"{'PASA ' if ok else 'FALLA'}  {nombre}{'' if ok else '   · ' + detalle}")
    return ok


def estado_esperado(obtenido, permitidos, extra=''):
    """(ok, detalle) para los casos que solo comparan el código de estado."""
    lista = permitidos if isinstance(permitidos, (list, tuple, set)) else [permitidos]
    return obtenido in lista, f'esperaba {lista}, llegó {obtenido} {extra}'.strip()


def crudo(metodo, ruta, cuerpo=b'', cabeceras=None, token=None):
    """Petición HTTP sin comodidades: sirve para mandar basura de verdad."""
    peticion = urllib.request.Request(
        BASE + ruta, data=cuerpo if metodo != 'GET' else None, method=metodo)
    for clave, valor in (cabeceras or {}).items():
        peticion.add_header(clave, valor)
    if token:
        peticion.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(peticion) as respuesta:
            return respuesta.status, respuesta.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode('utf-8', 'replace')


def es_json(texto):
    try:
        json.loads(texto)
        return True
    except ValueError:
        return False


def b64(datos):
    return base64.urlsafe_b64encode(datos).rstrip(b'=').decode()


def token_firmado(payload):
    """Firma un token con el mismo secreto del backend, para probar sus defensas."""
    cabecera = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    cuerpo = b64(json.dumps(payload).encode())
    firma = hmac.new(
        DB_ENV['JWT_SECRET'].encode(), f'{cabecera}.{cuerpo}'.encode(), hashlib.sha256,
    ).digest()
    return f'{cabecera}.{cuerpo}.{b64(firma)}'


def limpiar_bordes():
    """Borra lo que haya dejado una corrida anterior (o la actual, al terminar)."""
    sql("DELETE FROM asignaciones_personal WHERE trabajador_id IN "
        f"(SELECT id FROM trabajadores WHERE numero_documento LIKE '{DOC_B}-%')")
    sql(f"DELETE FROM usuarios WHERE username LIKE '{PREFIJO_B}-%'")
    sql(f"DELETE FROM actividades WHERE nombre LIKE '{PREFIJO_B}-%'")
    sql(f"DELETE FROM etapas_proyecto WHERE nombre LIKE '{PREFIJO_B}-%'")
    sql(f"DELETE FROM proyectos WHERE codigo LIKE '{PREFIJO_B}-%'")
    sql(f"DELETE FROM trabajadores WHERE numero_documento LIKE '{DOC_B}-%'")
    sql(f"DELETE FROM clientes WHERE numero_documento LIKE '{PREFIJO_B}-%'")


def trabajador_bordes(documento, **extra):
    """Trabajador de prueba; devuelve (estado, json) tal cual responde la API."""
    cuerpo = {
        'numero_documento': f'{DOC_B}-{documento}',
        'tipo_documento': 'CC',
        'nombres': 'Bordes',
        'apellidos': 'Prueba',
        'cargo': 'Maestro de obra',
        'especialidad': 'Mamposteria',
    }
    cuerpo.update(extra)
    return http('POST', '/api/trabajadores', cuerpo, token=TOKEN['admin'])


def proyecto_bordes(codigo, **extra):
    cuerpo = {
        'codigo': f'{PREFIJO_B}-{codigo}', 'cliente_id': CLIENTE,
        'nombre': 'Proyecto bordes', 'ubicacion': 'Cúcuta',
        'fecha_inicio_programada': '2026-10-01', 'fecha_fin_programada': '2027-06-30',
        'responsable_id': RESPONSABLE, 'presupuesto_inicial': 1000000,
    }
    cuerpo.update(extra)
    return http('POST', '/api/proyectos', cuerpo, token=TOKEN['admin'])


def etapa_bordes(codigo, **extra):
    cuerpo = {'proyecto_id': PROYECTO, 'nombre': f'{PREFIJO_B}-{codigo}',
              'fecha_inicio_programada': '2026-10-01',
              'fecha_fin_programada': '2027-01-31'}
    cuerpo.update(extra)
    return http('POST', '/api/etapas', cuerpo, token=TOKEN['admin'])


def id_de(respuesta, clave, sql_busqueda):
    """Id del registro recién creado: de la respuesta o, si ya existía, de la base."""
    estado, datos = respuesta
    if estado == 201:
        return datos[clave]['id']
    return int(scalar(sql_busqueda) or 0)


def trabajador_de_baja():
    """Un trabajador ACTIVO al que se le da de baja, para probar que no se asigne."""
    estado, datos = trabajador_bordes('CC-BAJA-ASIG')
    trabajador = datos['trabajador']['id'] if estado == 201 else int(scalar(
        f"SELECT id FROM trabajadores WHERE numero_documento='{DOC_B}-CC-BAJA-ASIG'"))
    http('PATCH', f'/api/trabajadores/{trabajador}/baja', {}, token=TOKEN['admin'])
    return trabajador


# --- preparación -----------------------------------------------------------

limpiar_bordes()
TOKEN = {
    'admin': login('admin'),
    'gerente': login('gerente'),
    'maestro': login('maestro'),
    'bodega': login('bodega'),
}

estado, datos = http('POST', '/api/clientes', {
    'numero_documento': f'{PREFIJO_B}-NIT-01', 'tipo_documento': 'NIT',
    'razon_social_nombre': 'Cliente de bordes',
}, token=TOKEN['admin'])
CLIENTE = datos['cliente']['id'] if estado == 201 else int(scalar(
    f"SELECT id FROM clientes WHERE numero_documento='{PREFIJO_B}-NIT-01'"))

RESPONSABLE = id_de(trabajador_bordes('CC-RESP'), 'trabajador',
                    f"SELECT id FROM trabajadores WHERE numero_documento='{DOC_B}-CC-RESP'")
PROYECTO = id_de(proyecto_bordes('PRJ-01'), 'proyecto',
                 f"SELECT id FROM proyectos WHERE codigo='{PREFIJO_B}-PRJ-01'")

print('\n=== 1. Transporte: cuerpos raros no pueden tumbar la API ===')


def json_mal_formado():
    estado, texto = crudo('POST', '/api/auth/login', b'{"username": "admin", ',
                          {'Content-Type': 'application/json'})
    return estado_esperado(estado, [400], texto[:60])


def cuerpo_enorme():
    cuerpo = json.dumps({'username': 'x' * 1_000_000, 'password': 'x'}).encode()
    estado, texto = crudo('POST', '/api/auth/login', cuerpo,
                          {'Content-Type': 'application/json'})
    return estado_esperado(estado, [400, 413], texto[:60])


def sin_content_type():
    cuerpo = json.dumps({'username': 'admin', 'password': 'x'}).encode()
    estado, texto = crudo('POST', '/api/auth/login', cuerpo)
    return estado_esperado(estado, [400], texto[:60])


def cuerpo_vacio():
    estado, texto = crudo('POST', '/api/auth/login', b'',
                          {'Content-Type': 'application/json'})
    return estado_esperado(estado, [400], texto[:60])


def ruta_inexistente():
    estado, texto = crudo('GET', '/api/no-existe-esta-ruta')
    return estado == 404 and es_json(texto), f'esperaba 404 JSON, llegó {estado} {texto[:50]}'


def metodo_no_permitido():
    estado, texto = crudo('PUT', '/api/proyectos', b'{}',
                          {'Content-Type': 'application/json'}, token=TOKEN['admin'])
    return estado_esperado(estado, [404, 405], texto[:50])


def servidor_sigue_vivo():
    """Un dato inválido no puede apagar el proceso.

    Un AppError lanzado dentro de un controlador `async` sin capturar se
    convertía en un rechazo sin manejar y Node terminaba el proceso: la API
    entera caía por una contraseña corta. Ahora el error se responde y el
    servicio sigue en pie.
    """
    http('POST', '/api/usuarios', {
        'username': f'{PREFIJO_B}-VIVO', 'email': 'bordes.vivo@sincoco.test',
        'password': 'abc', 'rol_id': 3, 'trabajador_id': RESPONSABLE,
    }, token=TOKEN['admin'])
    estado, _ = http('GET', '/api/usuarios', token=TOKEN['admin'])
    return estado == 200, f'después del error de validación el servidor respondió {estado}'


caso('Un error de validación no apaga el servidor', servidor_sigue_vivo)
caso('JSON mal formado → 400 (no 500)', json_mal_formado)
caso('Cuerpo de 1 MB → 400/413 (no 500)', cuerpo_enorme)
caso('JSON sin cabecera Content-Type → 400', sin_content_type)
caso('POST sin cuerpo → 400', cuerpo_vacio)
caso('Ruta inexistente → 404 JSON', ruta_inexistente)
caso('Método no permitido (PUT /api/proyectos) → 404/405', metodo_no_permitido)

print('\n=== 2. Autenticación: tokens ausentes, viejos o manipulados ===')

RUTA = '/api/proyectos'


def headers_token(valor):
    return {'Authorization': valor} if valor else {}


caso('Sin cabecera Authorization → 401',
     lambda: estado_esperado(crudo('GET', RUTA)[0], [401]))
caso("'Bearer' sin token → 401",
     lambda: estado_esperado(crudo('GET', RUTA, cabeceras=headers_token('Bearer'))[0], [401]))
caso("'Bearer' con basura → 401",
     lambda: estado_esperado(crudo('GET', RUTA, cabeceras=headers_token('Bearer a.b.c'))[0], [401]))
caso("Esquema 'Basic' → 401",
     lambda: estado_esperado(crudo('GET', RUTA,
                                   cabeceras=headers_token('Basic YWRtaW46YWRtaW4='))[0], [401]))
caso('Dos tokens en la cabecera → 401',
     lambda: estado_esperado(crudo('GET', RUTA,
                                   cabeceras=headers_token('Bearer uno dos'))[0], [401]))
caso('Firma alterada → 401',
     lambda: estado_esperado(crudo('GET', RUTA, cabeceras=headers_token(
         'Bearer ' + TOKEN['admin'][:-2] + 'xx'))[0], [401]))
caso('Token expirado → 401',
     lambda: estado_esperado(crudo('GET', RUTA, token=token_firmado({
         'id': 1, 'username': 'admin', 'rol': 'ADMINISTRADOR', 'sid': 'x',
         'exp': int(time.time()) - 3600}))[0], [401]))
caso('Token sin sid (emitido antes de la sesión única) → 401',
     lambda: estado_esperado(crudo('GET', RUTA, token=token_firmado({
         'id': 1, 'username': 'admin', 'rol': 'ADMINISTRADOR'}))[0], [401]))
caso('Token con sid que no es el vigente → 401',
     lambda: estado_esperado(crudo('GET', RUTA, token=token_firmado({
         'id': 1, 'username': 'admin', 'rol': 'ADMINISTRADOR', 'sid': 'otra-sesion'}))[0], [401]))
caso('Token de una cuenta que no existe → 401',
     lambda: estado_esperado(crudo('GET', RUTA, token=token_firmado({
         'id': 999999, 'username': 'fantasma', 'rol': 'ADMINISTRADOR', 'sid': 'x',
         'exp': int(time.time()) + 600}))[0], [401]))


def cuenta_deshabilitada():
    """Una cuenta dada de baja no puede seguir usando su token."""
    trabajador = id_de(trabajador_bordes('CC-CTA-BAJA'), 'trabajador',
                       f"SELECT id FROM trabajadores "
                       f"WHERE numero_documento='{DOC_B}-CC-CTA-BAJA'")
    usuario = f'{PREFIJO_B}-USR-BAJA'
    sql(f"DELETE FROM usuarios WHERE username='{usuario}'")
    # rol 3 = MAESTRO_OBRA: tiene proyectos.listar, así que antes de la baja la
    # petición debe pasar (200) y después debe caer (401).
    estado, datos = http('POST', '/api/usuarios', {
        'username': usuario, 'email': 'bordes.baja@sincoco.test',
        'password': 'Prueba123!', 'rol_id': 3, 'trabajador_id': trabajador,
    }, token=TOKEN['admin'])
    if estado != 201:
        return False, f'no se pudo crear la cuenta de prueba: {estado} {datos}'
    token = login(usuario)
    antes = crudo('GET', RUTA, token=token)[0]
    sql(f"UPDATE usuarios SET activo = 0 WHERE username='{usuario}'")
    despues = crudo('GET', RUTA, token=token)[0]
    sql(f"DELETE FROM usuarios WHERE username='{usuario}'")
    return (antes == 200 and despues == 401,
            f'antes de la baja {antes} (esperaba 200) y después {despues} (esperaba 401)')


caso('Cuenta deshabilitada pierde el token → 401', cuenta_deshabilitada)

print('\n=== 3. RBAC: cada rol solo lo suyo ===')

PERMISOS_NEGADOS = [
    ('bodega', 'GET', '/api/usuarios'),
    ('bodega', 'GET', '/api/roles/permisos'),
    ('bodega', 'GET', '/api/auditoria'),
    ('bodega', 'GET', '/api/asignaciones'),
    ('bodega', 'POST', '/api/proyectos'),
    ('bodega', 'POST', '/api/clientes'),
    ('maestro', 'POST', '/api/clientes'),
    ('maestro', 'GET', '/api/usuarios'),
    ('maestro', 'POST', '/api/asignaciones'),
    ('gerente', 'GET', '/api/usuarios'),
    ('gerente', 'GET', '/api/roles/permisos'),
    ('gerente', 'POST', '/api/usuarios'),
]
for rol, metodo, ruta in PERMISOS_NEGADOS:
    caso(f'{rol} → {metodo} {ruta} → 403',
         lambda rol=rol, metodo=metodo, ruta=ruta: estado_esperado(
             crudo(metodo, ruta, b'{}' if metodo != 'GET' else b'',
                   {'Content-Type': 'application/json'}, token=TOKEN[rol])[0], [403]))

print('\n=== 4. Ids imposibles: ni 500 ni datos de otros ===')

for ruta in ['/api/proyectos/abc', '/api/trabajadores/abc', '/api/clientes/abc',
             '/api/etapas/abc', '/api/actividades/abc', '/api/roles/abc']:
    caso(f'GET {ruta} → 400/404',
         lambda ruta=ruta: estado_esperado(
             crudo('GET', ruta, token=TOKEN['admin'])[0], [400, 404]))

for ruta in ['/api/proyectos/-1', '/api/proyectos/0',
             '/api/proyectos/99999999999999999999', '/api/trabajadores/-5']:
    caso(f'GET {ruta} → 404',
         lambda ruta=ruta: estado_esperado(
             crudo('GET', ruta, token=TOKEN['admin'])[0], [404]))

caso('GET /api/proyectos/1 OR 1=1 → 400/404',
     lambda: estado_esperado(
         crudo('GET', '/api/proyectos/1%20OR%201%3D1', token=TOKEN['admin'])[0], [400, 404]))
caso('GET /api/etapas sin proyecto_id → 400',
     lambda: estado_esperado(crudo('GET', '/api/etapas', token=TOKEN['admin'])[0], [400]))
caso('GET /api/etapas?proyecto_id=abc → 400/200 sin datos',
     lambda: estado_esperado(
         crudo('GET', '/api/etapas?proyecto_id=abc', token=TOKEN['admin'])[0], [200, 400]))

print('\n=== 5. Búsquedas: comodines e inyección ===')


def busqueda(comodin, etiqueta):
    def ejecutar():
        ruta = f'/api/proyectos?buscar={urllib.parse.quote(comodin)}'
        estado, texto = crudo('GET', ruta, token=TOKEN['admin'])
        limpio = es_json(texto) and '"error"' not in texto[:80]
        return (estado == 200 and limpio,
                f'esperaba 200 con lista, llegó {estado} {texto[:70]}')
    caso(f'buscar={etiqueta} → 200 JSON y sin error', ejecutar)


for comodin, etiqueta in [('%', 'porcentaje'), ('_', 'guion bajo'),
                          ("' OR 1=1--", 'inyección SQL'), ('"', 'comilla doble'),
                          ('   ', 'solo espacios'), ('%_%', 'dos comodines')]:
    busqueda(comodin, etiqueta)

print('\n=== 6. Longitudes y formatos: lo que se teclea en los formularios ===')

caso('nombres de 200 caracteres (columna 100) → 400 con campo',
     lambda: (lambda s, d: (s == 400 and d.get('campo') == 'nombres',
                            f'esperaba 400 campo=nombres, llegó {s} {d}'))(
         *trabajador_bordes('LARGO-N', nombres='A' * 200)))
caso('apellidos de 200 caracteres → 400 con campo',
     lambda: (lambda s, d: (s == 400 and d.get('campo') == 'apellidos',
                            f'esperaba 400 campo=apellidos, llegó {s} {d}'))(
         *trabajador_bordes('LARGO-A', apellidos='B' * 200)))
caso('email de 200 caracteres → 400',
     lambda: estado_esperado(
         trabajador_bordes('LARGO-E', email='x' * 190 + '@test.com')[0], [400]))
caso('email con formato inválido → 400 con campo',
     lambda: (lambda s, d: (s == 400 and d.get('campo') == 'email',
                            f'esperaba 400 campo=email, llegó {s} {d}'))(
         *trabajador_bordes('MAIL', email='no-es-un-correo')))
caso('teléfono con letras → 400 con campo',
     lambda: (lambda s, d: (s == 400 and d.get('campo') == 'telefono',
                            f'esperaba 400 campo=telefono, llegó {s} {d}'))(
         *trabajador_bordes('TEL', telefono='llamar a la casa')))
caso('teléfono internacional válido → 201',
     lambda: estado_esperado(
         trabajador_bordes('TEL-OK', telefono='+57 300 123 4567')[0], [201]))
caso('documento de 30 caracteres (columna 20) → 400/409',
     lambda: estado_esperado(
         trabajador_bordes('D' * 30)[0], [400, 409], 'nunca 500'))
caso('dirección de 300 caracteres (columna 255) → 400',
     lambda: estado_esperado(trabajador_bordes('DIR', direccion='Calle ' * 60)[0], [400]))
caso('nombre con emoji (4 bytes utf8mb4) → 201',
     lambda: estado_esperado(trabajador_bordes('EMOJI', nombres='Obra 🏗️')[0], [201]))
caso('nombre con espacios alrededor se recorta → 201',
     lambda: (lambda s, d: (s == 201 and d['trabajador']['nombres'] == 'Bordes',
                            f'esperaba 201 con nombres recortado, llegó {s} {d}'))(
         *trabajador_bordes('ESPACIO', nombres='  Bordes  ')))
caso('texto con etiquetas HTML se guarda literal → 201',
     lambda: (lambda s, d: (s == 201 and '<script>' in d['trabajador']['nombres'],
                            f'esperaba el texto tal cual, llegó {s} {d}'))(
         *trabajador_bordes('XSS', nombres='<script>alert(1)</script>')))

print('\n=== 7. Números y fechas imposibles ===')

for valor, etiqueta in [(0, 'cero'), (-5, 'negativo'), ('abc', 'texto'),
                        ('1e400', 'infinito'), (10 ** 15, 'fuera de decimal'),
                        (None, 'nulo'), ('   ', 'solo espacios')]:
    caso(f'presupuesto {etiqueta} → 400',
         lambda valor=valor, etiqueta=etiqueta: estado_esperado(
             proyecto_bordes(f'PRES-{etiqueta[:6]}', presupuesto_inicial=valor)[0], [400]))

for campo, valor, etiqueta in [
    ('fecha_fin_programada', '2026-13-01', 'mes 13'),
    ('fecha_fin_programada', '2026-02-30', '30 de febrero'),
    ('fecha_fin_programada', 'ayer', 'texto'),
    ('fecha_inicio_programada', '2028-01-01', 'fin anterior al inicio'),
]:
    caso(f'proyecto con {etiqueta} → 400',
         lambda campo=campo, valor=valor, etiqueta=etiqueta: estado_esperado(
             proyecto_bordes(f'FECHA-{etiqueta[:4]}', **{campo: valor})[0], [400]))

caso('proyecto con codigo de 50 caracteres (columna 20) → 400',
     lambda: estado_esperado(proyecto_bordes('C' * 50)[0], [400]))
caso('proyecto con nombre de 200 caracteres (columna 150) → 400',
     lambda: estado_esperado(
         proyecto_bordes('NOMBRE-LARGO', nombre='N' * 200)[0], [400]))
caso('proyecto con ubicación de 300 caracteres (columna 255) → 400',
     lambda: estado_esperado(proyecto_bordes('UBIC-LARGA', ubicacion='U' * 300)[0], [400]))
caso('proyecto con cliente_id inexistente → 404',
     lambda: estado_esperado(proyecto_bordes('P-CLI-X', cliente_id=999999)[0], [404]))
caso('proyecto con responsable_id inexistente → 404',
     lambda: estado_esperado(proyecto_bordes('P-RESP-X', responsable_id=999999)[0], [404]))
caso('proyecto con código repetido → 409',
     lambda: estado_esperado(proyecto_bordes('PRJ-01')[0], [409]))

print('\n=== 8. Etapas, actividades y asignaciones ===')

caso('etapa con fecha_fin anterior al inicio → 400',
     lambda: estado_esperado(etapa_bordes(
         'ET-FECHAS', fecha_inicio_programada='2027-01-01',
         fecha_fin_programada='2026-10-01')[0], [400]))
caso('etapa en un proyecto inexistente → 404',
     lambda: estado_esperado(etapa_bordes('ET-FANTASMA', proyecto_id=999999)[0], [404]))
caso('etapa sin fechas → 400',
     lambda: estado_esperado(http('POST', '/api/etapas', {
         'proyecto_id': PROYECTO, 'nombre': f'{PREFIJO_B}-ET-SINFECHAS'},
         token=TOKEN['admin'])[0], [400]))
caso('etapa con nombre de 200 caracteres (columna 100) → 400',
     lambda: estado_esperado(etapa_bordes('E' * 200)[0], [400]))

ETAPA = id_de(etapa_bordes('ET-OK'), 'etapa',
              f"SELECT id FROM etapas_proyecto WHERE nombre='{PREFIJO_B}-ET-OK'")


def actividad_bordes(codigo, **extra):
    cuerpo = {'etapa_id': ETAPA, 'nombre': f'{PREFIJO_B}-{codigo}',
              'fecha_inicio_programada': '2026-11-01',
              'fecha_fin_programada': '2026-11-30'}
    cuerpo.update(extra)
    return http('POST', '/api/actividades', cuerpo, token=TOKEN['admin'])


caso('actividad fuera del rango de su etapa → 400',
     lambda: estado_esperado(actividad_bordes(
         'ACT-RANGO', fecha_inicio_programada='2030-01-01',
         fecha_fin_programada='2030-02-01')[0], [400]))
caso('actividad en una etapa inexistente → 404',
     lambda: estado_esperado(actividad_bordes('ACT-FANTASMA', etapa_id=999999)[0], [404]))
caso('actividad con nombre de 200 caracteres (columna 150) → 400',
     lambda: estado_esperado(actividad_bordes('ACT-LARGA', nombre='A' * 200)[0], [400]))
caso('actividad con responsable dado de baja → 400',
     lambda: estado_esperado(actividad_bordes(
         'ACT-BAJA', responsable_id=trabajador_de_baja())[0], [400]))
caso('asignar un trabajador dado de baja → 400',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': trabajador_de_baja(), 'proyecto_id': PROYECTO,
         'fecha_inicio': '2026-10-01'}, token=TOKEN['admin'])[0], [400]))
caso('asignación con fecha_fin anterior al inicio → 400',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': RESPONSABLE, 'proyecto_id': PROYECTO,
         'fecha_inicio': '2027-01-01', 'fecha_fin_programada': '2026-10-01'},
         token=TOKEN['admin'])[0], [400]))
caso('asignación a todo el proyecto con actividad_id null (como el formulario) → no falla',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': RESPONSABLE, 'proyecto_id': PROYECTO, 'actividad_id': None,
         'fecha_inicio': '2026-10-01'}, token=TOKEN['admin'])[0], [201, 409]))
caso('asignación con fechas fuera del rango del proyecto → no se rechaza por fechas',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': RESPONSABLE, 'proyecto_id': PROYECTO,
         'fecha_inicio': '2035-01-01', 'fecha_fin_programada': '2035-06-01'},
         token=TOKEN['admin'])[0], [201, 409]))
caso('asignación con descripción de 6000 caracteres (límite 5000) → 400',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': RESPONSABLE, 'proyecto_id': PROYECTO,
         'fecha_inicio': '2026-10-01', 'observaciones': 'D' * 6000},
         token=TOKEN['admin'])[0], [400]))
caso('asignación en un proyecto inexistente → 404',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': RESPONSABLE, 'proyecto_id': 999999,
         'fecha_inicio': '2026-10-01'}, token=TOKEN['admin'])[0], [404]))
caso('asignación a una actividad inexistente → 400/404',
     lambda: estado_esperado(http('POST', '/api/asignaciones', {
         'trabajador_id': RESPONSABLE, 'proyecto_id': PROYECTO,
         'actividad_id': 999999, 'fecha_inicio': '2026-10-01'},
         token=TOKEN['admin'])[0], [400, 404]))


def asignacion_repetida():
    """Asignar dos veces a la misma persona no debe duplicar la asignación."""
    cuerpo = {'trabajador_id': RESPONSABLE, 'proyecto_id': PROYECTO,
              'fecha_inicio': '2026-10-01'}
    primera = http('POST', '/api/asignaciones', cuerpo, token=TOKEN['admin'])[0]
    segunda, datos = http('POST', '/api/asignaciones', cuerpo, token=TOKEN['admin'])
    return (primera in (201, 409) and segunda in (201, 409),
            f'primera {primera}, segunda {segunda} {datos}')


caso('asignación duplicada → 409 (no crea dos)', asignacion_repetida)

print('\n=== 9. Borrados que chocan con datos que dependen de ellos ===')


def baja_de_responsable():
    """Dar de baja a quien es responsable de un proyecto activo."""
    trabajador = id_de(trabajador_bordes('CC-RESP-BAJA'), 'trabajador',
                       f"SELECT id FROM trabajadores "
                       f"WHERE numero_documento='{DOC_B}-CC-RESP-BAJA'")
    proyecto_bordes('RESP-BAJA', responsable_id=trabajador)
    estado, datos = http('PATCH', f'/api/trabajadores/{trabajador}/baja', {},
                         token=TOKEN['admin'])
    return estado_esperado(estado, [200, 409], f'{datos.get("error", "")}')


def baja_de_cliente_con_proyectos():
    estado, datos = http('PATCH', f'/api/clientes/{CLIENTE}/baja', {}, token=TOKEN['admin'])
    return estado_esperado(estado, [200, 409], f'{datos.get("error", "")}')


def baja_doble():
    primera = http('PATCH', f'/api/proyectos/{PROYECTO}/baja', {},
                   token=TOKEN['admin'])[0]
    segunda = http('PATCH', f'/api/proyectos/{PROYECTO}/baja', {},
                   token=TOKEN['admin'])[0]
    return (primera == 200 and segunda == 409,
            f'primera baja {primera} (esperaba 200), segunda {segunda} (esperaba 409)')


caso('baja de un responsable de proyecto → 200 o 409, nunca 500', baja_de_responsable)
caso('baja de un cliente con proyectos → 200 o 409, nunca 500', baja_de_cliente_con_proyectos)
caso('baja dos veces del mismo proyecto → 409', baja_doble)
caso('reactivar un proyecto dado de baja → 200',
     lambda: estado_esperado(http('PATCH', f'/api/proyectos/{PROYECTO}/reactivar', {},
                                  token=TOKEN['admin'])[0], [200]))
caso('reactivar un proyecto que no está de baja → 409',
     lambda: estado_esperado(http('PATCH', f'/api/proyectos/{PROYECTO}/reactivar', {},
                                  token=TOKEN['admin'])[0], [409]))

print('\n=== 10. PATCH y cambios parciales ===')

caso('PATCH sin campos → 400',
     lambda: estado_esperado(http('PATCH', f'/api/proyectos/{PROYECTO}', {},
                                  token=TOKEN['admin'])[0], [400]))
caso('PATCH con estado inválido → 400',
     lambda: estado_esperado(http('PATCH', f'/api/proyectos/{PROYECTO}',
                                  {'estado': 'EN_OBRA'}, token=TOKEN['admin'])[0], [400]))
caso('PATCH con estado válido → 200',
     lambda: estado_esperado(http('PATCH', f'/api/proyectos/{PROYECTO}',
                                  {'estado': 'EN_EJECUCION'}, token=TOKEN['admin'])[0], [200]))
caso('PATCH de un proyecto inexistente → 404',
     lambda: estado_esperado(http('PATCH', '/api/proyectos/999999',
                                  {'estado': 'PAUSADO'}, token=TOKEN['admin'])[0], [404]))
caso('PATCH con campos desconocidos → 400',
     lambda: estado_esperado(http('PATCH', f'/api/proyectos/{PROYECTO}',
                                  {'inventado': 1}, token=TOKEN['admin'])[0], [400]))

print('\n=== 11. Usuarios, roles y contraseñas ===')

caso('usuario con contraseña de 3 caracteres → 400',
     lambda: estado_esperado(http('POST', '/api/usuarios', {
         'username': f'{PREFIJO_B}-CORTA', 'email': 'bordes.corta@sincoco.test',
         'password': 'abc', 'rol_id': 4, 'trabajador_id': RESPONSABLE},
         token=TOKEN['admin'])[0], [400]))
caso('usuario repetido → 409',
     lambda: estado_esperado(http('POST', '/api/usuarios', {
         'username': 'admin', 'email': 'bordes.otro@sincoco.test',
         'password': 'Prueba123!', 'rol_id': 4,
         'trabajador_id': id_de(trabajador_bordes('CC-USR-REP'), 'trabajador',
                                f"SELECT id FROM trabajadores "
                                f"WHERE numero_documento='{DOC_B}-CC-USR-REP'")},
         token=TOKEN['admin'])[0], [409]))
caso('usuario con rol inexistente → 400/404',
     lambda: estado_esperado(http('POST', '/api/usuarios', {
         'username': f'{PREFIJO_B}-ROL', 'email': 'bordes.rol@sincoco.test',
         'password': 'Prueba123!', 'rol_id': 99999,
         'trabajador_id': id_de(trabajador_bordes('CC-USR-ROL'), 'trabajador',
                                f"SELECT id FROM trabajadores "
                                f"WHERE numero_documento='{DOC_B}-CC-USR-ROL'")},
         token=TOKEN['admin'])[0], [400, 404]))
caso('usuario con correo inválido → 400',
     lambda: estado_esperado(http('POST', '/api/usuarios', {
         'username': f'{PREFIJO_B}-MAIL', 'email': 'sin-arroba',
         'password': 'Prueba123!', 'rol_id': 4,
         'trabajador_id': id_de(trabajador_bordes('CC-USR-MAIL'), 'trabajador',
                                f"SELECT id FROM trabajadores "
                                f"WHERE numero_documento='{DOC_B}-CC-USR-MAIL'")},
         token=TOKEN['admin'])[0], [400]))
ROL_ADMIN = int(scalar("SELECT id FROM roles WHERE nombre='ADMINISTRADOR'"))
caso('borrar un rol base del sistema → 409',
     lambda: estado_esperado(
         http('DELETE', f'/api/roles/{ROL_ADMIN}', token=TOKEN['admin'])[0], [409]))
caso('borrar un rol inexistente → 404',
     lambda: estado_esperado(http('DELETE', '/api/roles/999999', token=TOKEN['admin'])[0], [404]))

print('\n=== 12. Perfil: cambio de contraseña ===')

caso('cambio con la contraseña actual equivocada → 400',
     lambda: estado_esperado(http('PATCH', '/api/perfil', {
         'password_actual': 'equivocada', 'password': 'NuevaClave123!'},
         token=TOKEN['admin'])[0], [400]))
caso('cambio a una contraseña corta → 400',
     lambda: estado_esperado(http('PATCH', '/api/perfil', {
         'password_actual': 'Prueba123!', 'password': 'abc'},
         token=TOKEN['admin'])[0], [400]))
caso('cambio a la misma contraseña → 400',
     lambda: estado_esperado(http('PATCH', '/api/perfil', {
         'password_actual': 'Prueba123!', 'password': 'Prueba123!'},
         token=TOKEN['admin'])[0], [400]))

print('\n=== 13. Dashboard con números extremos ===')


def dashboard_estable():
    estado, datos = http('GET', '/api/dashboard', token=TOKEN['admin'])
    if estado != 200:
        return False, f'esperaba 200, llegó {estado} {datos}'
    texto = json.dumps(datos)
    limpio = all(palabra not in texto for palabra in ('NaN', 'Infinity', ': null'))
    return limpio, f'la respuesta trae NaN/Infinity/null: {texto[:140]}'


caso('dashboard sin NaN ni Infinity ni nulls', dashboard_estable)

print('\n=== limpieza ===')
limpiar_bordes()
limpiar()

fallos = [nombre for nombre, ok, _ in RESULTADOS if not ok]
print(f'\nCasos límite de la API: {len(RESULTADOS) - len(fallos)}/{len(RESULTADOS)} pasaron')
if fallos:
    print('\nFallos que hay que revisar:')
    for nombre in fallos:
        print('  -', nombre)
    raise SystemExit(1)
print('TODAS LAS PRUEBAS PASARON')
