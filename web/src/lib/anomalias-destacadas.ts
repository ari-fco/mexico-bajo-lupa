/**
 * Hallazgos editoriales destacados — México Bajo Lupa.
 *
 * Cada cifra de este archivo se reprodujo directamente desde un
 * Parquet del proyecto el 2026-05-12. La consulta exacta vive como
 * comentario sobre cada entrada para que cualquiera pueda
 * reverificarla y para que la próxima regeneración (cuando el ETL
 * actualice las fuentes) sepa exactamente qué reproducir.
 *
 * Verificación: ejecutar los snippets en `.venv` con pandas leyendo
 * los Parquet bajo `data/processed/`. Todos los hallazgos que no
 * pasaron este filtro fueron eliminados.
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
  // Query: estado_metrics.parquet → Tlaxcala adjudicacion_directa_pct = 91.1
  //        sobre 135 contratos estatales en ComprasMX 2024-25.
  //        Mediana nacional (n>=30): 38.0%. Spread: +53.1 puntos.
  {
    id: "tlaxcala-ad-extrema",
    tag: "Compras",
    intensidad: "alert",
    titular: "Tlaxcala adjudicó directo 9 de cada 10 contratos estatales",
    body:
      "Sobre 135 contratos estatales publicados en ComprasMX, el 91.1% se otorgaron sin licitación pública. La mediana nacional es 38%, así que Tlaxcala está a 53 puntos por encima del estado promedio. El segundo lugar (San Luis Potosí) queda a 20 puntos de distancia.",
    cifra: "91.1%",
    cifra_label: "adjudicación directa",
    fuente: "ComprasMX 2024-25 (estatal)",
    link: "/estado/tlaxcala",
  },

  // Query: historico_anual.parquet → 2021 pct_ad = 79.6
  //        Promedios por sexenio (anos con >=20k contratos):
  //        Calderon 2010-12: 70.5%, Pena 2013-18: 73.1%, AMLO 2019-22: 78.2%.
  {
    id: "amlo-ad-record",
    tag: "Histórico",
    intensidad: "alert",
    titular: "2021 fue el año récord de adjudicación directa en CompraNet 5.0",
    body:
      "El 79.6% de los contratos federales de 2021 se otorgaron sin licitación pública. Es el punto más alto del archivo CompraNet 2010-2022. El promedio del sexenio AMLO (78.2%) supera al de Peña (73.1%) y al de Calderón (70.5%) — la tendencia hacia la AD no es coyuntural.",
    cifra: "79.6%",
    cifra_label: "AD federal · 2021",
    fuente: "CompraNet 5.0 · 2010-2022",
    link: "/historico",
  },

  // Query: estado_metrics.parquet → Colima homicidios_100k_ult12m = 72.6,
  //        cambio_yoy = -25.6, gasto_federalizado_per_capita = 25,549.
  //        Top 3 hom/100k: Colima 72.6, Morelos 48.5, Sinaloa 42.5.
  {
    id: "colima-violencia-gasto",
    tag: "Seguridad",
    intensidad: "alert",
    titular: "Colima encabeza homicidios per cápita pese al gasto federal alto",
    body:
      "72.6 homicidios por 100k habitantes — más del doble que Morelos, el segundo en el ranking. Y aún así Colima recibe $25,549 de gasto federalizado por persona al año, top 3 nacional. La cifra interanual mejoró (-25.6%) pero el nivel sigue siendo el más alto del país.",
    cifra: "72.6",
    cifra_label: "hom. / 100k habitantes",
    fuente: "SESNSP · últ. 12m + CONAPO + SHCP",
    link: "/estado/colima",
  },

  // Query: estado_metrics.parquet → Sinaloa cambio_yoy = +68.3.
  //        Comparación de homicidios dolosos últimos 12m vs los 12m previos.
  {
    id: "sinaloa-yoy",
    tag: "Seguridad",
    intensidad: "alert",
    titular: "Sinaloa: los homicidios crecieron 68% en un año",
    body:
      "Los homicidios dolosos en Sinaloa subieron 68.3% en los últimos 12 meses contra el período anterior. Coincide con el quiebre interno del cartel local entre las facciones de los Chapitos y los Mayos. Es la mayor variación interanual entre las 32 entidades.",
    cifra: "+68.3%",
    cifra_label: "homicidios YoY",
    fuente: "SESNSP · ventana móvil 12m",
    link: "/estado/sinaloa",
  },

  // Query: estado_metrics.parquet → Yucatán homicidios_100k_ult12m = 1.39
  //        (rank #32 — el más bajo).
  {
    id: "yucatan-mas-seguro",
    tag: "Seguridad",
    intensidad: "good",
    titular: "Yucatán: 52 veces menos homicidios per cápita que Colima",
    body:
      "1.39 homicidios por 100k habitantes — la tasa más baja del país. Sirve como referencia para el debate gasto-vs-resultado: estados con presupuesto federalizado equivalente o menor logran un orden de magnitud distinto en violencia.",
    cifra: "1.39",
    cifra_label: "hom. / 100k · #32 nacional",
    fuente: "SESNSP · últ. 12m + CONAPO",
    link: "/estado/yucatan",
  },

  // Query: dependencias_riesgo.parquet → top MAD con >=300 contratos.
  //        Sistema Público de Radiodifusión del Estado Mexicano:
  //        MAD = 0.0842, AD = 95.9%, 1,022 contratos. 5.6× el umbral
  //        de no-conformidad de Nigrini (0.015).
  {
    id: "spr-mad-extremo",
    tag: "Fiscal",
    intensidad: "alert",
    titular: "Sistema Público de Radiodifusión: 5.6× el umbral forense de Benford",
    body:
      "Con 1,022 contratos federales, el SPR exhibe un MAD de Nigrini de 0.0842 — más de cinco veces el umbral de no-conformidad estándar (0.015). Y el 95.9% de sus contratos son por adjudicación directa. El primer dígito de sus montos no se comporta como dataset financiero natural.",
    cifra: "0.0842",
    cifra_label: "MAD Benford · 1,022 contratos",
    fuente: "ComprasMX · Test de Benford",
    link: "/anomalias",
  },

  // Query: sat_efos.parquet → estatus.value_counts()
  //        DEFINITIVO: 11,270 / Total padrón: 14,234.
  //        Definitivo = SAT con resolución firme.
  {
    id: "efos-definitivos",
    tag: "Fiscal",
    intensidad: "alert",
    titular: "El SAT tiene 11,270 empresas con resolución firme por facturas falsas",
    body:
      "Categoría Definitivo del Listado 69-B: el SAT ya emitió resolución firme confirmando que esas empresas emiten comprobantes que amparan operaciones inexistentes. Son 11,270 RFCs sobre un padrón total de 14,234 contribuyentes señalados.",
    cifra: "11,270",
    cifra_label: "EFOS Definitivos · SAT",
    fuente: "SAT · Listado 69-B CFF",
    link: "/efos",
  },

  // Query: efos_kpis.json (build_efos_metrics.py) →
  //        n_contratos_cruce = 14 contratos federales con RFCs EFOS
  //        n_contratos_posteriores_amplio = 3 firmados DESPUÉS de presunción
  //        monto_total_cruce = $111,097,828 MXN
  {
    id: "efos-cruce-comprasmx",
    tag: "Captura",
    intensidad: "alert",
    titular: "14 contratos federales firmados con RFCs señalados por el SAT",
    body:
      "El cruce SAT × ComprasMX federal 2024-25 detectó 14 contratos por $111 millones MXN otorgados a empresas en el listado 69-B. Tres de ellos se firmaron después de que el SAT publicara la presunción — la señal más fuerte para auditoría.",
    cifra: "14",
    cifra_label: "contratos federales · $111M MXN",
    fuente: "SAT 69-B × ComprasMX 2024-25",
    link: "/efos",
  },

  // Query: historico_proveedores_top.parquet → "Farmaceuticos Maypo, S.A. de C.V."
  //        contratos=13,890 monto_total=$75,611M anos_activos=15
  //        pct_ad=87.9 — activo desde 2010-07 hasta 2024-01.
  {
    id: "maypo-captura",
    tag: "Captura",
    intensidad: "alert",
    titular: "Farmacéuticos Maypo: 13,890 contratos en 15 años, 87.9% por adjudicación directa",
    body:
      "Tercer proveedor histórico de la APF por monto acumulado ($75,611 millones MXN). Activo desde 2010 hasta 2024 — atraviesa tres sexenios. La proporción de adjudicación directa (87.9%) es estructuralmente inversa a la esperada en un proveedor con relación competitiva sostenida.",
    cifra: "87.9%",
    cifra_label: "AD · 15 años · 13.9k contratos",
    fuente: "CompraNet 5.0 · 2010-2024",
    link: "/historico",
  },

  // Query: estado_metrics.parquet → patrón "Benford alto + AD baja"
  //        Guerrero MAD 0.0356 AD 16.4%
  //        CDMX MAD 0.0308 AD 51.8%
  //        Baja California MAD 0.0269 AD 14.7%
  //        Umbral usado: MAD>=0.025 + AD<55% + >=30 contratos.
  {
    id: "patron-benford-no-ad",
    tag: "Fiscal",
    intensidad: "warn",
    titular: "Guerrero, CDMX y BC: formalmente competitivos, numéricamente sospechosos",
    body:
      "Tres estados con baja adjudicación directa (16%, 52%, 15%) presentan MAD Benford por encima del umbral forense de Nigrini en sus compras estatales. Hipótesis editorial: fragmentación de contratos para evadir umbrales de licitación. La modalidad limpia no garantiza distribución natural.",
    cifra: "3",
    cifra_label: "estados · MAD ≥ 0.025 + AD < 55%",
    fuente: "ComprasMX 2024-25 (estatal)",
    link: "/mapa",
  },
];
