import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { alertasApi } from '../services/alertas'
import { useRecurso } from '../hooks/useRecurso'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-23 (CU-23): alertas de inventario. Una alerta de stock mínimo nace sola
 * cuando una salida deja la existencia igual o por debajo del nivel mínimo del
 * material y sigue pendiente hasta que bodega la atiende; no se duplica mientras
 * haya una pendiente para el mismo material.
 */
const FILTROS = [
  { valor: '0', etiqueta: 'Pendientes' },
  { valor: '1', etiqueta: 'Atendidas' },
  { valor: '', etiqueta: 'Todas' },
]

const CLASE_SEVERIDAD = {
  ALTA: 'bg-rose-50 text-rose-700 ring-rose-200',
  MEDIA: 'bg-amber-50 text-amber-700 ring-amber-200',
  BAJA: 'bg-slate-100 text-slate-600 ring-slate-200',
}

/** HU-24: la severidad sale de los días de atraso; las alertas sin fecha no la tienen. */
function Severidad({ valor }) {
  if (!valor) return <span className="text-slate-400">—</span>
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${CLASE_SEVERIDAD[valor]}`}>
      {valor}
    </span>
  )
}

export default function Alertas() {
  const { puede } = useAuth()
  const puedeAtender = puede('alertas.atender')
  const [atendida, setAtendida] = useState('0')
  const alertas = useRecurso(() => alertasApi.listar({ atendida }), [atendida], { mensaje: 'No se pudieron cargar las alertas.' })

  const atender = (a) =>
    alertas.ejecutar(() => alertasApi.atender(a.id), { exito: 'Alerta atendida.', error: 'No se pudo atender la alerta.' })

  const recordar = (a) =>
    alertas.ejecutar(() => alertasApi.recordar(a.id), {
      exito: 'Recordatorio enviado al responsable.',
      error: 'No se pudo enviar el recordatorio: revise el correo del responsable o la configuración SMTP.',
    })

  const evaluar = () =>
    alertas.ejecutar(() => alertasApi.evaluar(), {
      exito: 'Atrasos evaluados.',
      error: 'No se pudieron evaluar los atrasos.',
    })

  return (
    <div className="space-y-6">
      <PageHeader
        accion={
          <div className="flex items-center gap-2">
            {puedeAtender && (
              <button type="button" className="btn-ghost text-xs" onClick={evaluar}>
                Evaluar atrasos
              </button>
            )}
            <BotonActualizar onClick={alertas.recargar} />
          </div>
        }
        title="Alertas"
        subtitle="Stock mínimo, actividades atrasadas y herramientas pendientes de devolución"
      />
      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <button key={f.etiqueta} type="button" className={atendida === f.valor ? 'btn-primary text-xs' : 'btn-ghost text-xs'} onClick={() => setAtendida(f.valor)}>
            {f.etiqueta}
          </button>
        ))}
      </div>
      {alertas.error && <AlertaFormulario mensaje={alertas.error} />}
      {alertas.aviso && <AlertaFormulario tipo="aviso" mensaje={alertas.aviso} />}

      <section className="card overflow-hidden">
        {alertas.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : alertas.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No hay alertas.</p>
        ) : (
          <TablaFicha
            filas={alertas.datos}
            compacta
            minWidth="md:min-w-0"
            ficha={{ titulo: (a) => a.titulo, subtitulo: (a) => a.tipo }}
            columnas={[
              { titulo: 'Alerta', movil: true, celda: (a) => a.titulo },
              { titulo: 'Detalle', movil: true, tdClase: 'text-slate-600', celda: (a) => a.descripcion },
              { titulo: 'Severidad', celda: (a) => <Severidad valor={a.severidad} /> },
              { titulo: 'Material', celda: (a) => a.material_codigo ?? '—' },
              { titulo: 'Existencia actual', celda: (a) => (a.material_codigo ? `${Number(a.existencia_total)} ${a.unidad_medida}` : '—') },
              { titulo: 'Nivel mínimo', celda: (a) => (a.material_codigo ? `${Number(a.nivel_minimo)} ${a.unidad_medida}` : '—') },
              { titulo: 'Generada', celda: (a) => fmtFecha(a.fecha_generacion), orden: (a) => a.fecha_generacion },
              { titulo: 'Estado', movil: true, celda: (a) => (a.atendida ? `Atendida ${fmtFecha(a.fecha_atencion)}` : 'Pendiente') },
              {
                titulo: '',
                movil: true,
                celda: (a) => (puedeAtender && !a.atendida ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className="btn-primary text-xs" onClick={() => atender(a)}>Atender</button>
                    <button type="button" className="btn-ghost text-xs" onClick={() => recordar(a)}>Recordar</button>
                  </div>
                ) : null),
              },
            ]}
          />
        )}
      </section>
    </div>
  )
}
