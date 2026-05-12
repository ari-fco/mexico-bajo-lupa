export type Estado = {
  cve: string;
  nombre: string;
  abrev: string;
  poblacion2020: number;
};

export const ESTADOS: Estado[] = [
  { cve: "01", nombre: "Aguascalientes", abrev: "AGS", poblacion2020: 1425607 },
  { cve: "02", nombre: "Baja California", abrev: "BC", poblacion2020: 3769020 },
  { cve: "03", nombre: "Baja California Sur", abrev: "BCS", poblacion2020: 798447 },
  { cve: "04", nombre: "Campeche", abrev: "CAMP", poblacion2020: 928363 },
  { cve: "05", nombre: "Coahuila de Zaragoza", abrev: "COAH", poblacion2020: 3146771 },
  { cve: "06", nombre: "Colima", abrev: "COL", poblacion2020: 731391 },
  { cve: "07", nombre: "Chiapas", abrev: "CHIS", poblacion2020: 5543828 },
  { cve: "08", nombre: "Chihuahua", abrev: "CHIH", poblacion2020: 3741869 },
  { cve: "09", nombre: "Ciudad de México", abrev: "CDMX", poblacion2020: 9209944 },
  { cve: "10", nombre: "Durango", abrev: "DGO", poblacion2020: 1832650 },
  { cve: "11", nombre: "Guanajuato", abrev: "GTO", poblacion2020: 6166934 },
  { cve: "12", nombre: "Guerrero", abrev: "GRO", poblacion2020: 3540685 },
  { cve: "13", nombre: "Hidalgo", abrev: "HGO", poblacion2020: 3082841 },
  { cve: "14", nombre: "Jalisco", abrev: "JAL", poblacion2020: 8348151 },
  { cve: "15", nombre: "México", abrev: "MEX", poblacion2020: 16992418 },
  { cve: "16", nombre: "Michoacán de Ocampo", abrev: "MICH", poblacion2020: 4748846 },
  { cve: "17", nombre: "Morelos", abrev: "MOR", poblacion2020: 1971520 },
  { cve: "18", nombre: "Nayarit", abrev: "NAY", poblacion2020: 1235456 },
  { cve: "19", nombre: "Nuevo León", abrev: "NL", poblacion2020: 5784442 },
  { cve: "20", nombre: "Oaxaca", abrev: "OAX", poblacion2020: 4132148 },
  { cve: "21", nombre: "Puebla", abrev: "PUE", poblacion2020: 6583278 },
  { cve: "22", nombre: "Querétaro", abrev: "QRO", poblacion2020: 2368467 },
  { cve: "23", nombre: "Quintana Roo", abrev: "QROO", poblacion2020: 1857985 },
  { cve: "24", nombre: "San Luis Potosí", abrev: "SLP", poblacion2020: 2822255 },
  { cve: "25", nombre: "Sinaloa", abrev: "SIN", poblacion2020: 3026943 },
  { cve: "26", nombre: "Sonora", abrev: "SON", poblacion2020: 2944840 },
  { cve: "27", nombre: "Tabasco", abrev: "TAB", poblacion2020: 2402598 },
  { cve: "28", nombre: "Tamaulipas", abrev: "TAMS", poblacion2020: 3527735 },
  { cve: "29", nombre: "Tlaxcala", abrev: "TLAX", poblacion2020: 1342977 },
  { cve: "30", nombre: "Veracruz de Ignacio de la Llave", abrev: "VER", poblacion2020: 8062579 },
  { cve: "31", nombre: "Yucatán", abrev: "YUC", poblacion2020: 2320898 },
  { cve: "32", nombre: "Zacatecas", abrev: "ZAC", poblacion2020: 1622138 },
];

export const ESTADOS_BY_CVE: Record<string, Estado> = Object.fromEntries(
  ESTADOS.map((e) => [e.cve, e]),
);

export const ESTADOS_BY_NUM: Record<number, Estado> = Object.fromEntries(
  ESTADOS.map((e) => [Number(e.cve), e]),
);

// Combining diacritical marks block (U+0300..U+036F). Built with explicit
// Unicode escapes so the regex is robust to copy-paste/encoding accidents
// across editors — the literal version `[̀-ͯ]` looks identical visually but
// some editors silently re-normalize it.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugForEstado(e: Estado): string {
  return e.nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const ESTADOS_BY_SLUG: Record<string, Estado> = Object.fromEntries(
  ESTADOS.map((e) => [slugForEstado(e), e]),
);
