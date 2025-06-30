//backend/src/middleware/authMiddleware.ts

import jwt from "jsonwebtoken";
import { Request, Response, NextFunction, RequestHandler } from "express";

interface JwtPayload {
  userId: number;
  username: string;
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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
      console.warn(
        "JWT_SECRET não está definido no .env. Usando valor padrão."
      );
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    console.log("Token decodificado com sucesso:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
};