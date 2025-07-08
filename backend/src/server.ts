// backend/src/server.ts

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

// Configurar Prisma Client com pool ajustado
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgresql://localhost:5432/yourdb?schema=public",
    },
  },
  log: ["query", "error", "info", "warn"],
});

const app: Express = express();

// --- INÍCIO DOS AJUSTES PARA DEPLOY ---

// 1. Configuração explícita de CORS para permitir requisições de qualquer origem
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Removido o log de cada requisição para não poluir os logs de produção
// app.use((req: Request, res: Response, next: NextFunction) => {
//   console.log(`[Global] Recebida requisição: ${req.method} ${req.originalUrl}`);
//   next();
// });

// --- FIM DOS AJUSTES PARA DEPLOY ---

// Cache com expiração de 1 semana (604800 segundos)
interface CachedImage {
  data: Buffer;
  contentType: string;
  timestamp: number;
}

const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_FILE = path.join(CACHE_DIR, "image_cache.json");
const CACHE_EXPIRY = 604800000; // 1 semana em milissegundos
const CLEANUP_INTERVAL = 3600000; // 1 hora em milissegundos

const imageCache = new Map<string, CachedImage>();

// Criar diretório de cache se não existir
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// Carregar cache do disco ao iniciar
function loadCacheFromDisk() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const rawData = fs.readFileSync(CACHE_FILE, "utf-8");
      const cachedData: [string, any][] = JSON.parse(rawData) || [];
      if (!Array.isArray(cachedData)) {
        throw new Error("Dados do cache não são um array válido");
      }
      const filteredData: [string, CachedImage][] = cachedData
        .map((item): [string, CachedImage] | null => {
          if (
            item &&
            Array.isArray(item) &&
            item.length === 2 &&
            typeof item[0] === "string" &&
            item[1] &&
            typeof item[1] === "object" &&
            typeof item[1].data === "string"
          ) {
            try {
              return [
                item[0],
                {
                  data: Buffer.from(item[1].data, "base64"),
                  contentType: item[1].contentType || "image/jpeg",
                  timestamp: item[1].timestamp || Date.now(),
                },
              ];
            } catch (e) {
              console.error(
                `Erro ao converter data para Buffer para chave ${item[0]}:`,
                e
              );
              return null;
            }
          }
          return null;
        })
        .filter((item): item is [string, CachedImage] => item !== null);
      imageCache.clear();
      filteredData.forEach(([url, item]) => {
        if (Date.now() - item.timestamp < CACHE_EXPIRY) {
          imageCache.set(url, item);
        }
      });
      console.log(
        "Cache carregado do disco com",
        imageCache.size,
        "itens válidos."
      );
    } catch (error) {
      console.error(
        "Erro ao carregar cache do disco, ignorando arquivo corrompido:",
        error
      );
      try {
        fs.unlinkSync(CACHE_FILE); // Remove o arquivo corrompido
        console.log("Arquivo corrompido removido.");
      } catch (unlinkError) {
        console.error("Erro ao remover arquivo corrompido:", unlinkError);
      }
    }
  } else {
    console.log("Nenhum cache encontrado no disco.");
  }
}

loadCacheFromDisk();

// Salvar cache no disco periodicamente (desativado temporariamente para evitar reinicializações)
function saveCacheToDisk() {
  const validCache = Array.from(imageCache.entries()).filter(
    ([_, item]) => Date.now() - item.timestamp < CACHE_EXPIRY
  );
  console.log(
    "Salvamento em disco desativado para teste. Cache em memória com",
    validCache.length,
    "itens."
  );
}

// Limpeza automática a cada hora
setInterval(() => {
  const beforeSize = imageCache.size;
  for (const [url, item] of imageCache) {
    if (Date.now() - item.timestamp >= CACHE_EXPIRY) {
      imageCache.delete(url);
    }
  }
  if (imageCache.size !== beforeSize) {
    saveCacheToDisk();
    console.log(
      "Cache limpo, removidos",
      beforeSize - imageCache.size,
      "itens expirados."
    );
  }
}, CLEANUP_INTERVAL);

// Endpoint de proxy para imagens do TMDB com cache
app.get("/proxy-image", async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "URL da imagem é requerida" });
    }

    if (imageCache.has(url)) {
      const cachedImage = imageCache.get(url)!;
      if (Date.now() - cachedImage.timestamp < CACHE_EXPIRY) {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Content-Type", cachedImage.contentType);
        return res.send(cachedImage.data);
      } else {
        imageCache.delete(url);
      }
    }

    const response = await axios.get(url, { responseType: "arraybuffer" });
    const contentType = response.headers["content-type"] || "image/jpeg";
    const newItem: CachedImage = {
      data: Buffer.from(response.data),
      contentType,
      timestamp: Date.now(),
    };
    imageCache.set(url, newItem);
    saveCacheToDisk();
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    console.error("Erro ao proxyar imagem:", error);
    res.status(500).json({ error: "Erro ao carregar a imagem" });
  }
});

function setupRoutes(app: Express) {
  console.log("Registrando rotas...");
  app.use("/api/clients", clientRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/current-month", currentMonthRoutes);
  app.get("/api/expired-clients", authMiddleware, getExpiredClients);
  console.log("Rotas registradas com sucesso.");
}

setupRoutes(app);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Erro: JWT_SECRET não está definido no arquivo .env");
  process.exit(1);
}
console.log("JWT_SECRET carregado:", JWT_SECRET);

const PORT = process.env.PORT || 3001;

// --- INÍCIO DO SEGUNDO AJUSTE PARA DEPLOY ---

// Esta parte só vai rodar se não estivermos no ambiente de produção da Vercel
if (process.env.NODE_ENV !== "production") {
  try {
    const httpsOptions = {
      key: fs.readFileSync("cert.key"),
      cert: fs.readFileSync("cert.pem"),
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

// Exporta o 'app' para que a Vercel possa usá-lo como uma Serverless Function.
// Esta é a linha mais importante para o deploy funcionar.
export default app;