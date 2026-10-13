import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo, numeroOpcional } from '../../utils/campos.js'

/** Unidades de medida que acepta el catálogo (HU-07 · criterio 2). */
export const UNIDADES_MEDIDA = [
  'UNIDAD', 'BOLSA', 'BULTO', 'CAJA', 'GALON', 'LITRO', 'KG', 'TON', 'M', 'M2', 'M3', 'ROLLO', 'PAR',
]

const CODIGO_ALFANUMERICO = /^[A-Za-z0-9]+$/
const vacio = (v) => v === undefined || v === null || String(v).trim() === ''

/** HU-07 · criterio 1: el código es alfanumérico; se guarda en mayúsculas. */
export function revisarCodigo(valor) {
  if (vacio(valor)) throw new AppError('El código del material es obligatorio', 400, 'codigo')
  const codigo = String(valor).trim()
  if (!CODIGO_ALFANUMERICO.test(codigo)) {
    throw new AppError('El código debe ser alfanumérico (solo letras y números)', 400, 'codigo')
  }
  revisarLargo(codigo, LARGO.codigo_material, 'codigo')
  return codigo.toUpperCase()
}

/** HU-07 · criterio 2: la unidad de medida debe ser una de las válidas. */
export function revisarUnidadMedida(valor) {
  if (vacio(valor)) throw new AppError('La unidad de medida es obligatoria', 400, 'unidad_medida')
  const unidad = String(valor).trim().toUpperCase()
  if (!UNIDADES_MEDIDA.includes(unidad)) {
    throw new AppError(
      `unidad_medida debe ser una de: ${UNIDADES_MEDIDA.join(', ')}`,
      400,
      'unidad_medida',
    )
  }
  return unidad
}

export function revisarDescripcion(valor) {
  if (vacio(valor)) throw new AppError('La descripción del material es obligatoria', 400, 'descripcion')
  const descripcion = String(valor).trim()
  revisarLargo(descripcion, LARGO.descripcion_material, 'descripcion')
  return descripcion
}

/** Importe o cantidad no negativa con a lo sumo 2 decimales (DECIMAL(12,2)). */
export function revisarMonto(valor, campo, { porDefecto = 0 } = {}) {
  if (vacio(valor)) return porDefecto
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(`${campo} debe ser un número mayor o igual a cero`, 400, campo)
  }
  if (Math.round(n * 100) / 100 !== n) {
    throw new AppError(`${campo} admite como máximo 2 decimales`, 400, campo)
  }
  if (n >= 1e10) throw new AppError(`${campo} es demasiado grande`, 400, campo)
  return n
}

/**
 * DTO para registrar un material (HU-07). Valida forma y tipos; la unicidad
 * del código y la existencia de la categoría se validan en el service.
 * `existencia_total` no viaja: siempre nace en cero y solo la mueven las
 * entradas, salidas, traslados y devoluciones de inventario (criterio 4).
 */
export class RegistrarMaterialDto {
  constructor({ codigo, categoria_id, descripcion, unidad_medida, costo_referencia, nivel_minimo }) {
    this.codigo = codigo
    this.categoria_id = categoria_id
    this.descripcion = descripcion
    this.unidad_medida = unidad_medida
    this.costo_referencia = costo_referencia
    this.nivel_minimo = nivel_minimo
    this.existencia_total = 0
  }

  static fromRequestBody(body = {}) {
    const codigo = revisarCodigo(body.codigo)
    if (vacio(body.categoria_id)) {
      throw new AppError('Debe seleccionar la categoría del material', 400, 'categoria_id')
    }
    return new RegistrarMaterialDto({
      codigo,
      categoria_id: numeroOpcional(body.categoria_id, 'categoria_id'),
      descripcion: revisarDescripcion(body.descripcion),
      unidad_medida: revisarUnidadMedida(body.unidad_medida),
      costo_referencia: revisarMonto(body.costo_referencia, 'costo_referencia'),
      nivel_minimo: revisarMonto(body.nivel_minimo, 'nivel_minimo'),
    })
  }
}
