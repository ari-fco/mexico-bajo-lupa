import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Fuentes",
  description:
    "Catálogo de fuentes oficiales: SESNSP, INEGI, CONAPO, CONEVAL, ComprasMX, SHCP, SAT 69-B. Cobertura, volumen y URL oficial de cada dataset que alimenta el proyecto.",
  openGraph: {
    title: "Fuentes oficiales · México Bajo Lupa",
    description:
      "Cada cifra es trazable hasta una fuente del Estado mexicano. Si no podemos trazarla, no aparece.",
  },
};

const SOURCES = [
  {
    name: "SESNSP",
    full: "Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública",
    what: "Incidencia delictiva del fuero común. 413,952 registros mensuales 2015-2025 integrados (32 entidades, 7 categorías de delito).",
    files: [
      "IDEFC_NM Estatal · fuero común (integrado vía mirror lapanquecita/incidencia-delictiva)",
      "IDEFM_NM Municipal · fuero común (V7 · ~2,400 municipios)",
      "IDVFC Víctimas (próximo)",
    ],
    url: "https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva",
    update: "Mensual",
    status: "active" as const,
  },
  {
    name: "INEGI",
    full: "Instituto Nacional de Estadística y Geografía",
    what: "PIB por entidad federativa 2024 integrado (precios constantes 2018). Marco geoestadístico, Censo 2020, ENIGH y ENVIPE pendientes.",
    files: [
      "PIBE por entidad federativa 2024 — integrado (32 entidades, precios 2018)",
      "Marco Geoestadístico (gaia.inegi.org.mx/wscatgeo) — próximo",
      "Censo 2020 · tabulados básicos — próximo",
    ],
    url: "https://www.inegi.org.mx/datosabiertos/",
    update: "Variable (anual / quinquenal)",
    status: "active" as const,
  },
  {
    name: "CONAPO",
    full: "Consejo Nacional de Población",
    what: "Proyecciones de población 2020-2070 por entidad y municipio. Usado para normalizar incidencia delictiva por habitantes.",
    files: ["Proyecciones de la Población de México 1990-2040 (1,632 filas integradas)"],
    url: "https://conapo.segob.gob.mx/es/CONAPO/Datos_abiertos",
    update: "Anual (revisión)",
    status: "active" as const,
  },
  {
    name: "ComprasMX",
    full: "Plataforma Digital de Contrataciones Públicas (ex-CompraNet)",
    what: "Contratos públicos: institución, monto, modalidad, ganador, fechas. 235,392 contratos 2024-25 integrados — separados en 223k FEDERALES (APF) y 12,377 ESTATALES analizados por entidad federativa (% adjudicación directa y MAD Benford).",
    files: [
      "Contratos_CompraNet2024.csv (143,542 contratos)",
      "Contratos_CompraNet2025.csv (91,850 contratos)",
      "Análisis estatal: 12,377 contratos · 32 entidades · todas con muestra ≥100",
      "Histórico CompraNet 5.0 (2010-2022) — integrado (2.36M contratos · ver /historico)",
    ],
    url: "https://comprasmx.buengobierno.gob.mx/",
    update: "Continuo",
    status: "active" as const,
  },
  {
    name: "SHCP",
    full: "Secretaría de Hacienda y Crédito Público · Transparencia Presupuestaria",
    what: "Transferencias federales (Ramo 28 Participaciones, Ramo 33 Aportaciones, Convenios y Subsidios) por entidad federativa. Series mensuales 2011 a 2026 integradas: total 2025 fue 2.65 billones MXN federalizados.",
    files: [
      "Transferencias 2011→presente (CSV mensual · 250k filas integradas)",
      "Cuenta Pública (próximo)",
      "PEF · Programa Federalizado por programa/fondo (próximo)",
    ],
    url: "https://www.transparenciapresupuestaria.gob.mx/",
    update: "Mensual",
    status: "active" as const,
  },
  {
    name: "SAT",
    full: "Servicio de Administración Tributaria · Listado completo Art. 69-B CFF (EFOS)",
    what: "Listado oficial de Empresas que Facturan Operaciones Simuladas (EFOS) y categorías relacionadas: Definitivos, Presuntos, Desvirtuados y Sentencia Favorable. Cruzado con ComprasMX federal para identificar contratos públicos a proveedores señalados por el SAT.",
    files: [
      "Listado_Completo_69-B.csv (14,234 registros · 11,270 Definitivos)",
      "Cruce contra ComprasMX federal 2024-2025 (RFC × RFC, normalizado)",
    ],
    url: "http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv",
    update: "Continuo (revisión trimestral)",
    status: "active" as const,
  },
  {
    name: "INAI",
    full: "Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales",
    what: "Plataforma Nacional de Transparencia. Cumplimiento de obligaciones por sujeto obligado. Pendiente: el INAI fue disuelto en 2025; la PNT sigue en línea bajo administración transitoria pero sin API estable.",
    files: ["PNT (Plataforma Nacional de Transparencia)"],
    url: "https://www.plataformadetransparencia.org.mx/",
    update: "Continuo",
    status: "v5" as const,
  },
  {
    name: "CONEVAL",
    full: "Consejo Nacional de Evaluación de la Política de Desarrollo Social",
    what: "Medición multidimensional de pobreza 2022 integrada por entidad: pobreza, pobreza extrema y vulnerables por carencias.",
    files: [
      "Pobreza por entidad federativa 2022 — integrado (32 entidades)",
      "Series históricas 2008-2020 — próximo",
    ],
    url: "https://www.coneval.org.mx/Medicion/Paginas/PobrezaInicio.aspx",
    update: "Bienal",
    status: "active" as const,
  },
  {
    name: "IMCO",
    full: "Instituto Mexicano para la Competitividad",
    what: "Índice de Competitividad Estatal e Índice BIPE (Barómetro de Información Presupuestal Estatal). Pendiente: la edición 2026 todavía no se publica como dataset estructurado.",
    files: ["ICE (anual)", "BIPE 2019-2023 — disponible en PDF y CSV histórico"],
    url: "https://imco.org.mx/indices/",
    update: "Anual",
    status: "v5" as const,
  },
] as const;

