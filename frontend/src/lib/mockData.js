/**
 * Datos de demostración para el shell del frontend.
 * Se reemplazan por las respuestas reales del backend cuando exista.
 */

export const proyectos = [
  {
    id: 1,
    nombre: 'Conjunto Residencial Los Álamos',
    cliente: 'Constructora XYZ',
    ubicacion: 'Cúcuta, Av. Los Libertadores',
    responsable: 'Ing. Jairo Contreras',
    estado: 'en_ejecucion',
    avance: 62,
    presupuesto: 850_000_000,
    inicio: '2026-02-10',
    fin: '2026-11-30',
  },
  {
    id: 2,
    nombre: 'Casa modelo — Urbanización El Portal',
    cliente: 'Particular (Fam. Rojas)',
    ubicacion: 'Cúcuta, Sector El Portal',
    responsable: 'Ing. María Peñaranda',
    estado: 'en_ejecucion',
    avance: 34,
    presupuesto: 420_000_000,
    inicio: '2026-05-18',
    fin: '2027-01-15',
  },
  {
    id: 3,
    nombre: 'Remodelación Local Comercial Centro',
    cliente: 'Comercial Ortiz S.A.S.',
    ubicacion: 'Cúcuta, Centro',
    responsable: 'Ing. Jairo Contreras',
    estado: 'planificacion',
    avance: 8,
    presupuesto: 95_000_000,
    inicio: '2026-09-15',
    fin: '2026-12-20',
  },
  {
    id: 4,
    nombre: 'Vivienda unifamiliar — Villa del Rosario',
    cliente: 'Particular (Fam. Mora)',
    ubicacion: 'Villa del Rosario',
    responsable: 'Ing. María Peñaranda',
    estado: 'finalizado',
    avance: 100,
    presupuesto: 310_000_000,
    inicio: '2025-11-03',
    fin: '2026-07-25',
  },
]

export const materiales = [
  { id: 1, codigo: 'CEM-001', nombre: 'Cemento gris (bulto 50kg)', categoria: 'Aglomerantes', unidad: 'Und', existencia: 42, nivelMinimo: 60, costoRef: 38500 },
  { id: 2, codigo: 'ARE-002', nombre: 'Arena lavada (m³)', categoria: 'Áridos', unidad: 'm³', existencia: 8, nivelMinimo: 10, costoRef: 82000 },
  { id: 3, codigo: 'BLQ-010', nombre: 'Bloque N°4 (und)', categoria: 'Mampostería', unidad: 'Und', existencia: 2400, nivelMinimo: 500, costoRef: 2450 },
  { id: 4, codigo: 'VAR-3/8', nombre: 'Varilla corrugada 3/8" (und)', categoria: 'Acero', unidad: 'Und', existencia: 15, nivelMinimo: 40, costoRef: 21500 },
  { id: 5, codigo: 'CAB-1.5', nombre: 'Cable eléctrico 12 AWG (rollo)', categoria: 'Instalaciones', unidad: 'Rollo', existencia: 6, nivelMinimo: 4, costoRef: 148000 },
  { id: 6, codigo: 'PINT-BL', nombre: 'Pintura blanca (galón)', categoria: 'Acabados', unidad: 'Gal', existencia: 3, nivelMinimo: 8, costoRef: 96000 },
]

export const herramientas = [
  { id: 1, codigo: 'HRR-01', nombre: 'Taladro percutor Bosch', estado: 'en_uso', trabajador: 'Carlos Vera', proyecto: 'Los Álamos' },
  { id: 2, codigo: 'HRR-02', nombre: 'Mezcladora de concreto 1 saco', estado: 'disponible' },
  { id: 3, codigo: 'HRR-03', nombre: 'Nivel láser 360°', estado: 'en_uso', trabajador: 'Pedro Ramírez', proyecto: 'El Portal' },
  { id: 4, codigo: 'HRR-04', nombre: 'Andamio metálico (módulo)', estado: 'mantenimiento' },
]

export const personal = [
  { id: 1, nombre: 'Carlos Vera', cargo: 'Maestro de obra', especialidad: 'Mampostería', estado: 'activo', disponibilidad: 'disponible' },
  { id: 2, nombre: 'Pedro Ramírez', cargo: 'Oficial', especialidad: 'Instalaciones eléctricas', estado: 'activo', disponibilidad: 'en_obra' },
  { id: 3, nombre: 'Luis Ortega', cargo: 'Obrero', especialidad: 'General', estado: 'activo', disponibilidad: 'disponible' },
  { id: 4, nombre: 'Jhon Pabón', cargo: 'Maestro de obra', especialidad: 'Estructura', estado: 'inactivo', disponibilidad: 'no_disponible' },
]

export const incidencias = [
  { id: 1, proyecto: 'Conjunto Residencial Los Álamos', tipo: 'Avería', descripcion: 'Daño en bomba de agua de la cisterna', fecha: '2026-08-28', estado: 'en_gestion' },
  { id: 2, proyecto: 'Casa modelo — Urbanización El Portal', tipo: 'Retraso', descripcion: 'Llegada tardía de acero por proveedor', fecha: '2026-08-25', estado: 'abierta' },
  { id: 3, proyecto: 'Conjunto Residencial Los Álamos', tipo: 'Accidente menor', descripcion: 'Corte leve en mano de un obrero', fecha: '2026-08-20', estado: 'cerrada' },
]

export const avanceSeries = [
  { mes: 'Abr', 'Los Álamos': 18, 'El Portal': 0 },
  { mes: 'May', 'Los Álamos': 29, 'El Portal': 6 },
  { mes: 'Jun', 'Los Álamos': 38, 'El Portal': 14 },
  { mes: 'Jul', 'Los Álamos': 47, 'El Portal': 21 },
  { mes: 'Ago', 'Los Álamos': 55, 'El Portal': 28 },
  { mes: 'Sep', 'Los Álamos': 62, 'El Portal': 34 },
]

export const estadoLabels = {
  planificacion: { label: 'Planificación', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  en_ejecucion: { label: 'En ejecución', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pausado: { label: 'Pausado', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  finalizado: { label: 'Finalizado', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}