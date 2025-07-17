// app/manifest.ts
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platinum Gestor",
    short_name: "Platinum App",
    description: "Gerenciador de Clientes Platinum",
    start_url: "/",
    display: "standalone",
    background_color: "#000", // Cor de fundo da tela de splash
    theme_color: "#000", // Cor da barra do navegador
    icons: [
      {
        src: "/icon.png", // Caminho para o seu ícone
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
