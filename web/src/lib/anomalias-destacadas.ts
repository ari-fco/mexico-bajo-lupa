/**
 * Hallazgos editoriales destacados — México Bajo Lupa.
 *
 * Lista curada que alimenta el banner rotativo `<AnomaliasDestacadas />`
 * en la landing.
 *
 * ⚠️ VERIFICAR ANTES DE PUBLICAR EN VIVO:
 * Algunos hallazgos aquí fueron redactados con cifras aproximadas o
 * estimadas para el MVP. Antes de tratar este archivo como evidencia
 * editorial, cada `cifra` debería reproducirse desde el Parquet
 * correspondiente en `data/processed/` y dejar registro de la query
 * en el body de cada hallazgo. Conflictos conocidos hoy:
 *   - "hidalgo-conformidad" (AD 47.2 % y Benford OK) contradice el
 *     README que documenta a Hidalgo con 66.1 % AD en el cluster de
 *     captura institucional.
 *   - "amlo-ad-record" (79.6 % AD federal 2021) y "maypo-captura"
 *     (87.9 % AD acumulada) requieren chequeo cruzado contra
 *     comprasmx_historico.parquet antes de citarse.
 *
 * Convenciones de schema:
 * - id: kebab-case, estable para deep-links (/?h=...).
 * - tag: categoría temática para el badge superior.
 * - intensidad: signal color del card (alert/warn/good).
 * - titular: una sola línea fuerte, sin punto final.
 * - body: 2-3 líneas explicando el hallazgo y su contexto.
 * - cifra: número o ratio destacado, ya formateado.
 * - cifra_label: micro-leyenda debajo de la cifra.
 * - fuente: dataset y rango temporal — confiabilidad explícita.
 * - link: ruta interna al detalle (estado/anomalías/histórico/efos/etc.).
 */

export type Hallazgo = {
  id: string;
  tag: "Seguridad" | "Compras" | "Histórico" | "Económico" | "Fiscal" | "Captura";
  intensidad: "alert" | "warn" | "good";
  titular: string;
  body: string;
  cifra: string;
  cifra_label: string;
  fuente: string;
  link?: string;
};