export default function FuentesPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">De dónde vienen los datos</div>
          <h1
            className="display-xl leading-[0.95] tracking-tight max-w-4xl"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Solo oficiales.
            <br />
            <span className="text-ash-accent">Sin intermediarios.</span>
          </h1>
          <p className="text-light-ash text-[15px] mt-6 max-w-3xl">
            Cada cifra es trazable hasta una fuente del Estado mexicano. Si
            una fuente cambia su esquema, el script ETL falla en lugar de
            silenciosamente reportar números equivocados.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid gap-px bg-cloud-whisper/8">
          {SOURCES.map((s) => (
            <div
              key={s.name}
              className="bg-midnight-void p-7 grid md:grid-cols-12 gap-6 items-start"
            >
              <div className="md:col-span-3 flex flex-col gap-2">
                <div className="display text-[28px]">{s.name}</div>
                <div className="text-[11px] text-ash-accent leading-relaxed">
                  {s.full}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {s.status === "active" && (
                    <Badge variant="good">Activa · V1</Badge>
                  )}
                  {s.status === "v5" && (
                    <>
                      <Badge variant="lozenge">V5 · Pendiente</Badge>
                      <Link
                        href="/transparencia"
                        className="text-[10px] text-ash-accent hover:text-cloud-whisper underline decoration-1 underline-offset-4"
                      >
                        ¿Por qué falta? →
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="md:col-span-6 text-[14px] text-light-ash leading-relaxed">
                {s.what}
                <ul className="mt-3 space-y-1 text-[12px] text-ash-accent">
                  {s.files.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-3 flex flex-col gap-2 text-[12px]">
                <div className="text-ash-accent">Actualización</div>
                <div className="text-cloud-whisper mb-2">{s.update}</div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-light-ash underline decoration-1 underline-offset-4 hover:text-cloud-whisper truncate"
                >
                  {new URL(s.url).hostname.replace("www.", "")} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-cloud-whisper/8 py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Cómo verificas tú</div>
          <h2 className="display text-[28px] md:text-[36px] tracking-tight max-w-3xl mb-6">
            Si dudas de un número, no nos creas — descarga la fuente.
          </h2>
          <p className="text-light-ash text-[14px] max-w-3xl leading-relaxed">
            Cada métrica tiene un tooltip con la fuente y el período. Los
            scripts de descarga están en la carpeta <code className="text-cloud-whisper bg-cloud-whisper/10 px-2 py-0.5 rounded">/etl</code> del repositorio. Cualquiera puede correrlos
            y reproducir los Parquet desde cero.
          </p>
        </div>
      </section>
    </div>
  );
}
