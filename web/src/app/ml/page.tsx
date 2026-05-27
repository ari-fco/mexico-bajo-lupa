import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, StatCard } from "@/components/ui/card";
import { qMlMeta } from "@/lib/ml-queries";
import { fmtCompact, fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} bn MXN`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} mil M MXN`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M MXN`;
  return `$${fmtInt(n)} MXN`;
}

export const metadata: Metadata = {
  title: "Investigación ML · Análisis no supervisado",
  description:
    "Cinco técnicas de aprendizaje no supervisado sobre 2.35M contratos públicos: Isolation Forest, LOF, Benford, clustering, análisis temporal por sexenio. Hallazgos: 365 contratos a empresas EFOS, 31 one-shot wonders millonarios, 9 estados con 100% datos null.",
  openGraph: {
    title: "ML · Investigación no supervisada · México Bajo Lupa",
    description:
      "Los patrones que el ojo humano no detecta: empresas fachada, captura institucional, ciclos electorales, EFOS post-presunción.",
  },
};

export default function MlPage() {
  const meta = qMlMeta();

  const cards = [
    {
      slug: "anomalias",
      titulo: "Anomalías robustas",
      subtitulo: "Contratos marcados por múltiples métodos",
      hint: `${fmtInt(meta.anomalias_robustas_reciente.n_total)} contratos · ${meta.anomalias_robustas_reciente.n_flags_max} señales máximas`,
      descripcion:
        "Contratos detectados por al menos 2 técnicas independientes (Isolation Forest + LOF + MAD + DBSCAN + EFOS). La intersección reduce ruido: cuantas más señales convergen, mayor el indicio.",
      badges: ["Reciente 2024-25", "Multi-señal"],
    },
    {
      slug: "historico",
      titulo: "Anomalías históricas",
      subtitulo: "8 señales sobre 15 años de contratos",
      hint: `${fmtInt(meta.anomalias_robustas_historico.n_5_flags)} contratos con 5 señales simultáneas`,
      descripcion:
        "Pipeline ampliado al histórico 2010-2024: 2.35M contratos con 8 señales independientes (incluye cruce EFOS por nombre y patrones post-presunción). 13 contratos con todas las banderas encendidas.",
      badges: ["Histórico 2010-24", "8 señales"],
    },
    {
      slug: "oneshots",
      titulo: "One-shot wonders",
      subtitulo: "Proveedores con 1 contrato y desaparecen",
      hint: `${fmtCompact(meta.oneshots.n_total)} proveedores · ${meta.oneshots.pct_de_proveedores}% del padrón`,
      descripcion: `${fmtCompact(meta.oneshots.n_mayor_1000M)} con contratos individuales >$1,000M. ${fmtMonto(meta.oneshots.monto_total_mxn)} agregados. 1.53× más probable que terminen en lista negra del SAT vs proveedores persistentes.`,
      badges: ["Histórico", "Empresas fachada"],
    },
    {
      slug: "estados",
      titulo: "Estados por riesgo",
      subtitulo: "Índice compuesto por entidad federativa",
      hint: `${meta.estados.n_estados} estados · 9 con 100% fechas null`,
      descripcion:
        "Combina %AD, HHI de proveedores, concentración en top-1, calidad de datos. Tlaxcala lidera (índice 1.000): 91% Adjudicación Directa, un solo proveedor concentra 48% del gasto estatal.",
      badges: ["32 entidades", "HHI + AD + datos"],
    },
    {
      slug: "efos",
      titulo: "EFOS post-presunción",
      subtitulo: "Contratos firmados DESPUÉS de la lista negra",
      hint: `${fmtInt(meta.efos_post_presuncion.n)} casos detectados`,
      descripcion:
        "Empresas que el SAT marcó como EFOS y, aún así, siguieron firmando contratos públicos. Monto bajo pero documenta el gap del sistema: no hay bloqueo automático.",
      badges: ["SAT 69-B CFF", "Cruce temporal"],
    },
    {
      slug: "temporal",
      titulo: "Continuidad temporal",
      subtitulo: "Patrones políticos: sexenios y años electorales",
      hint: `${fmtInt(meta.continuidad.n_solo_electorales)} solo en años electorales · ${fmtInt(meta.continuidad.n_persistentes)} cruzan 3+ sexenios`,
      descripcion:
        "Tres clases naturales: persistentes (oligopolios que sobreviven gobiernos), transitorios (1 solo sexenio), y los que aparecen solo en años electorales. Hallazgo contraintuitivo: %AD baja 10pp en electorales.",
      badges: ["Calderón → AMLO", "2010-2024"],
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <Badge variant="lozenge">ML no supervisado</Badge>
            <Badge variant="lozenge">Sin labels</Badge>
            <Badge variant="lozenge">Investigación back-office</Badge>
          </div>
          <h1
            className="display-xl leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Lo que el ojo humano
            <br />
            <span className="text-ash-accent">no detecta.</span>
          </h1>
          <p className="text-light-ash text-[16px] mt-6 max-w-3xl leading-relaxed">
            Cinco técnicas de aprendizaje no supervisado —{" "}
            <strong className="text-cloud-whisper">Isolation Forest, LOF, Benford, clustering, análisis temporal</strong>{" "}
            — sobre 2.35M contratos federales y estatales. No hay etiquetas de
            &ldquo;fraude&rdquo;; lo que sí hay son <em>patrones estadísticos</em> que
            convergen en proveedores y contratos específicos.
          </p>
          <p className="text-light-ash text-[14px] mt-4 max-w-3xl leading-relaxed">
            Cada técnica produce ruido por separado. La intersección de varias
            técnicas independientes apunta a algo. Esta página agrupa los hallazgos
            más robustos del análisis.
          </p>
        </div>
      </section>

      {/* Headline stats */}
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Contratos analizados"
              value="2.35M"
              hint="Histórico 2010-2024"
            />
            <StatCard
              label="One-shot wonders"
              value={fmtCompact(meta.oneshots.n_total)}
              hint={`${meta.oneshots.pct_de_proveedores}% del padrón total`}
            />
            <StatCard
              label="Solo en años electorales"
              value={fmtInt(meta.continuidad.n_solo_electorales)}
              hint="Proveedores que se activan solo en elecciones"
            />
            <StatCard
              label="Contratos EFOS post-presunción"
              value={fmtInt(meta.efos_post_presuncion.n)}
              hint="Firmados con empresas ya en lista negra SAT"
            />
          </div>
        </div>
      </section>

      {/* Cards de análisis */}
      <section className="py-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-6">Los seis frentes del análisis</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c) => (
              <Link
                key={c.slug}
                href={`/ml/${c.slug}`}
                className="group"
              >
                <Card
                  featured
                  className="p-6 h-full hover:bg-cloud-whisper/[0.03] transition-colors"
                >
                  <div className="flex flex-wrap gap-2 mb-4">
                    {c.badges.map((b) => (
                      <Badge key={b} variant="lozenge">{b}</Badge>
                    ))}
                  </div>
                  <h3 className="text-[20px] font-semibold leading-tight mb-1 group-hover:text-ash-accent transition-colors">
                    {c.titulo}
                  </h3>
                  <div className="text-[13px] text-light-ash mb-3">
                    {c.subtitulo}
                  </div>
                  <div className="text-[12px] text-ash-accent tabular mb-4">
                    {c.hint}
                  </div>
                  <p className="text-[14px] text-light-ash leading-relaxed">
                    {c.descripcion}
                  </p>
                  <div className="text-[12px] text-ash-accent mt-4 flex items-center gap-2">
                    Ver detalle <span aria-hidden>→</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology footer */}
      <section className="border-t border-cloud-whisper/8 py-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid md:grid-cols-2 gap-10">
          <div>
            <div className="eyebrow mb-3">Qué se hizo</div>
            <ul className="text-[14px] text-light-ash leading-relaxed space-y-2">
              <li>• <strong className="text-cloud-whisper">Pre-procesamiento:</strong> 4 datasets granulares (ComprasMX histórico, ComprasMX reciente, SESNSP delitos, SAT EFOS).</li>
              <li>• <strong className="text-cloud-whisper">Detección por contrato:</strong> Isolation Forest (top 1% anómalos), LOF como refinamiento, MAD score sobre log(monto), Benford por cortes.</li>
              <li>• <strong className="text-cloud-whisper">Detección por proveedor:</strong> clustering tipológico (k=8), análisis de continuidad temporal, ranking compuesto por concentración + AD.</li>
              <li>• <strong className="text-cloud-whisper">Análisis estructural:</strong> grafo bipartito proveedor↔institución, HHI por dependencia, TF-IDF + clusters sobre descripciones.</li>
              <li>• <strong className="text-cloud-whisper">Cruces externos:</strong> ComprasMX × SAT EFOS por RFC (reciente) y por nombre normalizado (histórico).</li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-3">Qué NO es</div>
            <ul className="text-[14px] text-light-ash leading-relaxed space-y-2">
              <li>• <strong className="text-cloud-whisper">No es prueba de fraude.</strong> Es exploración sin etiquetas. Ninguna anomalía está &ldquo;confirmada&rdquo; — solo señalada.</li>
              <li>• <strong className="text-cloud-whisper">No hay supervisión.</strong> Sin labels reales de fraude, los hiperparámetros no se optimizan. Defaults de sklearn.</li>
              <li>• <strong className="text-cloud-whisper">Datos imperfectos.</strong> El RFC es 100% null en el histórico (cruces por nombre normalizado, frágil). 57% de fechas null en reciente.</li>
              <li>• <strong className="text-cloud-whisper">Outliers ≠ ilegales.</strong> El contrato individual más grande del histórico (Operadora Cicsa, NAIM, $84.8 mil M) es obra real, no anomalía. La ML necesita contexto humano.</li>
              <li>• <strong className="text-cloud-whisper">Generado a fecha:</strong> {new Date(meta.generated_at).toLocaleDateString("es-MX", { dateStyle: "long" })}.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
