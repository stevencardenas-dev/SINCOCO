import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { resolverCargo, resolverEspecialidad } from './catalogoService.js'

/**
 * HU-04 · criterio 2: la especialidad es obligatoria para el personal
 * operativo. La lista de cargos operativos ya no está escrita aquí: la marca
 * `cargos.operativo` en la tabla de dominio, así que el administrador puede
 * cambiar la regla desde Gestión Administrativa sin tocar el código.
 *
 * Se usa tanto al crear como al editar el trabajador; `cargo` es la fila del
 * catálogo (o, al editar sin cambiar el cargo, el resumen que devuelve el
 * repositorio).
 */
export function exigirEspecialidadSiOperativo(cargo, especialidad) {
  if (Number(cargo?.operativo) === 1 && !especialidad) {
    throw new AppError(
      // HU-04 exige la especialidad; CU-04 · Alt 2 pide advertir la consecuencia.
      'La especialidad es obligatoria para cargos de personal operativo: sin ella el ' +
        'trabajador no podrá ser filtrado para tareas específicas',
      400,
      'especialidad',
    )
  }
}

/** Lista el personal activo para el catálogo de personal y de responsables. */
export async function listarTrabajadores(filtros = {}) {
  return trabajadorRepository.listar(filtros)
}

/**
 * Estados que se eligen a mano: situaciones temporales. INACTIVO no está aquí:
 * es el estado que deja la baja lógica (HU-18) y solo se alcanza con «Dar de
 * baja», que además oculta al trabajador, registra fecha y usuario y bloquea
 * su cuenta.
 */
const ESTADOS = ['ACTIVO', 'VACACIONES', 'LICENCIA']

