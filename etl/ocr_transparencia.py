"""OCR sobre IMCO BIPE/IEEG — INTENTO FALLIDO / NO INTEGRABLE.

Estado al 2026-05-08: BLOQUEADO POR FALTA DE BINARIOS DEL SISTEMA.

Este archivo documenta el intento de extraer scores de transparencia
presupuestal por entidad federativa via OCR sobre los PDFs de IMCO BIPE 2023
y IEEG 2024 — la última opción evaluada antes de cerrar la métrica de
transparencia como ROADMAP V3.

================================================================================
RESUMEN EJECUTIVO
================================================================================

Conclusión: NO se generó parquet. NO se integra al frontend. La métrica de
transparencia permanece en `ROADMAP_METRICS` con etiqueta "Próximamente",
exactamente como la dejó `imco_transparencia.py`.

Razón del bloqueo: Tesseract OCR y Poppler son binarios externos del sistema
(no son paquetes pip). Su instalación en Windows requiere privilegios de
administrador (winget falla con "no installer applicable" en scope user;
chocolatey falla con UnauthorizedAccessException en C:\\ProgramData). En el
entorno actual del proyecto no hay forma autónoma de instalarlos.

Sin Tesseract y Poppler, `pytesseract` y `pdf2image` no pueden ejecutarse
aunque estén instalados via pip — son simplemente wrappers de Python sobre
los binarios nativos.

================================================================================
INTENTOS REALIZADOS (2026-05-08)
================================================================================

1) Verificación de binarios disponibles
   - `tesseract --version`            → command not found
   - `where tesseract` (Windows)      → no encontrado en PATH
   - `pdftoppm`, `pdfinfo` (poppler)  → no encontrados
   - Rutas comunes inspeccionadas: C:/Program Files/Tesseract-OCR/,
     C:/Program Files (x86)/Tesseract-OCR/,
     C:/Users/AriFr/AppData/Local/Programs/Tesseract-OCR/  → ninguna existe.

2) Intento de instalación sin elevación
   - winget install UB-Mannheim.TesseractOCR --scope user
        → "No se ha encontrado ningún instalador aplicable" (el paquete
        UB-Mannheim solo provee instalador machine-scope).
   - choco install tesseract -y
        → System.UnauthorizedAccessException sobre
        C:\\ProgramData\\chocolatey\\lib-bad. Choco está instalado pero la
        sesión actual no es admin.
   - No se intentó descargar tesseract.exe portable manualmente porque:
        a) requiere también poppler-windows portable (separado),
        b) requiere desempaquetar zip externo y agregar al PATH del proceso,
        c) excede el alcance "15-20 min" del setup OCR planeado.

3) PDFs objetivo (no descargados — el bloqueo es upstream del OCR)
   - https://imco.org.mx/wp-content/uploads/2023/07/BIPE-2023_Boletas-Estatales_20230725.pdf
   - https://imco.org.mx/wp-content/uploads/2024/06/DOCUMENTO_IEEG_2024_18Jun24.pdf
   Confirmado por agente anterior: ambos son PDFs sin capa de texto
   (pypdf devuelve "" para todas las páginas). Son la entrada típica para
   un pipeline OCR — pero sin el motor OCR no hay nada que ejecutar.

================================================================================
PIPELINE QUE HABRÍA EJECUTADO (referencia para futura integración)
================================================================================

Si Tesseract + Poppler estuvieran disponibles, el flujo sería:

    from pdf2image import convert_from_path     # requiere poppler
    import pytesseract                          # requiere tesseract
    import re, pandas as pd
    from etl.common import to_cve_ent

    PDF = "data/raw/imco_bipe_2023.pdf"
    images = convert_from_path(PDF, dpi=300)    # 32 páginas, una por estado

    rows = []
    for i, img in enumerate(images, start=1):
        text = pytesseract.image_to_string(img, lang="spa")
        # Cada boleta tiene estructura: encabezado con nombre del estado
        # y un valor "Calificación: XX.X" (formato observado en BIPE 2023).
        m_estado = re.search(r"^([A-ZÁÉÍÓÚÑ ]{4,40})$", text, re.MULTILINE)
        m_score  = re.search(
            r"Calificacio?n[:\\s]+(\\d{1,3}(?:\\.\\d{1,2})?)",
            text, re.IGNORECASE,
        )
        if m_estado and m_score:
            rows.append({
                "estado": m_estado.group(1).strip().title(),
                "transparencia_score": float(m_score.group(1)),
                "ano": 2023,
                "fuente": "IMCO BIPE 2023",
                "confidence": "ocr",
            })

    df = pd.DataFrame(rows)
    df["cve_ent"] = df["estado"].map(to_cve_ent)

    # VALIDACIÓN OBLIGATORIA antes de escribir parquet:
    # - 32 filas exactas (una por entidad)
    # - cve_ent sin nulls
    # - Guerrero    ∈ [65, 68]   (esperado 66.4)
    # - Sonora      ∈ [75, 78]   (esperado 76.7)
    # - Michoacán   ∈ [77, 80]   (esperado 78.5)
    # - >= 10 entidades con score == 100   (esperado 12)
    # Si CUALQUIER chequeo falla → NO escribir parquet, dejar el script
    # como "intento OCR ruidoso", investigar parámetros (dpi, lang, psm).

    df.to_parquet("data/processed/transparencia_estatal.parquet", index=False)

================================================================================
INSTRUCCIONES PARA HABILITAR ESTE SCRIPT EN EL FUTURO
================================================================================

Pre-requisitos del sistema (instalar UNA vez, fuera del repo):

  Windows (con permisos de admin):
    winget install --id UB-Mannheim.TesseractOCR
    winget install --id oschwartz10612.Poppler            # o equivalente
    # Asegurar que tesseract.exe y pdftoppm.exe quedan en PATH.
    # Para español: verificar que `tessdata\\spa.traineddata` esté instalado.

  Linux / CI:
    apt-get install -y tesseract-ocr tesseract-ocr-spa poppler-utils

  Python (vía pip, ya scripteable):
    python -m pip install pdf2image pytesseract

Una vez con los binarios disponibles:
  1) Validar `tesseract --version` y `pdftoppm -v` desde la shell del proyecto.
  2) Reescribir este archivo siguiendo el pipeline de la sección anterior.
  3) Validación crítica antes de persistir parquet (ver chequeos arriba).
  4) Si la validación pasa, coordinar con el agente de `build_metrics.py` y
     `export_json.py` para integrar la nueva columna `transparencia_score`.
  5) Recién ahí mover la métrica de ROADMAP_METRICS a METRICS en el frontend
     (mapa-explorer, queries, mock-data) — fuera del alcance de este script.

================================================================================
RECOMENDACIÓN
================================================================================

NO INTEGRAR. Mantener la métrica de transparencia en roadmap V3 hasta que:
  (a) IMCO o el sucesor del INAI publique un Excel/CSV/JSON estructurado, o
  (b) el entorno del proyecto incluya Tesseract+Poppler instalados a nivel
      sistema (lo cual debe documentarse en README/setup, no asumirse).

La opción (a) es claramente superior. Un score OCR de un PDF de 32 páginas
sin validación humana introduce un riesgo de error silencioso (estados mal
identificados, scores con OCR-noise como 768 en lugar de 76.8) que invalida
la confianza del dashboard.

Honestidad > completitud: mejor V3 con transparencia faltante que V3 con
transparencia ruidosa.
"""

