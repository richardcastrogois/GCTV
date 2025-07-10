// backend/src/middleware/authMiddleware.ts

import jwt from "jsonwebtoken";
import { Request, Response, NextFunction, RequestHandler } from "express";

// Tipagem para o payload do token JWT
interface JwtPayload {
  userId: number;
  username: string;
}

// Estende a interface Request do Express para incluir a propriedade 'user'
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Responde com 401 (Unauthorized) se o token não for fornecido ou estiver no formato errado.
    res.status(401).json({ error: "Token não fornecido ou formato inválido" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    // OTIMIZAÇÃO DE SEGURANÇA: Se o segredo JWT não estiver configurado,
    // o servidor não deve continuar. Lançar um erro é mais seguro do que
    // usar uma chave padrão ou continuar com uma falha silenciosa.
    if (!secret) {
      console.error("FATAL ERROR: JWT_SECRET is not configured.");
      throw new Error("A configuração do servidor está incompleta.");
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded; // Anexa os dados do usuário à requisição
    next(); // Passa para a próxima função (o controller da rota)
  } catch (error) {
    // Se jwt.verify falhar (token expirado, malformado, etc.), ele lança um erro.
    // Respondemos com 403 (Forbidden) que é mais apropriado para token inválido.
    console.error("Erro ao verificar token:", error);
    res.status(403).json({ error: "Token inválido ou expirado" });
  }
};
