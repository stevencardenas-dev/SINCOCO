# Nota para el equipo — Primer informe de AyD

**Léase antes de la entrega. Esta hoja no se entrega: se retira del documento final.**

Entrega: **12 de septiembre, 11:59 PM**, en la carpeta compartida.
Formato exigido: **Times New Roman 11, justificado**. El `.docx` ya cumple.

## Qué está listo

El informe cubre todas las secciones del lineamiento, en su numeración. Los objetivos
—general y OE1 a OE4— están **transcritos literalmente del enunciado del profesor**
(numerales 5 y 6): no se reformularon, porque cualquier variación se lee como
inconsistencia. El planteamiento del problema con su árbol, el alcance, las
limitaciones, los requerimientos (RF01–RF36, RN01–RN14, RNF01–RNF15) y los 29 casos de
uso provienen del documento de análisis del equipo.

Se redactaron para este informe: el resumen, la justificación, la descripción de los
procesos del negocio, el modelo de ciclo de vida y el cronograma por objetivo
específico.

## Qué falta, y de quién depende

Cada uno de estos puntos aparece en el informe como **[PENDIENTE]** en su sección, para
que la numeración quede completa y se vea qué se está esperando.

**Dependen del equipo, no se pueden derivar de lo que ya existe**

| Falta | Sección | Quién |
|---|---|---|
| URL desplegada, claves de administrador y de otros roles | Portada | Requiere desplegar el sistema; hoy corre solo en local |
| Acta de inicio | Anexos | Product Owner |
| Actas de reuniones | Anexos | Product Owner / quien las haya llevado |
| Protocolo de evaluación del desempeño | Anexos | Equipo |

> Si el equipo ya lleva actas en Drive o en algún otro lado, basta con anexarlas: no
> hay que redactarlas de nuevo.

**Se derivan de material que ya tenemos**

| Falta | Sección | De dónde sale |
|---|---|---|
| Modelo entidad-relación | 6.2 | La base de datos ya está definida: 27 tablas |
| Diagrama de clases | 6.3 | La base de datos y los módulos ya implementados |
| Arquitectura de software | 6 / OE2 | El stack ya está decidido y en uso |
| Diagramas de actividades | 2.1 | Los procesos de §2.1 y los flujos de los 29 CU |
| Gráfico del árbol del problema | 1.1 | La estructura CI/CD/ED/EI ya escrita en §1.1 |

Nota: el **BPMN AS-IS no falta** — el diagrama terminado está incrustado en el numeral 3
del documento de análisis.

Nota: los **diagramas de caso de uso extendidos tampoco faltan** — los 29 diagramas ya
incluyen las relaciones «include» y «extend». El punto 4.2.2 del lineamiento está
cubierto.

## Coherencia con el documento de análisis — ya corregida

El §12.1 del documento compartido había quedado desactualizado frente al resto: daba por
pendientes el BPMN AS-IS y la consolidación de requerimientos, y contaba diez reglas de
negocio cuando el §6.3 ya presenta catorce. **Las tres ya están corregidas** en el
documento de Drive, de modo que el informe y el documento de análisis dicen lo mismo.

Queda un detalle cosmético en el árbol del problema del documento compartido: los ítems
**ED1 y ED2** se muestran como lista numerada en vez de viñeta. Se arregla en Google
Docs seleccionando esos dos ítems y aplicando el mismo formato de viñeta de los demás.

## Antes de subir

1. Completar los `[PENDIENTE]` o decidir conscientemente cuáles se entregan sin cubrir.
2. Llenar la portada: URL, claves y credenciales por rol.
3. Retirar esta hoja del documento.
