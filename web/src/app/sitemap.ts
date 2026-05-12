import type { MetadataRoute } from "next";
import { ESTADOS, slugForEstado } from "@/lib/estados";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${baseUrl}/mapa`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/anomalias`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${baseUrl}/efos`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${baseUrl}/historico`, lastModified: now, priority: 0.8, changeFrequency: "yearly" },
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
