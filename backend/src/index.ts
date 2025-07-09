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

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["query", "error", "info", "warn"],
});

const corsOptions = {
  origin: "https://platinum-tv.vercel.app",
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

// ... (todo o seu código de cache de imagem permanece igual) ...
interface CachedImage {
  data: Buffer;
  contentType: string;
  timestamp: number;
}
const imageCache = new Map<string, CachedImage>();
// etc...

// Endpoint de proxy para imagens do TMDB com cache
app.get("/proxy-image", async (req: Request, res: Response) => {
  // O código desta rota está correto e não precisa de alterações.
  // A chamada do frontend é que precisa ser ajustada.
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "URL da imagem é requerida" });
    }
    if (imageCache.has(url)) {
      const cachedImage = imageCache.get(url)!;
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

// =================================================================
// INÍCIO DA CORREÇÃO DE ROTEAMENTO
// =================================================================

function setupRoutes(app: Express) {
  console.log("Registrando rotas sem o prefixo /api...");
  // REMOVEMOS O /api DE TODAS AS ROTAS AQUI
  app.use("/clients", clientRoutes);
  app.use("/auth", authRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/current-month", currentMonthRoutes);
  app.get("/expired-clients", authMiddleware, getExpiredClients);
  console.log("Rotas registradas com sucesso.");
}

// =================================================================
// FIM DA CORREÇÃO DE ROTEAMENTO
// =================================================================

setupRoutes(app);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Erro: JWT_SECRET não está definido no arquivo .env");
  process.exit(1);
}

// ... (resto do seu código, if (process.env.NODE_ENV !== "production") etc...)

// Exporta o 'app' para que a Vercel possa usá-lo como uma Serverless Function.
export default app;
