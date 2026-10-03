import nodemailer from 'nodemailer'

/**
 * Envío de correo por SMTP (Gmail) para la recuperación de contraseña.
 *
 * Se configura solo con variables de entorno. Si no están definidas el servicio
 * queda deshabilitado y `enviarCodigoRecuperacion` devuelve false: el sistema
 * sigue funcionando y el administrador entrega el código desde el módulo de
 * Usuarios, como antes.
 *
 *   SMTP_USER   cuenta remitente (administracion.sincoco@gmail.com)
 *   SMTP_PASS   contraseña de aplicación de Google (no la contraseña de la cuenta)
 *   SMTP_HOST   por defecto smtp.gmail.com
 *   SMTP_PORT   por defecto 587 (STARTTLS)
 *   SMTP_FROM   por defecto «SINCOCO <SMTP_USER>»
 */

let transporte
let intentado = false

function obtenerTransporte() {
  if (intentado) return transporte
  intentado = true
  const { SMTP_USER, SMTP_PASS, SMTP_HOST = 'smtp.gmail.com', SMTP_PORT = '587' } = process.env
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[correo] SMTP_USER/SMTP_PASS no definidos: no se enviarán correos.')
    return undefined
  }
  const puerto = Number(SMTP_PORT)
  transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  return transporte
}

export const correoHabilitado = () => Boolean(obtenerTransporte())

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * Envía el código de recuperación. Devuelve true si el servidor SMTP lo aceptó;
 * nunca lanza: un fallo de correo no debe revelar nada desde el login.
 */
export async function enviarCodigoRecuperacion({ destino, username, codigo, minutos }) {
  const t = obtenerTransporte()
  if (!t || !destino) return false

  const remitente = process.env.SMTP_FROM || `SINCOCO <${process.env.SMTP_USER}>`
  const texto =
    `Hola ${username},\n\n` +
    `Recibimos una solicitud para restablecer la contraseña de su cuenta en SINCOCO.\n\n` +
    `Su código de recuperación es: ${codigo}\n\n` +
    `Es de un solo uso y vence en ${minutos} minutos. Escríbalo en la pantalla de ` +
    `recuperación junto con su contraseña nueva.\n\n` +
    `Si usted no lo solicitó, ignore este mensaje: su contraseña no cambiará.\n\n` +
    `SINCOCO · Constructora XYZ`
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2530">` +
    `<h2 style="margin:0 0 12px">Recuperar contraseña</h2>` +
    `<p>Hola <strong>${escapar(username)}</strong>, recibimos una solicitud para restablecer la ` +
    `contraseña de su cuenta en SINCOCO.</p>` +
    `<p style="text-align:center;margin:24px 0"><span style="display:inline-block;background:#facc15;` +
    `color:#171c24;font-size:28px;font-weight:bold;letter-spacing:4px;padding:12px 24px;border-radius:12px">` +
    `${escapar(codigo)}</span></p>` +
    `<p>Es de un solo uso y vence en <strong>${minutos} minutos</strong>.</p>` +
    `<p style="color:#667085;font-size:13px">Si usted no lo solicitó, ignore este mensaje: su ` +
    `contraseña no cambiará.</p></div>`

  try {
    await t.sendMail({
      from: remitente,
      to: destino,
      subject: 'SINCOCO · Código para restablecer su contraseña',
      text: texto,
      html,
    })
    return true
  } catch (err) {
    console.error('[correo] No se pudo enviar el código de recuperación:', err.message)
    return false
  }
}
