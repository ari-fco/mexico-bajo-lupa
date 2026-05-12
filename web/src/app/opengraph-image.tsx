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
          padding: "80px",
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
              marginTop: "40px",
              fontSize: "26px",
              color: "#cccccc",
              fontFamily: "sans-serif",
              maxWidth: "850px",
              lineHeight: 1.4,
            }}
          >
            Auditoría ciudadana de datos públicos. Cruza seguridad, economía,
            gasto y compras del gobierno con estadística forense.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "80px",
            right: "80px",
            display: "flex",
            gap: "12px",
            fontSize: "16px",
            color: "#999999",
            fontFamily: "sans-serif",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            maxWidth: "560px",
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
        </div>
      </div>
    ),
    { ...size },
  );
}
