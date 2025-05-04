import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, RequestHandler } from "express";

const users = [
  { username: "admin1", password: bcrypt.hashSync("senha123", 10) },
  { username: "admin2", password: bcrypt.hashSync("outrasenha456", 10) },
];

export const login: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  // Use o JWT_SECRET do .env
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET não definido no .env");
    res
      .status(500)
      .json({ error: "Erro interno: Chave secreta não configurada" });
    return;
  }

  const token = jwt.sign({ username }, secret, { expiresIn: "2h" });
  console.log("Token gerado:", token);
  res.json({ token });
};
