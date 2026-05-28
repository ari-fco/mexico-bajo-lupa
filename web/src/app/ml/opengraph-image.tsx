import { ImageResponse } from "next/og";

export const alt = "ML — Investigación no supervisada sobre 2.35M contratos federales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function MlOG() {
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
          México Bajo Lupa · ML
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
              fontSize: "108px",
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              fontWeight: 500,
            }}
          >
            Lo que el ojo
          </div>
          <div
            style={{
              fontSize: "108px",
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              fontWeight: 500,
              color: "#d8443a",
            }}
          >
            no detecta.
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
            Cinco técnicas de aprendizaje no supervisado sobre 2.35M
            contratos federales. Isolation Forest, LOF, Benford, clustering,
            continuidad por sexenio.
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
            gap: "20px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                lineHeight: 1,
                color: "#d8443a",
                fontWeight: 500,
                fontFamily: "serif",
                letterSpacing: "-0.02em",
              }}
            >
              106,927
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#999999",
                maxWidth: "260px",
                textAlign: "right",
                lineHeight: 1.4,
                fontFamily: "sans-serif",
              }}
            >
              one-shot wonders detectados (40% del padrón)
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                lineHeight: 1,
                color: "#d8443a",
                fontWeight: 500,
                fontFamily: "serif",
                letterSpacing: "-0.02em",
              }}
            >
              1.53×
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#999999",
                maxWidth: "260px",
                textAlign: "right",
                lineHeight: 1.4,
                fontFamily: "sans-serif",
              }}
            >
              más probable que un one-shot sea EFOS
            </div>
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
          <span>Isolation Forest</span>
          <span>·</span>
          <span>LOF</span>
          <span>·</span>
          <span>Benford</span>
          <span>·</span>
          <span>KMeans</span>
          <span>·</span>
          <span>DBSCAN</span>
          <span>·</span>
          <span>HHI</span>
          <span>·</span>
          <span>TF-IDF</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
