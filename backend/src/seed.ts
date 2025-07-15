// backend/src/seed.ts

import { PrismaClient } from "@prisma/client";
import { Faker, pt_BR } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const CREATE_FAKE_DATA = false;
const prisma = new PrismaClient();
const faker = new Faker({ locale: [pt_BR] });

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  try {
    console.log("🚀 Iniciando o processo de seed...");

    console.log(
      "🔄 Inserindo/Atualizando dados essenciais (Planos e Métodos de Pagamento)..."
    );

    const paymentMethodsData = [
      { name: "Outros", isActive: true },
      { name: "Banco do Brasil", isActive: true },
      { name: "Caixa", isActive: true },
      { name: "Picpay", isActive: true },
      { name: "PagSeguro", isActive: true },
    ];
    for (const method of paymentMethodsData) {
      await prisma.paymentMethod.upsert({
        where: { name: method.name },
        update: {},
        create: { name: method.name, isActive: method.isActive },
      });
    }
    console.log("✅ Métodos de pagamento essenciais inseridos/atualizados.");

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

    if (CREATE_FAKE_DATA) {
      console.log(">>> MODO DE DESENVOLVIMENTO: Criando dados fictícios...");

      await prisma.client.deleteMany({});
      await prisma.user.deleteMany({
        where: { username: { not: "platinum2025" } },
      });
      console.log("🧹 Tabelas Client e User (exceto admin) limpas.");

      const allPlans = await prisma.plan.findMany();
      const allPaymentMethods = await prisma.paymentMethod.findMany();

      console.log(`Criando 300 clientes fictícios...`);
      for (let i = 0; i < 300; i++) {
        const fullName = faker.person.fullName();
        const email = faker.internet.email().toLowerCase();
        const tempUsername = `${fullName.split(" ")[0].toLowerCase()}${i}`;
        const tempPassword = bcrypt.hashSync("tempPassword123", 10);

        const tempUser = await prisma.user.create({
          data: { username: tempUsername, password: tempPassword },
        });

        const plan = faker.helpers.arrayElement(allPlans);
        const grossAmount = faker.number.float({
          min: 50,
          max: 500,
          fractionDigits: 2,
        });

        await prisma.client.create({
          data: {
            fullName,
            email,
            phone: faker.phone.number(),
            planId: plan.id,
            paymentMethodId: faker.helpers.arrayElement(allPaymentMethods).id,
            dueDate: randomDate(new Date("2023-01-01"), new Date("2025-04-30")),
            grossAmount,
            netAmount: grossAmount * 0.9, // Exemplo
            isActive: faker.datatype.boolean(0.8),
            userId: tempUser.id,
          },
        });
      }
      console.log("✅ 300 Clientes fictícios criados com sucesso.");
    } else {
      console.log(">>> MODO DE PRODUÇÃO: Limpando dados de teste...");

      await prisma.client.deleteMany({});
      console.log("✅ Tabela de clientes limpa.");

      await prisma.user.deleteMany({
        where: { username: { not: "platinum2025" } },
      });
      console.log("✅ Tabela de usuários (exceto admin) limpa para o deploy.");
    }
  } catch (error) {
    console.error("❌ Erro ao executar o seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("🏁 Processo de seed finalizado.");
  }
}

main();
