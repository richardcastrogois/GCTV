// backend/src/controllers/authController.ts

import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response, RequestHandler } from "express";
import prisma from "../lib/prisma"; // <-- MUDANÇA 1: Importamos o Prisma

// A variável 'authUsers' foi removida, pois não será mais usada.

// Otimização: Centraliza a lógica de busca do segredo JWT para evitar repetição.
function getJwtSecrets() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  const refreshSecret = secret + "_refresh";
  return { secret, refreshSecret };
}

export const login: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, password } = req.body;

    // ===================================================================================
    // MUDANÇA 2: Lógica de autenticação agora busca o usuário no BANCO DE DADOS.
    // ===================================================================================
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Validação de segurança aprimorada
    // Usamos 'await bcrypt.compare' que é a versão assíncrona, ideal para funções async.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const { secret, refreshSecret } = getJwtSecrets();

    const accessToken = jwt.sign({ userId: user.id, username }, secret, {
      expiresIn: "15m",
    } as SignOptions);

    const refreshToken = jwt.sign(
      { userId: user.id, username },
      refreshSecret,
      {
        expiresIn: "7d",
      } as SignOptions
    );

    res.json({ accessToken, refreshToken, userId: user.id });
  } catch (error) {
    console.error("Erro no processo de login:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const refreshToken: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token é obrigatório" });
      return;
    }

    const { secret, refreshSecret } = getJwtSecrets();

    const decoded = jwt.verify(refreshToken, refreshSecret) as {
      userId: number;
      username: string;
    };

    // ===================================================================================
    // MUDANÇA 3: A validação do refresh token também verifica no BANCO DE DADOS.
    // ===================================================================================
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.username !== decoded.username) {
      res.status(403).json({ error: "Refresh token inválido" });
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
    console.error("Erro ao renovar token:", error);
    res.status(403).json({ error: "Refresh token inválido ou expirado" });
  }
};
