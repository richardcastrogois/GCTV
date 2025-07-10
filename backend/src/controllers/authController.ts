// backend/src/controllers/authController.ts

import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response, RequestHandler } from "express";

// Otimização: Carrega usuários apenas uma vez na inicialização do módulo.
const authUsers = process.env.AUTH_USERS
  ? JSON.parse(process.env.AUTH_USERS)
  : [];

// Otimização: Centraliza a lógica de busca do segredo JWT para evitar repetição.
function getJwtSecrets() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env");
    // Em um cenário real, isso deveria impedir o servidor de iniciar.
    // Lançar um erro aqui é mais seguro do que continuar com uma falha silenciosa.
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

    const user = authUsers.find(
      (u: { username: string; password?: string; id: number }) =>
        u.username === username
    );

    // Validação de segurança aprimorada
    if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const { secret, refreshSecret } = getJwtSecrets();

    const accessToken = jwt.sign({ userId: user.id, username }, secret, {
      expiresIn: "15m",
    } as SignOptions);

    const refreshToken = jwt.sign({ userId: user.id, username }, refreshSecret, {
      expiresIn: "7d",
    } as SignOptions);

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

    const user = authUsers.find(
      (u: { username: string; id: number }) =>
        u.username === decoded.username && u.id === decoded.userId
    );

    if (!user) {
      // Usar 403 (Forbidden) é mais apropriado aqui, pois o token pode ser válido mas não pertence a um usuário atual.
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
    // Se jwt.verify falhar (token expirado ou malformado), ele lança um erro.
    console.error("Erro ao renovar token:", error);
    res.status(403).json({ error: "Refresh token inválido ou expirado" });
  }
};
