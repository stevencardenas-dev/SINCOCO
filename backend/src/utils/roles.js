/**
 * Roles base del sistema. El código los referencia por nombre (RutaPorRol,
 * sidebar y etiquetas del frontend), por eso no se pueden renombrar ni
 * eliminar desde la administración de roles: los usuarios de ese rol se
 * quedarían sin menú ni rutas.
 *
 * Es la única lista de nombres de rol escrita en el backend. Si algún día los
 * roles de sistema deben ser configurables, el paso natural es una columna
 * `roles.es_sistema` y retirar esta constante.
 */
export const ROLES_SISTEMA = ['ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA', 'ENCARGADO_BODEGA']

export const esRolSistema = (nombre) => ROLES_SISTEMA.includes(nombre)
