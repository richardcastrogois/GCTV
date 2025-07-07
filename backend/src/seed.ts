//backend/src/seed.ts

import { PrismaClient } from "@prisma/client";
import { Faker, pt_BR } from "@faker-js/faker";
import bcrypt from "bcryptjs";

// --- CHAVE DE CONTROLE PRINCIPAL ---
// false = Prepara o banco para produção (APAGA todos os clientes e usuários de teste)
// true  = Gera 300 clientes de teste para desenvolvimento
const CREATE_FAKE_DATA = false;
// ----------------------------------

const prisma = new PrismaClient();
const faker = new Faker({ locale: [pt_BR] });

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function seed() {
  try {
    console.log("Iniciando o processo de seed...");

    // --- DADOS ESSENCIAIS (Sempre serão criados ou atualizados) ---

    // 1. Inserir Métodos de Pagamento
    const paymentMethodsData = [
      { name: "Outros", isActive: true },
      { name: "Banco do Brasil", isActive: true },
      { name: "Caixa", isActive: true },
      { name: "Picpay", isActive: true },
      { name: "PagSeguro", isActive: true },
      // O "Nubank" foi removido como solicitado anteriormente
    ];
    for (const method of paymentMethodsData) {
      await prisma.paymentMethod.upsert({
        where: { name: method.name },
        update: {},
        create: { name: method.name, isActive: method.isActive },
      });
    }
    console.log("✅ Métodos de pagamento essenciais inseridos/atualizados.");

    // 2. Inserir Planos
    const plansData = [
      { name: "Hibrid", isActive: true },
      { name: "Comum", isActive: true },
      { name: "Platinum", isActive: true },
      { name: "P2P", isActive: true },
    ];
    for (const plan of plansData) {
      await prisma.plan.upsert({
        where: { name: plan.name },
        update: {},
        create: { name: plan.name, isActive: plan.isActive },
      });
    }
    console.log("✅ Planos essenciais inseridos/atualizados.");

    // --- LÓGICA DE LIMPEZA OU CRIAÇÃO DE DADOS DE TESTE ---

    if (CREATE_FAKE_DATA) {
      console.log(">>> MODO DE DESENVOLVIMENTO: Criando dados fictícios...");

      // Apaga apenas usuários que não são o seu admin principal
      await prisma.user.deleteMany({
        where: {
          username: {
            not: "platinum2025", // IMPORTANTE: Coloque aqui o seu usuário admin para NÃO ser deletado
          },
        },
      });

      await prisma.client.deleteMany({}); // Limpa todos os clientes antigos
      console.log("Tabelas Client e User (exceto admin) limpas.");

      const allPlans = await prisma.plan.findMany();
      const allPaymentMethods = await prisma.paymentMethod.findMany();
      const adminUser = await prisma.user.findUnique({
        where: { username: "platinum2025" },
      });

      if (!adminUser) {
        throw new Error(
          "Usuário admin principal não encontrado para associar clientes."
        );
      }

      // Lógica para criar 300 clientes (seu código original)
      const clients = [];
      for (let i = 0; i < 300; i++) {
        const fullName = faker.person.fullName();
        const email = faker.internet.email({
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ")[1],
        });
        const phone = faker.phone.number();
        const plan = faker.helpers.arrayElement(allPlans);
        const paymentMethod = faker.helpers.arrayElement(allPaymentMethods);
        const dueDate = randomDate(
          new Date("2023-01-01"),
          new Date("2025-04-30")
        );
        const grossAmount = faker.number.float({
          min: 50,
          max: 500,
          fractionDigits: 2,
        });
        const isActive = faker.datatype.boolean(0.8);
        const netAmount = grossAmount * 0.9; // Exemplo simplificado
        const tempUsername = `${fullName.split(" ")[0].toLowerCase()}.${i}`;
        const tempPassword = bcrypt.hashSync("tempPassword123", 10);
        const tempUser = await prisma.user.create({
          data: { username: tempUsername, password: tempPassword },
        });

        clients.push({
          fullName,
          email,
          phone,
          planId: plan.id,
          paymentMethodId: paymentMethod.id,
          dueDate,
          grossAmount,
          netAmount,
          isActive,
          userId: tempUser.id,
        });
      }

      for (const client of clients) {
        await prisma.client.create({ data: client });
      }
      console.log("✅ Clientes fictícios criados com sucesso.");
    } else {
      console.log(">>> MODO DE PRODUÇÃO: Limpando dados de teste...");

      // Garante que a tabela de clientes esteja vazia
      await prisma.client.deleteMany({});
      console.log("✅ Tabela de clientes limpa.");

      // Garante que apenas o seu usuário admin exista
      await prisma.user.deleteMany({
        where: {
          username: {
            not: "platinum2025", // IMPORTANTE: Coloque aqui o seu usuário admin para NÃO ser deletado
          },
        },
      });
      console.log("✅ Tabela de usuários (exceto admin) limpa para o deploy.");
    }
  } catch (error) {
    console.error("❌ Erro ao executar o seed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("🚀 Processo de seed finalizado.");
  }
}

seed();