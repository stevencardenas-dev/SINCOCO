import { pool } from './pool.js'

/**
 * RF31 · RNF07: registra una operación crítica en la bitácora de trazabilidad
 * (usuario, fecha/hora, operación y entidad afectada).
 *
 * No interrumpe la operación principal: si la bitácora falla, se registra en
 * consola pero la petición del usuario sigue su curso — perder el log es malo,
 * perder la operación del usuario es peor.
 */
export async function registrar({ usuarioId, accion, tabla, registroId, detalles, ip }) {
  try {
    await pool.query(
      `INSERT INTO bitacora_trazabilidad
         (usuario_id, accion, tabla_afectada, registro_id, detalles, direccion_ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId ?? null, accion, tabla ?? null, registroId ?? null,
       detalles ? JSON.stringify(detalles) : null, ip ?? null],
    )
  } catch (err) {
    console.error('bitacora:', err.message)
  }
}
