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
import session from "express-session";
import { PrismaClient } from "@prisma/client"; // Importar PrismaClient

// Estendendo o tipo Session para incluir inactivityTimeout (opcional, mas mantido para consistência)
declare module "express-session" {
  interface Session {
    inactivityTimeout?: NodeJS.Timeout; // Mantido como comentário, pois não será usado diretamente
  }
}

// Mapa global para rastrear timeouts por ID de sessão
const sessionTimeouts = new Map<string, NodeJS.Timeout>();

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
  log: ["query", "error", "info", "warn"], // Para depuração
});

// Middleware para liberar conexões após cada requisição (opcional, mas recomendado)
prisma.$use(async (params, next) => {
  const result = await next(params);
  await prisma.$disconnect(); // Libera a conexão após cada operação
  return result;
});

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de sessão
app.use(
  session({
    secret: process.env.JWT_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }, // Requer HTTPS
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Global] Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/test", (req: Request, res: Response) => {
  console.log("[Test] Rota /test acessada diretamente no server.ts");
  res.json({ message: "Rota /test funcionando!" });
});

function setupRoutes(app: Express) {
  console.log("Registrando rotas...");
  if (!app._router) {
    app.use((req: Request, res: Response, next: NextFunction) => next());
  }
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

// Middleware de inatividade ajustado
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.sessionID) {
    // Limpar timeout existente
    if (sessionTimeouts.has(req.sessionID)) {
      clearTimeout(sessionTimeouts.get(req.sessionID)!);
      sessionTimeouts.delete(req.sessionID);
    }

    // Configurar novo timeout
    const timeout = setTimeout(() => {
      req.session.destroy((err) => {
        if (err) console.error("Erro ao destruir sessão:", err);
        else
          console.log(
            `Usuário deslogado por inatividade de 1 hora (ID: ${req.sessionID})`
          );
        sessionTimeouts.delete(req.sessionID);
      });
    }, 60 * 60 * 1000); // 1 hora em milissegundos

    sessionTimeouts.set(req.sessionID, timeout);

    // Limpar timeout quando a resposta for finalizada
    res.on("finish", () => {
      if (sessionTimeouts.has(req.sessionID)) {
        clearTimeout(sessionTimeouts.get(req.sessionID)!);
        sessionTimeouts.delete(req.sessionID);
      }
    });
  }
  next();
});

const PORT = process.env.PORT || 3001;
const httpsOptions = {
  key: fs.readFileSync("cert.key"),
  cert: fs.readFileSync("cert.pem"),
};
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
});

// Fechar Prisma ao encerrar o servidor
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
