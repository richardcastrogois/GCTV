import { PrismaClient } from "@prisma/client";

// Este é o padrão de projeto "Singleton". Ele garante que, em todo o seu projeto,
// exista apenas UMA ÚNICA instância do PrismaClient.
// Isso é crucial para a performance e para evitar que o banco de dados
// seja sobrecarregado com muitas conexões, especialmente em ambientes
// de desenvolvimento com reinicialização automática (nodemon) e em produção (Vercel).

declare global {
  // Permite a declaração de uma variável global 'prisma' no escopo do Node.js
  var prisma: PrismaClient | undefined;
}

// Se a instância global 'prisma' já existe, nós a reutilizamos.
// Se não, nós criamos uma nova instância.
const prisma =
  global.prisma ||
  new PrismaClient({
    // Mantemos os logs de query para ajudar na depuração, mas removemos os de 'info' e 'warn' que são menos úteis.
    log: ["query", "error"],
  });

// Em ambiente de desenvolvimento, salvamos a instância na variável global.
// Isso garante que, quando o nodemon reinicia o servidor, a mesma instância seja reutilizada.
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Exportamos a instância única para ser usada em todo o resto da aplicação.
export default prisma;
