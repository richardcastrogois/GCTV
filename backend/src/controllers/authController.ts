// backend/src/controllers/authController.ts

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
    (u: { username: string; password: string; id: number }) =>
      u.username === username
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

  const accessToken = jwt.sign({ userId: user.id, username }, secret, {
    expiresIn: "15m",
  } as SignOptions);
  const refreshToken = jwt.sign({ userId: user.id, username }, refreshSecret, {
    expiresIn: "7d",
  } as SignOptions);

  res.json({ accessToken, refreshToken, userId: user.id });
};

export const refreshToken: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    const decoded = jwt.verify(refreshToken, refreshSecret) as {
      userId: number;
      username: string;
    };

    const user = authUsers.find(
      (u: { username: string; id: number }) =>
        u.username === decoded.username && u.id === decoded.userId
    );

    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado" });
      return;
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, username: user.username },
      secret,
      {
        expiresIn: "15m",
      } as SignOptions
    );
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ error: "Refresh token inválido ou expirado" });
  }
};
