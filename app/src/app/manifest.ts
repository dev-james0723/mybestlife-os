import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Best Life OS",
    short_name: "Life OS",
    description: "Personal command center for planning, habits, knowledge, and reflection.",
    start_url: "/",
    display: "standalone",
    background_color: "#141210",
    theme_color: "#141210",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
