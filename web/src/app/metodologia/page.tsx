import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Metodología",
  description:
    "Cómo procesamos datos oficiales, qué decisiones tomamos y por qué.",
};

export default function MetodologiaPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Cómo lo hacemos</div>
          <h1
            className="display-xl leading-[0.95] tracking-tight max-w-4xl"
            style={{ fontSize: "clamp(2.25rem, 7vw, 5rem)" }}
          >
            Sin trucos.
            <br />
            <span className="text-ash-accent">Solo decisiones explicadas.</span>
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 prose-invert text-[15px] leading-relaxed text-light-ash space-y-12">
          <Block n="01" title="Arquitectura: estática, no servida">
            <p>
              Los datos del gobierno se actualizan mensual o trimestralmente.
              Nada es tiempo real. No hace falta servidor de aplicación. El
              flujo:
            </p>
            <ol className="list-decimal pl-5 space-y-2 mt-4">
              <li>
                Scripts Python descargan CSVs/Excel/PDFs oficiales (carpeta{" "}
                <code>/etl</code>).
              </li>
              <li>
                Limpieza, normalización de claves de estado{" "}
                <code>CVE_ENT</code>, cálculo de métricas derivadas.
              </li>
              <li>
                Exportación a Parquet (canónico) y JSON compacto (consumo del
                frontend en V1).
              </li>
              <li>
                Next.js compila las páginas estatales como rutas estáticas — 32
                páginas pre-renderizadas en el build.
              </li>
              <li>
                CDN (Vercel) sirve HTML + JSON. La interactividad es 100%
                cliente con MapLibre y Recharts.
              </li>
            </ol>
            <p className="mt-4">
              Cuando los datasets crezcan a la decena de MB,{" "}
              <code>DuckDB-WASM</code> tomará el relevo del JSON: SQL real
              sobre Parquet remoto, dentro del navegador, con HTTP range
              requests. La capa de queries (<code>lib/queries.ts</code>) está
              diseñada para que el cambio sea transparente al resto de la app.
            </p>
            <p className="mt-4 text-ash-accent text-[13px]">
              Costo de hosting: cercano a cero. Sin base de datos viva, sin
              backups, sin migraciones rotas.
            </p>
          </Block>

          <Block n="02" title="Normalización geográfica: CVE_ENT">
            <p>
              Cada fuente identifica los estados de forma distinta — INEGI usa
              códigos de dos dígitos (01-32), SESNSP usa nombres con
              variaciones (&ldquo;México&rdquo; vs &ldquo;Estado de
              México&rdquo; vs &ldquo;Edo. Mex.&rdquo;), SHCP usa numeración
              propia. Reducimos todo a la clave canónica del INEGI{" "}
              <code>CVE_ENT</code> antes de cualquier cruce.
            </p>
          </Block>

          <Block n="03" title="Per cápita y series temporales">
            <p>
              Toda métrica delictiva se reporta también por 100,000
              habitantes. La población base proviene del Censo INEGI 2020 con
              proyección anual de CONAPO 2020-2070. Sin esta normalización,
              cualquier comparación entre estados es engañosa.
            </p>
          </Block>

          <Block n="04" title="Ley de Benford y MAD de Nigrini">
            <p>
              Para cada dependencia/estado tomamos los montos contractuales,
              extraemos el primer dígito significativo, y comparamos la
              distribución observada con la esperada por Benford:
            </p>
            <pre className="bg-cloud-whisper/5 rounded-card p-4 mt-4 text-[12px] text-cloud-whisper">
{`P(d) = log₁₀(1 + 1/d)
MAD = (1/9) · Σ |observado(d) − esperado(d)|`}
            </pre>
            <p className="mt-4">
              Umbrales de interpretación de Nigrini para el primer dígito:
            </p>
            <ul className="space-y-1 mt-2 list-disc pl-5">
              <li><Badge variant="good">&lt; 0.006</Badge> Conformidad cercana</li>
              <li><Badge variant="good">0.006 – 0.012</Badge> Conformidad aceptable</li>
              <li><Badge variant="warn">0.012 – 0.015</Badge> Conformidad marginal</li>
              <li><Badge variant="alert">&gt; 0.015</Badge> No conformidad</li>
            </ul>
            <p className="mt-4">
              <strong className="text-cloud-whisper">No conformidad ≠ fraude.</strong> Es señal
              estadística para escalar la revisión. Cuando un dataset es muy
              chico (&lt;300 obs.), tiene rango limitado, o usa
              identificadores asignados, Benford no aplica y lo decimos.
            </p>
          </Block>

          <Block n="05" title="Riesgo compuesto por dependencia">
            <p>
              <strong className="text-cloud-whisper">Dos thresholds distintos</strong>{" "}
              operan sobre las dependencias:{" "}
              <code className="text-cloud-whisper bg-cloud-whisper/8 px-1.5 py-0.5 rounded">
                ≥30 contratos
              </code>{" "}
              para entrar al ranking (filtro de relevancia) y{" "}
              <code className="text-cloud-whisper bg-cloud-whisper/8 px-1.5 py-0.5 rounded">
                ≥300 contratos
              </code>{" "}
              para que el cálculo de Benford sea estadísticamente válido. Las
              dependencias entre 30 y 300 aparecen en la tabla pero su MAD se
              marca como{" "}
              <Badge variant="lozenge">n/d</Badge>.
            </p>
            <p className="mt-4">
              El score combina dos componentes ponderados y se re-escala al
              máximo nacional para que el universo (~200 dependencias federales
              con ≥30 contratos) ocupe todo el rango 0-100:
            </p>
            <pre className="bg-cloud-whisper/5 rounded-card p-4 mt-4 text-[12px] text-cloud-whisper">
{`raw  = adj_directa_pct × 0.6 + benford_mad × 1500
score = (raw / max_nacional) × 100`}
            </pre>
            <p className="mt-4">
              Cuando dos dependencias empatan, desempata el MAD descendente —
              criterio forense (mayor desviación Benford pesa más). Es un{" "}
              <em>indicador, no un veredicto</em>. La metodología completa
              está en el repositorio público.
            </p>
          </Block>

          <Block n="06" title="Qué NO hacemos">
            <ul className="list-disc pl-5 space-y-2">
              <li>No imputamos motivaciones a funcionarios.</li>
              <li>No declaramos delitos donde solo hay anomalías estadísticas.</li>
              <li>No publicamos ranking de &ldquo;estados más corruptos&rdquo; — eso requiere prueba legal.</li>
              <li>No mezclamos métricas con escalas distintas sin advertirlo.</li>
            </ul>
          </Block>
        </div>
      </section>
    </div>
  );
}

function Block({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-cloud-whisper/10 pt-8">
      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-[12px] tabular text-ash-accent">{n}</span>
        <h2 className="display text-[28px] md:text-[36px] tracking-tight text-cloud-whisper">
          {title}
        </h2>
      </div>
      <div className="ml-0 md:ml-12">{children}</div>
    </div>
  );
}
