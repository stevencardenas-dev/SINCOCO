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

export default function Alertas() {
  const { puede } = useAuth()
  const puedeAtender = puede('alertas.atender')
  const [atendida, setAtendida] = useState('0')
  const alertas = useRecurso(() => alertasApi.listar({ atendida }), [atendida], { mensaje: 'No se pudieron cargar las alertas.' })

  const atender = (a) =>
    alertas.ejecutar(() => alertasApi.atender(a.id), { exito: 'Alerta atendida.', error: 'No se pudo atender la alerta.' })

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={alertas.recargar} />} title="Alertas de inventario" subtitle="Materiales en nivel mínimo y nuevas solicitudes de materiales" />
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
              { titulo: 'Generada', celda: (a) => fmtFecha(a.fecha_generacion), orden: (a) => a.fecha_generacion },
              { titulo: 'Estado', movil: true, celda: (a) => (a.atendida ? `Atendida ${fmtFecha(a.fecha_atencion)}` : 'Pendiente') },
              {
                titulo: '',
                movil: true,
                celda: (a) => (puedeAtender && !a.atendida
                  ? <button type="button" className="btn-primary text-xs" onClick={() => atender(a)}>Atender</button>
                  : null),
              },
            ]}
          />
        )}
      </section>
    </div>
  )
}
