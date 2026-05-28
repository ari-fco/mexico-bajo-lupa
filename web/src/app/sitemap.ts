import type { MetadataRoute } from "next";
import { ESTADOS, slugForEstado } from "@/lib/estados";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${baseUrl}/mapa`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/anomalias`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${baseUrl}/efos`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml/anomalias`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml/historico`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml/oneshots`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml/estados`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml/efos`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/ml/temporal`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/historico`, lastModified: now, priority: 0.8, changeFrequency: "yearly" },
    { url: `${baseUrl}/compara`, lastModified: now, priority: 0.7, changeFrequency: "monthly" },
    { url: `${baseUrl}/metodologia`, lastModified: now, priority: 0.6, changeFrequency: "yearly" },
    { url: `${baseUrl}/fuentes`, lastModified: now, priority: 0.6, changeFrequency: "monthly" },
    { url: `${baseUrl}/transparencia`, lastModified: now, priority: 0.5, changeFrequency: "yearly" },
  ];

  const estadoRoutes: MetadataRoute.Sitemap = ESTADOS.map((e) => ({
    url: `${baseUrl}/estado/${slugForEstado(e)}`,
    lastModified: now,
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  return [...staticRoutes, ...estadoRoutes];
}
