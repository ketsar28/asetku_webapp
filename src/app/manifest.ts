import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "AsetKu Corporate", short_name: "AsetKu", description: "Inventaris dan peminjaman aset", start_url: "/", scope: "/", display: "standalone", orientation: "portrait",
    background_color: "#F4F5F2", theme_color: "#14342F", lang: "id",
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
