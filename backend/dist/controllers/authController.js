"use strict";
// backend/src/controllers/authController.ts
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
exports.refreshToken = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Carregar usuários do .env
const authUsers = process.env.AUTH_USERS
    ? JSON.parse(process.env.AUTH_USERS)
    : [];
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const user = authUsers.find((u) => u.username === username);
    if (!user || !bcryptjs_1.default.compareSync(password, user.password)) {
        res.status(401).json({ error: "Credenciais inválidas" });
        return;
    }
    const secret = process.env.JWT_SECRET;
    const refreshSecret = (process.env.JWT_SECRET || "") + "_refresh";
    if (!secret) {
        console.error("JWT_SECRET não definido no .env");
        res
            .status(500)
            .json({ error: "Erro interno: Chave secreta não configurada" });
        return;
    }
    const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, username }, secret, {
        expiresIn: "15m",
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, username }, refreshSecret, {
        expiresIn: "7d",
    });
    res.json({ accessToken, refreshToken, userId: user.id });
});
exports.login = login;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ error: "Refresh token é obrigatório" });
        return;
    }
    const secret = process.env.JWT_SECRET;
    const refreshSecret = (process.env.JWT_SECRET || "") + "_refresh";
    if (!secret) {
        console.error("JWT_SECRET não definido no .env");
        res
            .status(500)
            .json({ error: "Erro interno: Chave secreta não configurada" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
        const user = authUsers.find((u) => u.username === decoded.username && u.id === decoded.userId);
        if (!user) {
            res.status(401).json({ error: "Usuário não encontrado" });
            return;
        }
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, secret, {
            expiresIn: "15m",
        });
        res.json({ accessToken: newAccessToken });
    }
    catch (error) {
        res.status(403).json({ error: "Refresh token inválido ou expirado" });
    }
});
exports.refreshToken = refreshToken;
