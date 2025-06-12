// backend/src/routes/authRoutes.ts

import { Router, Request, Response } from "express";
import { login } from "../controllers/authController";
import jwt, { VerifyErrors } from "jsonwebtoken";

const router: Router = Router();

router.post("/login", login);

// Rota de refresh token
router.post("/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token required" });
    return;
  }

  const refreshSecret = (process.env.JWT_SECRET || "") + "_refresh";
  console.log("Recebido refreshToken:", refreshToken); // Log para depuração
  jwt.verify(
    refreshToken,
    refreshSecret,
    (err: VerifyErrors | null, user: any) => {
      if (err) {
        console.error("Erro na verificação do refreshToken:", err.message);
        res
          .status(403)
          .json({ error: "Invalid refresh token", details: err.message });
        return;
      }
      const accessToken = jwt.sign(
        { username: user.username },
        process.env.JWT_SECRET || "",
        { expiresIn: "15m" }
      );
      res.json({ accessToken });
    }
  );
});

export default router;