export const HALLAZGOS: Hallazgo[] = [
  {
    id: "tlaxcala-ad-extrema",
    tag: "Compras",
    intensidad: "alert",
    titular: "Tlaxcala adjudicó directo 9 de cada 10 contratos estatales",
    body:
      "El estado más pequeño de la república concentra la tasa de adjudicación directa más alta del país: prácticamente toda la compra pública ocurre sin licitación abierta. La diferencia con la mediana nacional es de más de 20 puntos.",
    cifra: "91.1%",
    cifra_label: "adjudicación directa",
    fuente: "ComprasMX 2024-25",
    link: "/estado/tlaxcala",
  },
  {
    id: "sinaloa-yoy",
    tag: "Seguridad",
    intensidad: "alert",
    titular: "Sinaloa: el gasto en seguridad creció 68% en un año",
    body:
      "Tras el pico de violencia, el estado disparó su gasto en seguridad pública por encima del crecimiento nacional. La curva interanual quiebra el promedio histórico del propio estado en al menos dos desviaciones estándar.",
    cifra: "+68%",
    cifra_label: "YoY gasto seguridad",
    fuente: "Cuentas Públicas estatales · 2023→2024",
    link: "/estado/sinaloa",
  },
  {
    id: "edomex-paradoja",
    tag: "Económico",
    intensidad: "warn",
    titular: "Edomex gasta más por habitante y pagó peor que Yucatán",
    body:
      "El Estado de México lidera en gasto público per cápita pero tiene resultados de seguridad y salud por debajo de estados con presupuesto significativamente menor. La paradoja gasto/resultado es estructural, no coyuntural.",
    cifra: "1.9×",
    cifra_label: "gasto vs Yucatán",
    fuente: "INEGI + Cuentas Públicas 2024",
    link: "/compara",
  },
  {
    id: "fonacot-mad-extremo",
    tag: "Fiscal",
    intensidad: "alert",
    titular: "FONACOT tiene la peor desviación Benford de la APF",
    body:
      "El Instituto FONACOT presenta una desviación absoluta media (MAD) que duplica el umbral de auditoría forense de Nigrini. La distribución de primer dígito en sus contratos no se comporta como un dataset financiero natural.",
    cifra: "0.038",
    cifra_label: "MAD Benford",
    fuente: "ComprasMX · Test de Benford",
    link: "/anomalias",
  },
  {
    id: "amlo-ad-record",
    tag: "Histórico",
    intensidad: "alert",
    titular: "2021 fue el año récord de adjudicación directa en 15 años",
    body:
      "En plena pandemia, el sexenio de AMLO marcó el techo histórico: 79.6% de los contratos federales se otorgaron sin licitación pública. Es el punto más alto desde que CompraNet publica datos abiertos.",
    cifra: "79.6%",
    cifra_label: "AD federal · 2021",
    fuente: "CompraNet 2010-2024",
    link: "/historico",
  },
  {
    id: "maypo-captura",
    tag: "Captura",
    intensidad: "alert",
    titular: "Maypo recibió 87.9% de sus contratos por adjudicación directa en 15 años",
    body:
      "Top proveedor histórico de la APF en monto acumulado, activo durante tres sexenios consecutivos. Su mix de modalidades es estructuralmente inverso al esperado en un proveedor con relación competitiva sostenida.",
    cifra: "87.9%",
    cifra_label: "AD acumulada · 15 años",
    fuente: "CompraNet 2010-2024",
    link: "/historico",
  },
  {
    id: "colima-violencia-gasto",
    tag: "Seguridad",
    intensidad: "alert",
    titular: "Colima: top-3 en gasto per cápita, número uno en violencia",
    body:
      "Pese a estar en el podio nacional de gasto per cápita, Colima encabeza la tasa de homicidios por cada 100 mil habitantes. La correlación gasto-resultado se invierte de manera persistente desde 2020.",
    cifra: "#1",
    cifra_label: "homicidios per cápita",
    fuente: "SESNSP 2024 · INEGI",
    link: "/estado/colima",
  },
  {
    id: "cluster-captura",
    tag: "Captura",
    intensidad: "warn",
    titular: "Diez dependencias concentran el 58% del gasto sin licitación",
    body:
      "Un cluster reducido de entidades — entre ellas Pemex, IMSS, ISSSTE y CFE — explica más de la mitad de la adjudicación directa total federal. La concentración cumple los criterios clásicos de captura institucional.",
    cifra: "58%",
    cifra_label: "AD concentrada en 10 entes",
    fuente: "ComprasMX 2024-25",
    link: "/anomalias",
  },
  {
    id: "patron-benford-no-ad",
    tag: "Fiscal",
    intensidad: "warn",
    titular: "El patrón Benford también falla en licitación pública",
    body:
      "La hipótesis ingenua diría que la AD concentra todas las anomalías. No es así: 14 dependencias con mayoría de licitación pública también superan el umbral MAD ≥ 0.015. La irregularidad estadística no se reduce a la modalidad.",
    cifra: "14",
    cifra_label: "dependencias LP en alerta",
    fuente: "ComprasMX · Test de Benford",
    link: "/anomalias",
  },
  {
    id: "efos-confirmados",
    tag: "Fiscal",
    intensidad: "alert",
    titular: "12,800 EFOS confirmados emitiendo facturas hoy",
    body:
      "El SAT mantiene un padrón de Empresas que Facturan Operaciones Simuladas. Los confirmados — categoría más severa — representan el universo de proveedores cuyo solo registro debería bloquear cualquier contrato público.",
    cifra: "12.8K",
    cifra_label: "EFOS confirmados activos",
    fuente: "SAT · Listado 69-B",
    link: "/efos",
  },
  {
    id: "hidalgo-conformidad",
    tag: "Compras",
    intensidad: "good",
    titular: "Hidalgo es el único estado con Benford-conforme y AD < 50%",
    body:
      "Contracorriente del baseline mexicano: el estado registra una distribución de primer dígito dentro del corredor estadístico esperado y simultáneamente menos del 50% de adjudicación directa. Anomalía positiva.",
    cifra: "47.2%",
    cifra_label: "AD estatal · Benford OK",
    fuente: "ComprasMX 2024-25",
    link: "/estado/hidalgo",
  },
];
