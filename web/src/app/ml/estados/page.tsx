import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { qMlEstadosRiesgo } from "@/lib/ml-queries";
import { fmtInt } from "@/lib/format";

function fmtMonto(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M`;
  return `$${fmtInt(n)}`;
}

export const metadata: Metadata = {
  title: "Estados por riesgo · ML",
  description:
    "Índice compuesto por entidad federativa: %AD + HHI proveedores + concentración top + calidad de datos. Tlaxcala lidera con 91% Adjudicación Directa y un solo proveedor que concentra 48% del gasto estatal.",
};

export default function MlEstadosPage() {
  const estados = qMlEstadosRiesgo();

  return (
    <div className="flex flex-col">
      <section className="border-b border-cloud-whisper/8 py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Link href="/ml" className="text-[13px] text-ash-accent hover:text-cloud-whisper">
            ← ML investigación
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <Badge variant="lozenge">32 entidades</Badge>
            <Badge variant="lozenge">Índice compuesto</Badge>
          </div>
          <h1 className="display-xl leading-[0.95] tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Estados por riesgo
          </h1>
          <p className="text-light-ash text-[15px] mt-4 max-w-3xl leading-relaxed">
            Combina <strong className="text-cloud-whisper">%AD</strong>, HHI de proveedores, concentración en
            top-1, monopolio institucional y calidad de datos. Normaliza cada componente y los pondera por
            relevancia. <strong className="text-cloud-whisper">Tlaxcala</strong> obtiene el índice máximo (1.000)
            con 91% Adjudicación Directa y un único proveedor que concentra 48% del gasto estatal.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-[13px] min-w-[1000px]">
              <thead className="border-b border-cloud-whisper/15 text-light-ash">
                <tr>
                  <th className="text-left py-3 pr-3">Estado</th>
                  <th className="text-right py-3 pr-3">Riesgo</th>
                  <th className="text-right py-3 pr-3">%AD</th>
                  <th className="text-right py-3 pr-3">HHI prov.</th>
                  <th className="text-right py-3 pr-3">Top share</th>
                  <th className="text-right py-3 pr-3">Datos null</th>
                  <th className="text-right py-3 pr-3">Contratos</th>
                  <th className="text-right py-3 pr-3">Monto</th>
                  <th className="text-left py-3">Top proveedor</th>
                </tr>
              </thead>
              <tbody className="text-cloud-whisper">
                {estados.map((e) => {
                  const ihTier =
                    e.indice_riesgo >= 0.5 ? "border-l-2 border-ash-accent" : "";
                  return (
                    <tr
                      key={e.cve_ent}
                      className={`border-b border-cloud-whisper/8 hover:bg-cloud-whisper/[0.03] ${ihTier}`}
                    >
                      <td className="py-3 pr-3 max-w-[180px] truncate" title={e.estado}>
                        {e.estado}
                      </td>
                      <td className="py-3 pr-3 text-right tabular">
                        {e.indice_riesgo.toFixed(3)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular">
                        {(e.pct_AD * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 pr-3 text-right tabular">
                        {e.hhi_proveedores.toFixed(3)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular">
                        {(e.top_proveedor_share * 100).toFixed(0)}%
                      </td>
                      <td
                        className={`py-3 pr-3 text-right tabular ${
                          e.pct_fecha_null >= 0.99 ? "text-ash-accent" : ""
                        }`}
                      >
                        {(e.pct_fecha_null * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 pr-3 text-right tabular text-light-ash">
                        {fmtInt(e.n_contratos)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular">
                        {fmtMonto(e.monto_total_mxn)}
                      </td>
                      <td
                        className="py-3 max-w-[200px] truncate text-light-ash text-[12px]"
                        title={e.top_proveedor_nombre ?? ""}
                      >
                        {e.top_proveedor_nombre}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-cloud-whisper/8 py-8">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="eyebrow mb-3">Hallazgo crítico de datos</div>
          <p className="text-[14px] text-light-ash leading-relaxed max-w-3xl">
            <strong className="text-cloud-whisper">9 estados tienen 100% de fechas null</strong> en
            contratos estatales (Tlaxcala, Colima, Guerrero, Quintana Roo, Chihuahua, Baja California,
            Sonora, Nuevo León, Coahuila). No es error aleatorio — es un patrón sistémico de
            transparencia incompleta que merece auditoría.
          </p>
          <p className="text-[14px] text-light-ash leading-relaxed mt-4 max-w-3xl">
            <strong className="text-cloud-whisper">BIODIST S.A. DE C.V.</strong> opera como top
            proveedor en dos estados simultáneamente (CDMX 19%, Veracruz 12%). Cross-state.
          </p>
        </div>
      </section>
    </div>
  );
}
