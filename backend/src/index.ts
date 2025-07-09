import express, { Express } from "express";
import cors from "cors";

// A mesma configuração de CORS que já tínhamos
const corsOptions = {
  origin: "https://platinum-tv.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Date",
    "X-Api-Version",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

const app: Express = express();

// Aplica o CORS
app.use(cors(corsOptions));

// Habilita o Express para entender JSON
app.use(express.json());

// Uma rota de login de TESTE que não faz nada, só para existir
app.post("/auth/login", (req, res) => {
  console.log("A rota de login de teste foi atingida com sucesso!");
  res.json({
    message: "Se você está vendo isso, o CORS funcionou!",
    user: req.body,
  });
});

// Uma rota raiz só para podermos visitar a URL e ver se está no ar
app.get("/", (req, res) => {
  res.status(200).send("Servidor de teste 'Olá, Mundo' está no ar!");
});

export default app;
