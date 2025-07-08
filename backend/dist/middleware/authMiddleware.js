"use strict";
//backend/src/middleware/authMiddleware.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("Cabeçalho Authorization recebido:", authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("Token não fornecido ou formato inválido.");
        res.status(401).json({ error: "Token não fornecido ou formato inválido" });
        return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        console.log("Token ausente após split.");
        res.status(401).json({ error: "Token não fornecido" });
        return;
    }
    try {
        const secret = process.env.JWT_SECRET || "seu-segredo-jwt";
        if (!process.env.JWT_SECRET) {
            console.warn("JWT_SECRET não está definido no .env. Usando valor padrão.");
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        console.log("Token decodificado com sucesso:", decoded);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("Erro ao verificar token:", error);
        res.status(401).json({ error: "Token inválido ou expirado" });
    }
};
exports.authMiddleware = authMiddleware;
