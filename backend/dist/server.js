"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const clientRoutes_1 = __importDefault(require("./routes/clientRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const currentMonthRoutes_1 = __importDefault(require("./routes/currentMonthRoutes"));
const clientController_1 = require("./controllers/clientController");
const authMiddleware_1 = require("./middleware/authMiddleware");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// Configurar Prisma Client com pool ajustado
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL ||
                "postgresql://localhost:5432/yourdb?schema=public",
        },
    },
    log: ["query", "error", "info", "warn"],
});
const app = (0, express_1.default)();
// Middleware para lidar com requisições OPTIONS (preflight)
app.options("*", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.sendStatus(200);
});
// Configuração explícita de CORS para permitir requisições de qualquer origem
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const CACHE_DIR = path_1.default.join(__dirname, "cache");
const CACHE_FILE = path_1.default.join(CACHE_DIR, "image_cache.json");
const CACHE_EXPIRY = 604800000; // 1 semana em milissegundos
const CLEANUP_INTERVAL = 3600000; // 1 hora em milissegundos
const imageCache = new Map();
// Criar diretório de cache se não existir
if (!fs_1.default.existsSync(CACHE_DIR)) {
    fs_1.default.mkdirSync(CACHE_DIR);
}
// Carregar cache do disco ao iniciar
function loadCacheFromDisk() {
    if (fs_1.default.existsSync(CACHE_FILE)) {
        try {
            const rawData = fs_1.default.readFileSync(CACHE_FILE, "utf-8");
            const cachedData = JSON.parse(rawData) || [];
            if (!Array.isArray(cachedData)) {
                throw new Error("Dados do cache não são um array válido");
            }
            const filteredData = cachedData
                .map((item) => {
                if (item &&
                    Array.isArray(item) &&
                    item.length === 2 &&
                    typeof item[0] === "string" &&
                    item[1] &&
                    typeof item[1] === "object" &&
                    typeof item[1].data === "string") {
                    try {
                        return [
                            item[0],
                            {
                                data: Buffer.from(item[1].data, "base64"),
                                contentType: item[1].contentType || "image/jpeg",
                                timestamp: item[1].timestamp || Date.now(),
                            },
                        ];
                    }
                    catch (e) {
                        console.error(`Erro ao converter data para Buffer para chave ${item[0]}:`, e);
                        return null;
                    }
                }
                return null;
            })
                .filter((item) => item !== null);
            imageCache.clear();
            filteredData.forEach(([url, item]) => {
                if (Date.now() - item.timestamp < CACHE_EXPIRY) {
                    imageCache.set(url, item);
                }
            });
            console.log("Cache carregado do disco com", imageCache.size, "itens válidos.");
        }
        catch (error) {
            console.error("Erro ao carregar cache do disco, ignorando arquivo corrompido:", error);
            try {
                fs_1.default.unlinkSync(CACHE_FILE); // Remove o arquivo corrompido
                console.log("Arquivo corrompido removido.");
            }
            catch (unlinkError) {
                console.error("Erro ao remover arquivo corrompido:", unlinkError);
            }
        }
    }
    else {
        console.log("Nenhum cache encontrado no disco.");
    }
}
loadCacheFromDisk();
// Salvar cache no disco periodicamente (desativado temporariamente para evitar reinicializações)
function saveCacheToDisk() {
    const validCache = Array.from(imageCache.entries()).filter(([_, item]) => Date.now() - item.timestamp < CACHE_EXPIRY);
    console.log("Salvamento em disco desativado para teste. Cache em memória com", validCache.length, "itens.");
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
        console.log("Cache limpo, removidos", beforeSize - imageCache.size, "itens expirados.");
    }
}, CLEANUP_INTERVAL);
// Endpoint de proxy para imagens do TMDB com cache
app.get("/proxy-image", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: "URL da imagem é requerida" });
        }
        if (imageCache.has(url)) {
            const cachedImage = imageCache.get(url);
            if (Date.now() - cachedImage.timestamp < CACHE_EXPIRY) {
                res.set("Access-Control-Allow-Origin", "*");
                res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
                res.set("Access-Control-Allow-Headers", "Content-Type");
                res.set("Content-Type", cachedImage.contentType);
                return res.send(cachedImage.data);
            }
            else {
                imageCache.delete(url);
            }
        }
        const response = yield axios_1.default.get(url, { responseType: "arraybuffer" });
        const contentType = response.headers["content-type"] || "image/jpeg";
        const newItem = {
            data: Buffer.from(response.data),
            contentType,
            timestamp: Date.now(),
        };
        imageCache.set(url, newItem);
        saveCacheToDisk();
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        res.set("Content-Type", contentType);
        res.send(response.data);
    }
    catch (error) {
        console.error("Erro ao proxyar imagem:", error);
        res.status(500).json({ error: "Erro ao carregar a imagem" });
    }
}));
function setupRoutes(app) {
    console.log("Registrando rotas...");
    app.use("/api/clients", clientRoutes_1.default);
    app.use("/api/auth", authRoutes_1.default);
    app.use("/api/dashboard", dashboardRoutes_1.default);
    app.use("/api/current-month", currentMonthRoutes_1.default);
    app.get("/api/expired-clients", authMiddleware_1.authMiddleware, clientController_1.getExpiredClients);
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
            key: fs_1.default.readFileSync("cert.key"),
            cert: fs_1.default.readFileSync("cert.pem"),
        };
        const server = https_1.default.createServer(httpsOptions, app);
        server.listen(PORT, () => {
            console.log(`Servidor HTTPS local rodando em https://localhost:${PORT}`);
        });
    }
    catch (e) {
        console.warn("Certificados SSL não encontrados, iniciando servidor HTTP para desenvolvimento local.");
        app.listen(PORT, () => {
            console.log(`Servidor HTTP local rodando em http://localhost:${PORT}`);
        });
    }
}
// Exporta o 'app' para que a Vercel possa usá-lo como uma Serverless Function.
exports.default = app;