function validarEstado(estado) {
  if (estado === 'INACTIVO') {
    throw new AppError(
      'Para retirar a una persona use «Dar de baja»: el estado Inactivo ya no se asigna a mano',
      400,
      'estado',
    )
  }
  if (!ESTADOS.includes(estado)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS.join(', ')}`, 400, 'estado')
  }
}

/**
 * La disponibilidad no se escribe a mano: se deriva del estado. Un trabajador
 * que no está ACTIVO no está disponible; uno ACTIVO sigue siendo asignable aunque
 * ya tenga actividades vigentes (la interfaz lo muestra como «Asignado»).
 */
async function calcularDisponible(id, estado) {
  return estado === 'ACTIVO' ? 1 : 0
}

/** Obtiene un trabajador por id. */
export async function obtenerTrabajador(id) {
  const trabajador = await trabajadorRepository.findById(id)
  if (!trabajador) throw new AppError('Trabajador no encontrado', 404)
  return trabajador
}

/** HU-04: registrar personal con su cargo y especialidad. */
export async function registrarTrabajador(dto, ctx = {}) {
  const porDocumento = await trabajadorRepository.findByDocumento(dto.numero_documento)
  if (porDocumento) {
    throw new AppError('Ya existe un trabajador con ese número de documento', 409, 'numero_documento')
  }
  if (dto.email) {
    const porEmail = await trabajadorRepository.findByEmail(dto.email)
    if (porEmail) throw new AppError('Ya existe un trabajador con ese correo', 409, 'email')
  }

  // HU-04: el cargo y la especialidad tienen que existir en los catálogos.
  const cargo = await resolverCargo(dto)
  const especialidad = await resolverEspecialidad(dto)

  exigirEspecialidadSiOperativo(cargo, especialidad)

  const id = await trabajadorRepository.create({
    ...dto,
    cargo_id: cargo.id,
    especialidad_id: especialidad?.id ?? null,
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'trabajadores',
    registroId: id,
    detalles: { numero_documento: dto.numero_documento, cargo: cargo.nombre },
    ip: ctx.ip,
  })

  return trabajadorRepository.findById(id)
}

/**
 * Editar los datos del personal. Solo se actualizan los campos enviados.
 * Si cambia el cargo o la especialidad, se vuelve a aplicar la regla.
 */
// `disponible` no es editable a mano: se deriva del estado y de las
// actividades asignadas (ver calcularDisponible).
const CAMPOS_EDITABLES = [
  'nombres', 'apellidos', 'email', 'telefono', 'direccion', 'estado',
]

export async function actualizarTrabajador(id, cambios, ctx = {}) {
  const actual = await trabajadorRepository.findById(id)
  if (!actual) throw new AppError('Trabajador no encontrado', 404)
  // HU-18: un registro dado de baja es historial; primero hay que reactivarlo.
  if (!actual.activo) {
    throw new AppError('El trabajador está dado de baja; reactívelo antes de editarlo', 409)
  }

  const campos = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo]
  }

  // El cargo y la especialidad se cambian por id o por nombre del catálogo.
  let cargoFinal = { operativo: actual.cargo_operativo }
  if (cambios.cargo_id !== undefined || cambios.cargo !== undefined) {
    const cargo = await resolverCargo(cambios)
    campos.cargo_id = cargo.id
    cargoFinal = cargo
  }
  let especialidadFinal = actual.especialidad_id
  if (cambios.especialidad_id !== undefined || cambios.especialidad !== undefined) {
    const especialidad = await resolverEspecialidad(cambios)
    campos.especialidad_id = especialidad?.id ?? null
    especialidadFinal = campos.especialidad_id
  }

  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  // Si cambia el estado, la disponibilidad se recalcula con la misma regla del
  // cambio de estado explícito.
  if (campos.estado !== undefined) {
    validarEstado(String(campos.estado))
    campos.disponible = await calcularDisponible(id, campos.estado)
  }

  if (campos.email) {
    const porEmail = await trabajadorRepository.findByEmail(campos.email)
    if (porEmail && Number(porEmail.id) !== Number(id)) {
      throw new AppError('Ya existe un trabajador con ese correo', 409, 'email')
    }
  }
  if (campos.email === '') campos.email = null

  exigirEspecialidadSiOperativo(cargoFinal, especialidadFinal)

  await trabajadorRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'trabajadores',
    registroId: Number(id),
    detalles: { cambios },
    ip: ctx.ip,
  })

  return trabajadorRepository.findById(id)
}

/**
 * Cambiar el estado temporal del trabajador (Activo, Vacaciones, Licencia).
 *
 * Retirar a una persona no es un estado: es la baja lógica (`darDeBajaTrabajador`).
 * La disponibilidad se deriva: cualquier estado distinto de ACTIVO deja al
 * trabajador no disponible; al volver a ACTIVO recupera la disponibilidad solo
 * si no tiene actividades vigentes asignadas.
 */
export async function cambiarEstadoTrabajador(id, estado, ctx = {}) {
  const trabajador = await trabajadorRepository.findById(id)
  if (!trabajador) throw new AppError('Trabajador no encontrado', 404)
  if (!trabajador.activo) {
    throw new AppError('El trabajador está dado de baja; reactívelo antes de cambiar su estado', 409)
  }

  const nuevo = String(estado ?? '').toUpperCase()
  validarEstado(nuevo)
  if (nuevo === trabajador.estado) {
    throw new AppError(`El trabajador ya está en estado ${nuevo}`, 409, 'estado')
  }

  const disponible = await calcularDisponible(id, nuevo)
  await trabajadorRepository.update(id, { estado: nuevo, disponible })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CAMBIAR_ESTADO',
    tabla: 'trabajadores',
    registroId: Number(id),
    detalles: { antes: trabajador.estado, despues: nuevo, disponible },
    ip: ctx.ip,
  })

  return trabajadorRepository.findById(id)
}

/** «a, b y 3 más»: resume una lista larga para el mensaje de error. */
function resumir(nombres, maximo = 3) {
  if (nombres.length <= maximo) return nombres.join(', ')
  return `${nombres.slice(0, maximo).join(', ')} y ${nombres.length - maximo} más`
}

/**
 * Dar de baja (HU-18): el trabajador sale de la operación sin borrarse.
 *
 * - Queda activo = 0 con fecha y usuario de la baja, estado INACTIVO y no
 *   disponible; no aparece en los listados por defecto y no puede asignarse a
 *   nuevos proyectos o actividades (HU-04 · criterio 4, validado en
 *   `proyectoService` y `actividadService`).
 * - Se rechaza si es responsable de proyectos o actividades en curso: primero
 *   hay que reasignarlos, para no dejar trabajo a cargo de alguien que ya no está.
 * - Si tiene cuenta de acceso, la cuenta también se da de baja y su sesión se
 *   cierra. Nadie puede darse de baja a sí mismo.
 */
export async function darDeBajaTrabajador(id, ctx = {}) {
  const trabajador = await trabajadorRepository.findById(id)
  if (!trabajador) throw new AppError('Trabajador no encontrado', 404)
  if (!trabajador.activo) throw new AppError('El trabajador ya estaba dado de baja', 409)

  const cuenta = await trabajadorRepository.cuentaVinculada(id)
  if (cuenta && Number(cuenta.id) === Number(ctx.usuarioId)) {
    throw new AppError('No puede darse de baja a sí mismo', 400)
  }

  const { proyectos, actividades } = await trabajadorRepository.responsabilidadesEnCurso(id)
  if (proyectos.length || actividades.length) {
    const partes = []
    if (proyectos.length) {
      partes.push(
        `${proyectos.length === 1 ? 'del proyecto' : `de ${proyectos.length} proyectos`} ` +
          resumir(proyectos.map((p) => p.nombre)),
      )
    }
    if (actividades.length) {
      partes.push(
        `${actividades.length === 1 ? 'de la actividad' : `de ${actividades.length} actividades`} ` +
          resumir(actividades.map((a) => `${a.nombre} (${a.proyecto})`)),
      )
    }
    throw new AppError(
      `No se puede dar de baja: es responsable ${partes.join(' y ')}. ` +
        'Reasigne esas responsabilidades y vuelva a intentarlo.',
      409,
    )
  }

  // Solo se cierra una cuenta que hoy puede entrar: una ya bloqueada desde
  // Usuarios se deja como está, y así la reactivación tampoco la reabre.
  const cuentaActiva =
    cuenta && Number(cuenta.activo) === 1 && cuenta.estado === 'ACTIVO' ? cuenta : null
  const afectadas = await trabajadorRepository.darDeBajaConCuenta({
    id,
    usuarioId: ctx.usuarioId,
    cuentaId: cuentaActiva?.id,
  })
  if (!afectadas) throw new AppError('El trabajador ya estaba dado de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'DAR_DE_BAJA',
    tabla: 'trabajadores',
    registroId: Number(id),
    detalles: {
      numero_documento: trabajador.numero_documento,
      cuenta_bloqueada: cuentaActiva?.username ?? null,
    },
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 0, cuenta_bloqueada: cuentaActiva?.username ?? null }
}

/**
 * HU-18: reactivar un trabajador dado de baja. Vuelve como ACTIVO, con la
 * disponibilidad que le corresponda, y si su cuenta se cerró con esa baja
 * también se reabre (una cuenta bloqueada aparte desde Usuarios no se toca).
 */
export async function reactivarTrabajador(id, ctx = {}) {
  const disponible = await calcularDisponible(id, 'ACTIVO')
  const { afectadas, cuentaReactivada } = await trabajadorRepository.reactivarConCuenta({
    id,
    disponible,
  })
  if (!afectadas) throw new AppError('El trabajador no está dado de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'REACTIVAR',
    tabla: 'trabajadores',
    registroId: Number(id),
    detalles: { cuenta_reactivada: cuentaReactivada },
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 1, cuenta_reactivada: cuentaReactivada }
}
