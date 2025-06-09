"use strict";
//backend/src/controllers/authController.ts
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
exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Restaurando os usuários hardcoded
const users = [
    { username: "admin1", password: bcryptjs_1.default.hashSync("senha123", 10) },
    { username: "admin2", password: bcryptjs_1.default.hashSync("outrasenha456", 10) },
];
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);
    if (!user || !bcryptjs_1.default.compareSync(password, user.password)) {
        res.status(401).json({ error: "Credenciais inválidas" });
        return;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET não definido no .env");
        res
            .status(500)
            .json({ error: "Erro interno: Chave secreta não configurada" });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ username }, secret, { expiresIn: "11m" });
    console.log("Token gerado:", token);
    res.json({ token });
});
exports.login = login;
