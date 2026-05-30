import type { MetadataRoute } from "next";

type ShareTargetManifest = MetadataRoute.Manifest & {
  share_target: {
    action: string;
    method: "POST";
    enctype: "multipart/form-data";
    params: {
      title: string;
      text: string;
      url: string;
      files: Array<{
        name: string;
        accept: string[];
      }>;
    };
  };
};

export default function manifest(): ShareTargetManifest {
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
        src: "/icons/life-os-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/life-os-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: [
              "image/*",
              "application/pdf",
              "text/plain",
              ".pdf",
              ".txt",
              ".md",
              ".png",
              ".jpg",
              ".jpeg",
              ".webp",
            ],
          },
        ],
      },
    },
  };
}
