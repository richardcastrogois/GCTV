const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SHADOW_DATABASE_URL,
    },
  },
});

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("Conexão com o neondb_shadow bem-sucedida!");
    const tables =
      await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`;
    console.log("Tabelas no neondb_shadow:", tables);
  } catch (error) {
    console.error("Erro ao conectar ao neondb_shadow:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
