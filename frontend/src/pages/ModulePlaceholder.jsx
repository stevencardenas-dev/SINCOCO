import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

const RF_DESCRIPTIONS = {
  RF1: 'Crear, autenticar, roles y permisos, estado de cuentas y recuperación. (RBAC · encriptación)',
  'RF5 · RF6': 'Registrar trabajadores y maestros (contacto, especialidad, cargo, disponibilidad) y asignarlos a actividades con consulta histórica por proyecto y periodo.',
  'RF7 · RF8 · RF9': 'Catálogo de materiales con código, categoría, unidad, existencias, costo de referencia y nivel mínimo; entregas, consumos y devoluciones al inventario.',
  'RF10 · RF11': 'Catálogo de herramientas con estado y ubicación; entregas a trabajador/proyecto y devoluciones con condiciones.',
  RF12: 'Servicios contratados: transporte, alquiler de maquinaria, electricidad, plomería; responsable, proyecto, fechas y valor.',
  RF13: 'Novedades e imprevistos en obra (averías, accidentes, retrasos) vinculados al proyecto.',
  RF14: 'Generar alertas cuando un material alcanza el nivel mínimo definido en RF7.',
  RF15: 'Consolidar costos de personal, materiales y servicios por proyecto para análisis gerencial.',
  RF17: 'Reportes filtrados por proyecto, periodo o trabajador, exportables a PDF y Excel.',
  RF18: 'Trazabilidad de las operaciones principales y reconstrucción del historial por proyecto. (RN7 · RNF7)',
}

export default function ModulePlaceholder({ title, rf }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <WrenchScrewdriverIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <span className="badge mt-2 bg-brand-50 text-brand-700 ring-1 ring-brand-200">{rf}</span>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
        Módulo en desarrollo — se construye por sprints (Scrum).
        <br />
        {RF_DESCRIPTIONS[rf] ?? 'Requerimiento funcional pendiente de implementar.'}
      </p>
      <p className="mt-6 text-xs text-slate-400">«La idea es que no sea un CRUD» — clase de análisis y diseño</p>
    </div>
  )
}