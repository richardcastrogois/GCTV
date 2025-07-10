// backend/src/index.ts

import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import path from "path";
import axios from "axios";

// Rotas da aplicação
import clientRoutes from "./routes/clientRoutes";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import currentMonthRoutes from "./routes/currentMonthRoutes";
import { getExpiredClients } from "./controllers/clientController";
import { authMiddleware } from "./middleware/authMiddleware";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Configuração do CORS para permitir requisições do frontend local e de produção
const corsOptions = {
  origin: [
    "https://platinum-tv.vercel.app", // Para produção na Vercel
    "http://localhost:3000", // Para desenvolvimento local
  ],
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

// Aplica os middlewares essenciais
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Definição das Rotas da API ---
// Esta função organiza o registro de todas as rotas da sua aplicação.
function setupRoutes(app: Express) {
  // Para teste local, usamos o prefixo /api.
  // Para o deploy na Vercel, este prefixo será removido.
  const apiPrefix = "/api";

  console.log(`Registrando rotas com o prefixo: ${apiPrefix}`);

  app.use(`${apiPrefix}/clients`, clientRoutes);
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
  app.use(`${apiPrefix}/current-month`, currentMonthRoutes);
  app.get(`${apiPrefix}/expired-clients`, authMiddleware, getExpiredClients);

  // A rota do proxy de imagem também faz parte da API.
  app.get(`${apiPrefix}/proxy-image`, async (req: Request, res: Response) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL da imagem é requerida" });
      }
      // Lógica de cache omitida para simplicidade, mas pode ser adicionada aqui.
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

// --- Lógica para Iniciar o Servidor ---
const PORT = process.env.PORT || 3001;

// Este bloco só é executado em ambiente de desenvolvimento local.
if (process.env.NODE_ENV !== "production") {
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, "..", "cert.key")),
      cert: fs.readFileSync(path.join(__dirname, "..", "cert.pem")),
    };
    const server = https.createServer(httpsOptions, app);
    server.listen(PORT, () => {
      console.log(
        `✅ Servidor HTTPS local rodando em https://localhost:${PORT}`
      );
    });
  } catch (e) {
    console.warn(
      "⚠️ Certificados SSL não encontrados, iniciando servidor HTTP para desenvolvimento local."
    );
    app.listen(PORT, () => {
      console.log(`✅ Servidor HTTP local rodando em http://localhost:${PORT}`);
    });
  }
}

// Exporta o 'app' para que a Vercel possa usá-lo como uma Serverless Function.
export default app;
