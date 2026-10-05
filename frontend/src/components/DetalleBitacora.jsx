import { useState } from 'react'
import { EyeIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import { fmtFechaHora } from '../lib/format.js'

/**
 * Detalle legible de un registro de la bitácora (HU-17).
 *
 * `detalles` es un JSON libre que cada operación escribe a su manera. Aquí se
 * traduce, según la acción y la tabla, a una frase y a una lista de datos
 * «etiqueta → valor». En escritorio es un botón que abre una ventana; en la
 * ficha móvil se muestra el mismo contenido directamente.
 */

const ETIQUETA = {
  username: 'Usuario',
  email: 'Correo',
  rol_id: 'Rol',
  rol: 'Rol',
  trabajador_id: 'Trabajador',
  proyecto_id: 'Proyecto',
  actividad_id: 'Actividad',
  etapa_id: 'Etapa',
  cliente_id: 'Cliente',
  responsable_id: 'Responsable',
  rol_en_proyecto: 'Rol en el proyecto',
  numero_documento: 'N.º de documento',
  razon_social_nombre: 'Razón social / nombre',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  estado: 'Estado',
  disponible: 'Disponible',
  cargo: 'Cargo',
  cargo_id: 'Cargo',
  especialidad: 'Especialidad',
  especialidad_id: 'Especialidad',
  codigo: 'Código',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  orden: 'Orden',
  presupuesto_inicial: 'Presupuesto inicial',
  fecha_inicio: 'Fecha de inicio',
  fecha_fin: 'Fecha de fin',
  activo: 'Activo',
  en_uso: 'En uso',
  permisos: 'Permisos asignados',
  identificador: 'Identificador ingresado',
  resultado: 'Resultado',
  vigencia_minutos: 'Vigencia (minutos)',
  cuenta_bloqueada: 'Cuenta bloqueada',
  cuenta_reactivada: 'Cuenta reactivada',
  motivo: 'Motivo',
  por: 'Realizado por',
  campo: 'Campo modificado',
  password: 'Contraseña',
}

const TABLA_SINGULAR = {
  usuarios: 'usuario',
  trabajadores: 'trabajador',
  proyectos: 'proyecto',
  etapas_proyecto: 'etapa del plan',
  actividades: 'actividad',
  clientes: 'cliente',
  roles: 'rol',
  roles_permisos: 'permisos del rol',
  asignaciones_personal: 'asignación de personal',
  cargos: 'cargo',
  especialidades: 'especialidad',
}

const ESTILO = {
  CREAR: { icono: '＋', clase: 'bg-emerald-50 text-emerald-700', titulo: 'Registro creado' },
  ACTUALIZAR: { icono: '✎', clase: 'bg-sky-50 text-sky-700', titulo: 'Registro modificado' },
  DAR_DE_BAJA: { icono: '↓', clase: 'bg-amber-50 text-amber-700', titulo: 'Registro dado de baja' },
  REACTIVAR: { icono: '↑', clase: 'bg-emerald-50 text-emerald-700', titulo: 'Registro reactivado' },
  CAMBIAR_ESTADO: { icono: '⇄', clase: 'bg-sky-50 text-sky-700', titulo: 'Cambio de estado' },
  ELIMINAR: { icono: '×', clase: 'bg-red-50 text-red-700', titulo: 'Registro eliminado' },
  ASIGNAR_PERMISOS: { icono: '🔑', clase: 'bg-violet-50 text-violet-700', titulo: 'Permisos asignados' },
  AUTENTICAR: { icono: '→', clase: 'bg-slate-100 text-slate-600', titulo: 'Inicio de sesión' },
  CERRAR_SESION: { icono: '←', clase: 'bg-slate-100 text-slate-600', titulo: 'Cierre de sesión' },
  SESION_RECHAZADA: { icono: '!', clase: 'bg-red-50 text-red-700', titulo: 'Inicio de sesión rechazado' },
  SOLICITAR_RESET: { icono: '?', clase: 'bg-amber-50 text-amber-700', titulo: 'Recuperación de contraseña solicitada' },
  RESTABLECER_PASSWORD: { icono: '✓', clase: 'bg-emerald-50 text-emerald-700', titulo: 'Contraseña restablecida' },
}
const ESTILO_BASE = { icono: '•', clase: 'bg-slate-100 text-slate-600', titulo: 'Operación registrada' }

const etiquetaDe = (clave) =>
  ETIQUETA[clave] ?? clave.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

const formatear = (clave, v) => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (clave === 'disponible' || clave === 'activo' || clave === 'en_uso') {
    return Number(v) ? 'Sí' : 'No'
  }
  if (clave === 'presupuesto_inicial' && !Number.isNaN(Number(v))) {
    return Number(v).toLocaleString('es-CO')
  }
  if (clave === 'password') return 'Cambiada'
  if (esObjeto(v) || Array.isArray(v)) return JSON.stringify(v)
  return String(v)
}

/** Lee el detalle, que llega como objeto o como texto según el driver. */
export function parsearDetalles(detalles) {
  if (!detalles) return null
  if (typeof detalles === 'string') {
    try {
      const o = JSON.parse(detalles)
      return esObjeto(o) && Object.keys(o).length > 0 ? o : null
    } catch {
      return { texto: detalles }
    }
  }
  return esObjeto(detalles) && Object.keys(detalles).length > 0 ? detalles : null
}

