import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/card";
import { HomeMapPreview } from "@/components/home-map-preview";
import { AnomaliasDestacadas } from "@/components/anomalias-destacadas";
import {
  SESNSP_FIRST_YEAR,
  SESNSP_LAST_YEAR,
  SESNSP_LAST_PERIOD_LABEL,
  COMPRASMX_RANGE_LABEL,
  COMPRASMX_N,
} from "@/lib/data-meta";
import { fmtCompact } from "@/lib/format";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex flex-col items-start gap-10 fade-in">
            <Badge variant="lozenge">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-good" />
              MVP V1 · Datos oficiales SESNSP + CONAPO + ComprasMX
            </Badge>

            <h1
              className="display-xl max-w-5xl"
              style={{ fontSize: "clamp(3rem, 10vw, 8rem)" }}
            >
              México,
              <br />
              <span className="text-ash-accent">bajo lupa.</span>
            </h1>

            <p className="text-light-ash text-[18px] md:text-[20px] leading-relaxed max-w-2xl">
              No es otro dashboard descriptivo. Es una auditoría ciudadana:
              cruzamos seguridad, gasto público y compras del gobierno con
              estadística crítica para exponer lo que las cifras oficiales no
              dicen por sí solas.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ButtonLink href="/mapa" variant="primary" size="lg">
                Explorar el mapa
              </ButtonLink>
              <ButtonLink href="/anomalias" variant="ghost" size="lg">
                Ver anomalías Benford
              </ButtonLink>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(1200px 600px at 80% 20%, rgba(255,255,255,0.06), transparent 60%)",
          }}
        />
      </section>

      {/* FEATURED FINDING */}
      <section className="border-t border-cloud-whisper/8 py-16 md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <AnomaliasDestacadas />
        </div>
      </section>

      {/* STAT BAND */}
      <section className="border-t border-cloud-whisper/8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-cloud-whisper/8">
          <div className="bg-midnight-void">
            <StatCard
              label="Entidades federativas"
              value="32"
              hint="Cobertura nacional completa"
            />
          </div>
          <div className="bg-midnight-void">
            <StatCard
              label="Fuentes integradas"
              value="7"
              hint="SESNSP · CONAPO · ComprasMX · INEGI · CONEVAL · SHCP · SAT EFOS"
            />
          </div>
          <div className="bg-midnight-void">
            <StatCard
              label="Años de historia"
              value={String(SESNSP_LAST_YEAR - SESNSP_FIRST_YEAR + 1)}
              hint={`${SESNSP_FIRST_YEAR} → ${SESNSP_LAST_PERIOD_LABEL} · SESNSP estatal`}
            />
          </div>
          <div className="bg-midnight-void">
            <StatCard
              label="Contratos federales analizados"
              value={fmtCompact(COMPRASMX_N)}
              hint={`Benford + MAD de Nigrini · APF ${COMPRASMX_RANGE_LABEL}`}
            />
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="eyebrow mb-5">Diferenciador</div>
            <h2
              className="display leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.625rem)" }}
            >
              Otros sitios{" "}
              <span className="text-ash-accent">describen</span>.
              <br />
              Este{" "}
              <em className="not-italic underline decoration-1 underline-offset-8">
                cuestiona
              </em>
              .
            </h2>
          </div>

          <div className="md:col-span-7 grid sm:grid-cols-2 gap-x-10 gap-y-12">
            <Pillar
              n="01"
              title="Cruces que nadie hace"
              body="¿Qué dependencia gasta más por adjudicación directa en estados con mayor incidencia delictiva? El cruce existe en los datos públicos. Hasta hoy, no en una pantalla."
            />
            <Pillar
              n="02"
              title="Estadística forense"
              body="Aplicamos la Ley de Benford y el MAD de Nigrini sobre montos de contratos. No probamos fraude — levantamos banderas para que alguien con autoridad investigue."
            />
            <Pillar
              n="03"
              title="Velocidad seria"
              body="Datos compilados en archivos estáticos servidos desde Edge CDN. Páginas estatales prerenderizadas en build. Cero infraestructura viva, milisegundos de respuesta."
            />
            <Pillar
              n="04"
              title="Postura clara"
              body="Cuando dos oficinas oficiales dicen cosas distintas del mismo estado, lo mostramos lado a lado. La transparencia descriptiva sin postura es decoración."
            />
          </div>
        </div>
      </section>

      {/* MAP TEASER */}
      <section className="border-t border-cloud-whisper/8 py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="eyebrow mb-4">Mapa interactivo</div>
              <h2
                className="display tracking-tight max-w-2xl"
                style={{ fontSize: "clamp(2rem, 5vw, 3.625rem)" }}
              >
                32 estados. Una sola lectura.
              </h2>
            </div>
            <ButtonLink href="/mapa" variant="ghost" size="md">
              Abrir el mapa completo →
            </ButtonLink>
          </div>

          <div className="rounded-card overflow-hidden border border-cloud-whisper/10 bg-steel-gray">
            <HomeMapPreview />
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="border-t border-cloud-whisper/8 py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-6">Hoja de ruta</div>
          <h2
            className="display tracking-tight mb-14 max-w-3xl"
            style={{ fontSize: "clamp(2rem, 5vw, 3.625rem)" }}
          >
            Shipea feo y temprano. Después escala.
          </h2>

          <div className="grid md:grid-cols-4 gap-px bg-cloud-whisper/8">
            <Phase
              tag="V1-V4"
              status="now"
              title="Datos integrados"
              body="SESNSP, INEGI PIB, CONEVAL pobreza, SHCP gasto federalizado, ComprasMX (federal+estatal) y 12 años de histórico CompraNet 5.0 (2.3M contratos)."
            />
            <Phase
              tag="V5"
              status="next"
              title="Transparencia estatal"
              body="IMCO BIPE / sucesor del INAI: índice de transparencia y calidad de información presupuestal por entidad. Pendiente de fuente integrable."
            />
            <Phase
              tag="V6"
              status="later"
              title="Anomalía de la semana"
              body="Detección automática del contrato o dependencia con mayor desviación estadística reciente. Newsletter editorial."
            />
            <Phase
              tag="V7"
              status="now"
              title="EFOS · proveedores señalados"
              body="Cruce con la lista oficial del SAT (Art. 69-B CFF) de Empresas que Facturan Operaciones Simuladas. Detectamos contratos públicos a RFCs ya marcados por el SAT — incluyendo los firmados después de la presunción."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 text-center">
          <h2
            className="display-xl leading-[1] tracking-tight max-w-4xl mx-auto text-balance"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Los datos ya existen.
            <br />
            <span className="text-ash-accent">
              Lo que faltaba era la lectura.
            </span>
          </h2>
          <div className="mt-10 flex items-center justify-center gap-3">
            <ButtonLink href="/mapa" variant="primary" size="lg">
              Empezar
            </ButtonLink>
            <ButtonLink href="/metodologia" variant="ghost" size="lg">
              Cómo lo hacemos
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pillar({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border-t border-cloud-whisper/10 pt-5 flex flex-col gap-3">
      <div className="text-[11px] tabular text-ash-accent">{n}</div>
      <h3 className="text-[20px] font-medium tracking-tight">{title}</h3>
      <p className="text-[14px] leading-relaxed text-light-ash">{body}</p>
    </div>
  );
}

function Phase({
  tag,
  status,
  title,
  body,
}: {
  tag: string;
  status: "now" | "next" | "later";
  title: string;
  body: string;
}) {
  const dot =
    status === "now"
      ? "bg-signal-good"
      : status === "next"
        ? "bg-signal-warn"
        : "bg-cloud-whisper/20";
  const label =
    status === "now" ? "En curso" : status === "next" ? "Próximo" : "Después";
  return (
    <div className="bg-midnight-void p-7 flex flex-col gap-5 min-h-[220px]">
      <div className="flex items-center justify-between">
        <span className="display text-[42px]">{tag}</span>
        <span className="inline-flex items-center gap-2 text-[11px] text-ash-accent">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </span>
      </div>
      <h3 className="text-[18px] font-medium tracking-tight mt-auto">
        {title}
      </h3>
      <p className="text-[13px] leading-relaxed text-light-ash">{body}</p>
    </div>
  );
}
