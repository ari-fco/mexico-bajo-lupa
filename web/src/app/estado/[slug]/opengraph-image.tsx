import { ImageResponse } from "next/og";
import { ESTADOS_BY_SLUG, ESTADOS, slugForEstado } from "@/lib/estados";
import { qEstadoMetrics } from "@/lib/queries";
import { fmtDec, fmtCompact } from "@/lib/format";

export const alt = "México Bajo Lupa — Dossier por estado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return ESTADOS.map((e) => ({ slug: slugForEstado(e) }));
}

export default async function OG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = ESTADOS_BY_SLUG[slug];
  if (!e) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#000000",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            fontSize: 32,
          }}
        >
          Estado no encontrado
        </div>
      ),
      { ...size },
    );
  }

  const metrics = qEstadoMetrics();
  const m = metrics.find((x) => x.cve_ent === e.cve);

  const homicidios100k = m?.homicidios_100k_ult12m ?? 0;
  const yoy = m?.cambio_yoy ?? 0;
  const pibPc = m?.pib_per_capita ?? null;
  const pobreza = m?.pobreza_pct ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          padding: "72px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "18px",
            color: "#999999",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "9999px",
              background: "#ffffff",
            }}
          />
          <div style={{ display: "flex" }}>México Bajo Lupa · Dossier</div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: "#999999",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
              marginBottom: "12px",
              display: "flex",
            }}
          >
            {`${e.abrev} · CVE_ENT ${e.cve}`}
          </div>
          <div
            style={{
              fontSize: e.nombre.length > 18 ? "84px" : "108px",
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              fontWeight: 500,
            }}
          >
            {e.nombre}
          </div>

          <div
            style={{
              marginTop: "44px",
              display: "flex",
              gap: "48px",
              fontFamily: "sans-serif",
            }}
          >
            <Stat
              label="Hom. / 100k"
              value={fmtDec(homicidios100k)}
              tone={
                homicidios100k > 30
                  ? "alert"
                  : homicidios100k > 15
                    ? "warn"
                    : "ok"
              }
            />
            <Stat
              label="Δ YoY"
              value={`${yoy > 0 ? "+" : ""}${fmtDec(yoy)}%`}
              tone={yoy > 5 ? "alert" : yoy < -5 ? "ok" : "neutral"}
            />
            {pibPc !== null && (
              <Stat
                label="PIB / cápita"
                value={fmtCompact(pibPc) + " MXN"}
                tone="neutral"
              />
            )}
            {pobreza !== null && (
              <Stat
                label="Pobreza"
                value={`${fmtDec(pobreza)}%`}
                tone={pobreza > 50 ? "alert" : "neutral"}
              />
            )}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "72px",
            right: "72px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "14px",
            color: "#666666",
            fontFamily: "sans-serif",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "16px",
          }}
        >
          <div style={{ display: "flex" }}>
            SESNSP · INEGI · CONEVAL · SHCP · ComprasMX
          </div>
          <div style={{ display: "flex" }}>mexico-bajo-lupa.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "neutral" | "warn" | "alert";
}) {
  const color =
    tone === "alert"
      ? "#d8443a"
      : tone === "warn"
        ? "#e8d49e"
        : tone === "ok"
          ? "#b8e0c2"
          : "#cccccc";
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: "12px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#999999",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "40px",
          color,
          fontFamily: "serif",
          letterSpacing: "-0.02em",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}