/**
 * Convierte la fila de bitácora en { frase, filas: [{ etiqueta, valor, antes? }] }.
 * Cada fila con `antes` se pinta como «antes → después».
 */
export function interpretar(fila) {
  const d = parsearDetalles(fila.detalles) ?? {}
  const sujeto = TABLA_SINGULAR[fila.tabla_afectada] ?? 'registro'
  const filas = []
  const agregar = (clave, valor, antes) =>
    filas.push({ etiqueta: etiquetaDe(clave), valor: formatear(clave, valor), antes: antes === undefined ? undefined : formatear(clave, antes) })

  let frase = ''
  const resto = { ...d }

  switch (fila.accion) {
    case 'AUTENTICAR':
      return { frase: 'El usuario inició sesión correctamente.', filas }
    case 'CERRAR_SESION':
      return { frase: 'El usuario cerró su sesión.', filas }
    case 'SESION_RECHAZADA':
      frase = 'Se rechazó un intento de inicio de sesión.'
      break
    case 'SOLICITAR_RESET':
      frase = 'Se solicitó un código para recuperar la contraseña.'
      break
    case 'RESTABLECER_PASSWORD':
      frase = 'La contraseña se restableció con un código de recuperación.'
      break
    case 'CREAR':
      frase = `Se creó un ${sujeto}${fila.registro_id != null ? ` (#${fila.registro_id})` : ''}.`
      break
    case 'DAR_DE_BAJA':
      frase = `Se dio de baja un ${sujeto}${fila.registro_id != null ? ` (#${fila.registro_id})` : ''}.`
      break
    case 'REACTIVAR':
      frase = `Se reactivó un ${sujeto}${fila.registro_id != null ? ` (#${fila.registro_id})` : ''}.`
      break
    case 'ELIMINAR':
      frase = `Se eliminó un ${sujeto}${fila.registro_id != null ? ` (#${fila.registro_id})` : ''}.`
      break
    case 'ASIGNAR_PERMISOS':
      frase = 'Se actualizó el conjunto de permisos del rol.'
      break
    case 'CAMBIAR_ESTADO':
      frase = `Se cambió el estado de un ${sujeto}.`
      break
    case 'ACTUALIZAR':
      frase = `Se modificó un ${sujeto}${fila.registro_id != null ? ` (#${fila.registro_id})` : ''}.`
      break
    default:
      frase = 'Operación registrada en la bitácora.'
  }

  // Cambios anidados: { cambios: { campo: nuevoValor } }.
  if (esObjeto(d.cambios)) {
    delete resto.cambios
    for (const [k, v] of Object.entries(d.cambios)) agregar(k, v)
  }

  // Edición de usuario: { antes: {…}, despues: {…} }.
  if (esObjeto(d.antes) && esObjeto(d.despues)) {
    delete resto.antes
    delete resto.despues
    for (const k of new Set([...Object.keys(d.antes), ...Object.keys(d.despues)])) {
      if (d.antes[k] !== d.despues[k]) agregar(k, d.despues[k], d.antes[k])
    }
  } else if ('antes' in d && 'despues' in d) {
    // Un solo campo: { campo?, antes, despues }.
    const clave = d.campo ?? 'estado'
    delete resto.antes
    delete resto.despues
    delete resto.campo
    agregar(clave, d.despues, d.antes)
  } else if (d.campo === 'password') {
    delete resto.campo
    frase = 'Se cambió la contraseña de la cuenta.'
  }

  for (const [k, v] of Object.entries(resto)) {
    if (k === 'texto') filas.push({ etiqueta: 'Detalle', valor: String(v) })
    else agregar(k, v)
  }
  return { frase, filas }
}

/** Contenido ya formateado: se usa en la ventana y en la ficha móvil. */
export function ContenidoDetalle({ fila }) {
  const { frase, filas: datos } = interpretar(fila)
  const filas = fila.direccion_ip ? [...datos, { etiqueta: 'Dirección IP', valor: fila.direccion_ip }] : datos
  const estilo = ESTILO[fila.accion] ?? ESTILO_BASE
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${estilo.clase}`}>
        <span className="text-lg leading-6" aria-hidden="true">{estilo.icono}</span>
        <div>
          <p className="text-sm font-semibold">{estilo.titulo}</p>
          <p className="text-xs opacity-80">{frase}</p>
        </div>
      </div>
      {filas.length > 0 ? (
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {filas.map((f, i) => (
            <div key={`${f.etiqueta}-${i}`} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{f.etiqueta}</dt>
              <dd className="col-span-2 break-words text-slate-800">
                {f.antes !== undefined ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through decoration-red-300">{f.antes}</span>
                    <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">{f.valor}</span>
                  </span>
                ) : (
                  f.valor
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-slate-400">Esta operación no guardó datos adicionales.</p>
      )}
    </div>
  )
}

export default function DetalleBitacora({ fila, titulo }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn-accion btn-accion-editar"
        onClick={() => setAbierto(true)}
        aria-label={`Ver detalles de ${titulo}`}
      >
        <EyeIcon className="h-4 w-4" /> Ver detalles
      </button>
      {abierto && (
        <Modal
          abierto
          titulo={titulo}
          subtitulo={fmtFechaHora(fila.fecha_registro)}
          onCerrar={() => setAbierto(false)}
          ancho="max-w-md"
        >
          <ContenidoDetalle fila={fila} />
        </Modal>
      )}
    </>
  )
}
