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

// Comentado temporariamente para teste, pois pode causar atrasos
// prisma.$use(async (params, next) => {
//   const result = await next(params);
//   await prisma.$disconnect();
//   return result;
// });

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const PORT = process.env.PORT || 3001;
const httpsOptions = {
  key: fs.readFileSync("cert.key"),
  cert: fs.readFileSync("cert.pem"),
};
const server = https.createServer(httpsOptions, app);
server.listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
});

// Fechar Prisma e o servidor ao encerrar
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close(() => {
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});