import { ImageResponse } from "next/og";

export const alt = "México Bajo Lupa — Auditoría ciudadana de datos públicos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
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
            fontSize: "20px",
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
          México Bajo Lupa
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
              fontSize: "120px",
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              fontWeight: 500,
            }}
          >
            México,
          </div>
          <div
            style={{
              fontSize: "120px",
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              fontWeight: 500,
              color: "#999999",
            }}
          >
            bajo lupa.
          </div>

          <div
            style={{
              marginTop: "36px",
              fontSize: "24px",
              color: "#cccccc",
              fontFamily: "sans-serif",
              maxWidth: "920px",
              lineHeight: 1.4,
            }}
          >
            Mapa interactivo y análisis forense sobre datos oficiales. Benford,
            adjudicación directa y cruce SAT × ComprasMX por entidad.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "72px",
            right: "72px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "56px",
              lineHeight: 1,
              color: "#d8443a",
              fontWeight: 500,
              fontFamily: "serif",
              letterSpacing: "-0.02em",
            }}
          >
            72.3%
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#999999",
              maxWidth: "320px",
              textAlign: "right",
              lineHeight: 1.4,
              fontFamily: "sans-serif",
            }}
          >
            del gasto federal APF se ejecuta por adjudicación directa
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "72px",
            right: "72px",
            display: "flex",
            gap: "14px",
            fontSize: "14px",
            color: "#666666",
            fontFamily: "sans-serif",
            flexWrap: "wrap",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "16px",
          }}
        >
          <span>SESNSP</span>
          <span>·</span>
          <span>INEGI</span>
          <span>·</span>
          <span>CONEVAL</span>
          <span>·</span>
          <span>SHCP</span>
          <span>·</span>
          <span>CONAPO</span>
          <span>·</span>
          <span>ComprasMX</span>
          <span>·</span>
          <span>SAT 69-B</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
