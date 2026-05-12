import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-cloud-whisper/8 mt-24">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px]">
        <div className="col-span-2 md:col-span-1">
          <div className="display text-[20px] mb-3">México Bajo Lupa</div>
          <p className="text-ash-accent leading-relaxed text-[12px] max-w-xs">
            Auditoría ciudadana de México. Datos abiertos cruzados con
            estadística crítica.
          </p>
        </div>

        <div>
          <div className="eyebrow mb-4">Producto</div>
          <ul className="space-y-2.5">
            <li>
              <Link href="/mapa" className="text-light-ash hover:text-cloud-whisper">
                Mapa interactivo
              </Link>
            </li>
            <li>
              <Link href="/anomalias" className="text-light-ash hover:text-cloud-whisper">
                Anomalías Benford
              </Link>
            </li>
            <li>
              <Link href="/efos" className="text-light-ash hover:text-cloud-whisper">
                EFOS · SAT × ComprasMX
              </Link>
            </li>
            <li>
              <Link href="/historico" className="text-light-ash hover:text-cloud-whisper">
                Histórico CompraNet
              </Link>
            </li>
            <li>
              <Link href="/metodologia" className="text-light-ash hover:text-cloud-whisper">
                Metodología
              </Link>
            </li>
            <li>
              <Link href="/transparencia" className="text-ash-accent hover:text-cloud-whisper">
                Transparencia
                <span className="text-[10px] ml-1">V5</span>
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <Link
            href="/fuentes"
            className="eyebrow mb-4 inline-block hover:text-cloud-whisper transition-colors"
          >
            Fuentes →
          </Link>
          <ul className="space-y-2.5 text-light-ash">
            <li>SESNSP · Incidencia delictiva</li>
            <li>CONAPO · Proyecciones de población</li>
            <li>ComprasMX · Contratos federales</li>
            <li>SAT · Listado 69-B (EFOS)</li>
            <li>INEGI · PIB estatal</li>
            <li>CONEVAL · Pobreza</li>
            <li>SHCP · Gasto federalizado</li>
            <li className="text-ash-accent">
              <Link
                href="/transparencia"
                className="hover:text-cloud-whisper"
              >
                INAI · IMCO
                <span className="text-[10px] ml-1">V5</span>
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-4">Acerca</div>
          <ul className="space-y-2.5 text-light-ash">
            <li>Proyecto independiente</li>
            <li>
              <Link
                href="/metodologia"
                className="hover:text-cloud-whisper underline decoration-1 underline-offset-4"
              >
                Metodología pública
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/ari-fco/mexico-bajo-lupa"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cloud-whisper underline decoration-1 underline-offset-4"
              >
                Código en GitHub →
              </a>
            </li>
            <li>Sin afiliación gubernamental</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cloud-whisper/5">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] text-ash-accent">
          <div>
            © {new Date().getFullYear()} México Bajo Lupa. Datos derivados de
            fuentes oficiales mexicanas.
          </div>
          <div className="flex items-center gap-4">
            <span>v0.1.0 — MVP</span>
            <span className="hidden md:inline">·</span>
            <span>Construido con Next.js, MapLibre y Recharts</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
