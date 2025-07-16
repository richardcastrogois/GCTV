import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
// MUDANÇA 1: As importações de 'https' e 'fs' não são mais necessárias.
// import https from "https";
// import fs from "fs";
import path from "path";
import axios from "axios";

// Rotas da aplicação
import clientRoutes from "./routes/clientRoutes";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import { getExpiredClients } from "./controllers/clientController";
import { authMiddleware } from "./middleware/authMiddleware";

dotenv.config();

// A configuração de CORS já está correta, permitindo o localhost.
const corsOptions = {
  origin: ["https://platinum-tv.vercel.app", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Date",
    "X-Api-Version",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function setupRoutes(app: Express) {
  const apiPrefix = "/api";
  console.log(`Registrando rotas com o prefixo: ${apiPrefix}`);

  app.use(`${apiPrefix}/clients`, clientRoutes);
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
  app.get(`${apiPrefix}/expired-clients`, authMiddleware, getExpiredClients);

  app.get(`${apiPrefix}/proxy-image`, async (req: Request, res: Response) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL da imagem é requerida" });
      }
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const contentType = response.headers["content-type"] || "image/jpeg";
      res.set("Content-Type", contentType);
      res.send(response.data);
    } catch (error) {
      console.error("Erro ao proxyar imagem:", error);
      res.status(500).json({ error: "Erro ao carregar a imagem" });
    }
  });
}

setupRoutes(app);

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === "production") {
  // Em produção (na Vercel), apenas exportamos o app. A Vercel gerencia o servidor.
  console.log("Servidor pronto para o ambiente de produção Vercel.");
} else {
  // Em desenvolvimento (local), iniciamos um servidor HTTP simples.
  app.listen(PORT, () => {
    console.log(`✅ Servidor HTTP local rodando em http://localhost:${PORT}`);
  });
}

export default app;
