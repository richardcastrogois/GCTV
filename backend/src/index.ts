import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import clientRoutes from "./routes/clientRoutes";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import currentMonthRoutes from "./routes/currentMonthRoutes";
import { getExpiredClients } from "./controllers/clientController";
import { authMiddleware } from "./middleware/authMiddleware";
import https from "https";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import path from "path";
import prisma from "./lib/prisma";

dotenv.config();

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
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sua lógica de cache de imagem está aqui, mantida como original
interface CachedImage {
  data: Buffer;
  contentType: string;
  timestamp: number;
}
const imageCache = new Map<string, CachedImage>();

// Endpoint de proxy para imagens do TMDB com cache
// Esta rota está correta. O erro na Vercel é de roteamento, não do código dela.
// A chamada no frontend para /api/proxy-image está certa.
app.get("/proxy-image", async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "URL da imagem é requerida" });
    }
    if (imageCache.has(url)) {
      const cachedImage = imageCache.get(url)!;
      // Adicionando headers de CORS aqui também por segurança
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Content-Type", cachedImage.contentType);
      return res.send(cachedImage.data);
    }
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const contentType = response.headers["content-type"] || "image/jpeg";
    const newItem: CachedImage = {
      data: Buffer.from(response.data),
      contentType,
      timestamp: Date.now(),
    };
    imageCache.set(url, newItem);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    console.error("Erro ao proxyar imagem:", error);
    res.status(500).json({ error: "Erro ao carregar a imagem" });
  }
});

// CORREÇÃO DE ROTEAMENTO PARA VERCEL
function setupRoutes(app: Express) {
  console.log("Registrando rotas COM o prefixo /api para teste local...");
  // ADICIONAMOS DE VOLTA O /api AQUI
  app.use("/clients", clientRoutes);
  app.use("/auth", authRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/current-month", currentMonthRoutes);
  app.get("/expired-clients", authMiddleware, getExpiredClients);
  console.log("Rotas registradas com sucesso.");
}

setupRoutes(app);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Erro: JWT_SECRET não está definido no arquivo .env");
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Lógica para iniciar o servidor (localmente ou na Vercel)
if (process.env.NODE_ENV !== "production") {
  try {
    // CORREÇÃO DO CAMINHO DOS CERTIFICADOS SSL PARA O AMBIENTE LOCAL
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, "..", "cert.key")),
      cert: fs.readFileSync(path.join(__dirname, "..", "cert.pem")),
    };
    const server = https.createServer(httpsOptions, app);
    server.listen(PORT, () => {
      console.log(`Servidor HTTPS local rodando em https://localhost:${PORT}`);
    });
  } catch (e) {
    console.warn(
      "Certificados SSL não encontrados, iniciando servidor HTTP para desenvolvimento local."
    );
    app.listen(PORT, () => {
      console.log(`Servidor HTTP local rodando em http://localhost:${PORT}`);
    });
  }
}

export default app;
