//backend/src/controllers/authController.ts

import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response, RequestHandler } from "express";

// Carregar usuários do .env
const authUsers = process.env.AUTH_USERS
  ? JSON.parse(process.env.AUTH_USERS)
  : [];

export const login: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { username, password } = req.body;
  const user = authUsers.find(
    (u: { username: string; password: string }) => u.username === username
  );

  if (!user || !bcrypt.compareSync(password, user.password)) {
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

  const accessToken = jwt.sign({ username }, secret, {
    expiresIn: "15m", // Mantido como 15 minutos para renovação frequente
  } as SignOptions);
  const refreshToken = jwt.sign({ username }, refreshSecret, {
    expiresIn: "7d", // Mantido como 7 dias
  } as SignOptions);
  console.log("Tokens gerados e enviados:", { accessToken, refreshToken });
  res.json({ accessToken, refreshToken });
};