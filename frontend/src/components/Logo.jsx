/**
 * Marca de SINCOCO: un casco de obra sobre el amarillo de seguridad.
 *
 * Se usa en el sidebar, en el login y (misma figura) en public/favicon.svg.
 * La figura se dibuja con `currentColor` para que herede el gris grafito del
 * texto y funcione igual sobre fondo claro u oscuro.
 */
export default function Logo({ className = 'h-10 w-10', title = 'SINCOCO' }) {
  return (
    <span
      /* Mantuve tus clases originales, pero si quieres los colores exactos de la imagen,
         puedes cambiar 'bg-accent-400' por 'bg-yellow-400' o 'bg-[#F2B930]' y
         'text-brand-950' por 'text-slate-900' o 'text-[#1C2534]'. */
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-accent-400 text-brand-950 shadow-sm ring-1 ring-inset ring-accent-500/40 ${className}`}
    >
      {/* viewBox cuadrado y centrado en el dibujo (x 10–182, y 7.4–217 en las
          coordenadas del SVG original). Para hacer el logo más grande o más
          pequeño dentro del cuadrado, cambia h-[70%] w-[70%]. */}
      <svg
        viewBox="-14 2.2 220 220"
        className="block h-[70%] w-[70%]"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>

        {/* Paths originales (exportados con potrace): el transform voltea el eje Y */}
        <g
          transform="translate(0,222) scale(0.1,-0.1)"
          fill="currentColor"
          stroke="none"
        >
          <path d="M868 2141 c-40 -8 -74 -33 -83 -60 -2 -9 -34 -26 -69 -39 -106 -36 -185 -89 -281 -186 -73 -73 -99 -108 -133 -176 -45 -91 -82 -219 -82 -282 0 -31 -4 -38 -20 -38 -57 0 -100 -51 -100 -120 0 -49 31 -84 92 -102 28 -8 37 -16 33 -27 -97 -310 -39 -597 164 -814 95 -101 256 -197 391 -232 143 -37 402 -3 545 73 186 99 343 297 394 499 34 134 25 323 -24 481 -6 19 -4 22 19 22 61 0 106 45 106 105 0 54 -28 91 -81 106 -36 11 -39 15 -39 49 0 63 -47 229 -84 293 -89 158 -255 297 -411 347 -25 8 -55 30 -80 57 l-40 45 -90 4 c-50 1 -107 -1 -127 -5z m186 -107 c3 -9 6 -121 6 -250 0 -204 2 -235 16 -241 24 -9 34 9 44 78 36 248 48 321 53 325 10 11 75 -17 139 -58 68 -44 176 -150 198 -195 8 -16 19 -34 24 -42 24 -32 63 -159 71 -233 l7 -58 -650 0 -650 0 5 48 c10 104 60 245 107 306 31 38 82 90 141 140 41 36 171 100 184 92 6 -4 10 -19 9 -34 -1 -15 2 -36 5 -47 4 -11 16 -85 27 -163 11 -79 22 -148 25 -153 10 -14 32 -11 39 7 3 9 6 120 6 248 0 128 3 236 7 239 3 4 46 7 94 7 70 0 88 -3 93 -16z m677 -789 c1 -17 -249 -67 -442 -89 -347 -40 -643 -26 -965 46 -116 26 -134 33 -134 49 0 13 1540 7 1541 -6z m-1328 -151 c21 -3 36 -9 35 -13 -50 -92 -71 -181 -72 -296 -1 -107 7 -145 33 -145 16 0 18 11 18 123 -1 106 3 132 26 202 40 119 21 110 199 94 300 -27 700 -8 935 46 19 4 24 -3 45 -63 20 -57 23 -86 23 -202 0 -102 -5 -150 -19 -195 -18 -58 -75 -182 -95 -207 -6 -7 -27 -33 -46 -57 -20 -24 -48 -53 -63 -64 -15 -12 -29 -24 -32 -27 -3 -3 -17 -11 -32 -19 -16 -8 -28 -18 -28 -23 0 -4 -6 -8 -14 -8 -8 0 -22 -7 -31 -16 -15 -15 -115 -57 -115 -48 0 3 16 19 36 36 72 63 173 230 160 264 -11 28 -33 13 -57 -38 -87 -189 -220 -293 -374 -293 -96 1 -165 33 -231 109 -57 67 -62 74 -108 186 -44 108 -60 201 -53 306 5 70 3 83 -10 88 -25 10 -35 -7 -41 -65 -5 -51 15 -244 26 -264 4 -5 16 -38 28 -72 28 -79 66 -145 116 -199 l39 -43 -33 12 c-99 35 -261 191 -312 301 -19 39 -44 94 -57 121 -22 45 -24 64 -24 185 0 112 4 149 24 218 22 74 26 83 45 78 12 -2 38 -8 59 -12z" />
          <path d="M1394 1005 c-21 -32 -12 -69 26 -106 34 -34 72 -37 100 -9 29 29 25 64 -11 105 -39 45 -89 49 -115 10z" />
          <path d="M1120 979 c-31 -12 -59 -48 -60 -75 0 -12 9 -33 21 -48 16 -21 29 -26 64 -26 61 0 105 37 105 89 0 30 -5 40 -29 54 -32 19 -63 21 -101 6z" />
          <path d="M1289 781 c-82 -82 24 -177 118 -105 27 21 33 32 33 64 0 48 -27 70 -83 70 -29 0 -46 -7 -68 -29z" />
          <path d="M677 574 c-14 -14 -6 -81 16 -135 26 -61 75 -129 95 -129 20 0 14 43 -13 82 -14 20 -35 69 -48 109 -23 70 -35 88 -50 73z" />
        </g>
      </svg>
    </span>
  )
}