from __future__ import annotations

import shutil
import sys


REASON = (
    "Tesseract OCR y Poppler no están instalados en el sistema y su "
    "instalación requiere privilegios de administrador no disponibles en "
    "el entorno actual. Sin esos binarios, pdf2image y pytesseract no "
    "pueden ejecutarse. Ver docstring del archivo para detalle completo."
)


def _check_binaries() -> tuple[bool, list[str]]:
    """Devuelve (todos_disponibles, faltantes)."""
    needed = ["tesseract", "pdftoppm"]
    missing = [b for b in needed if shutil.which(b) is None]
    return (len(missing) == 0, missing)


def main() -> None:
    print("[ocr_transparencia] SKIPPED — intento OCR no integrable.")
    ok, missing = _check_binaries()
    if not ok:
        print(
            f"[ocr_transparencia] Binarios faltantes en PATH: {', '.join(missing)}"
        )
    print(f"[ocr_transparencia] Razón: {REASON}")
    print(
        "[ocr_transparencia] Ver docstring del archivo "
        "(etl/ocr_transparencia.py) para instrucciones de habilitación."
    )
    # Exit 0: no es un error de pipeline, es un stub documentado de un
    # intento honesto que no llega a integrarse.
    sys.exit(0)


if __name__ == "__main__":
    main()
