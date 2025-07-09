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

// Configurar Prisma Client (sem fallback local)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Obrigatório, configurado na Vercel
    },
  },
  log: ["query", "error", "info", "warn"],
});

// =================================================================
// INÍCIO DA CORREÇÃO FINAL DE CORS
// =================================================================

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

app.use(cors(corsOptions)); // Apenas esta linha para o CORS

// =================================================================
// FIM DA CORREÇÃO FINAL DE CORS
// =================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache com expiração de 1 semana (604800 segundos)
interface CachedImage {
  data: Buffer;
  contentType: string;
  timestamp: number;
}

const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_EXPIRY = 604800000; // 1 semana em milissegundos
const CLEANUP_INTERVAL = 3600000; // 1 hora em milissegundos

const imageCache = new Map<string, CachedImage>();

// Carregar cache do disco ao iniciar (opcional, desativado em produção)
function loadCacheFromDisk() {
  if (process.env.NODE_ENV !== "production" && fs.existsSync(CACHE_DIR)) {
    try {
      const rawData = fs.readFileSync(
        path.join(CACHE_DIR, "image_cache.json"),
        "utf-8"
      );
      const cachedData: [string, any][] = JSON.parse(rawData) || [];
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
        "Cache carregado localmente com",
        imageCache.size,
        "itens válidos."
      );
    } catch (error) {
      console.error("Erro ao carregar cache local, ignorando:", error);
    }
  }
}

loadCacheFromDisk();

// Remover saveCacheToDisk (não mais usado)
function saveCacheToDisk() {
  // Função vazia ou removida, pois não salva em disco em produção
}

// Limpeza automática a cada hora (sem salvamento em disco)
setInterval(() => {
  const beforeSize = imageCache.size;
  for (const [url, item] of imageCache) {
    if (Date.now() - item.timestamp >= CACHE_EXPIRY) {
      imageCache.delete(url);
    }
  }
  if (imageCache.size !== beforeSize) {
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
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
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
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    console.error("Erro ao proxyar imagem:", error);
    res.status(500).json({ error: "Erro ao carregar a imagem" });
  }
});

function setupRoutes(app: Express) {
  console.log("Registrando rotas sem o prefixo /api...");
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
console.log("JWT_SECRET carregado:", JWT_SECRET);

const PORT = process.env.PORT || 3001;

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
export default app;
