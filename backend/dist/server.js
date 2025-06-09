"use strict";
//backend/src/server.ts
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
const clientController_1 = require("./controllers/clientController"); // Importando o controlador
const authMiddleware_1 = require("./middleware/authMiddleware"); // Importando o middleware
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`[Global] Recebida requisição: ${req.method} ${req.originalUrl}`);
    next();
});
app.get("/test", (req, res) => {
    console.log("[Test] Rota /test acessada diretamente no server.ts");
    res.json({ message: "Rota /test funcionando!" });
});
function setupRoutes(app) {
    console.log("Registrando rotas...");
    if (!app._router) {
        app.use((req, res, next) => next());
    }
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
