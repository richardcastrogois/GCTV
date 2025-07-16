import { PrismaClient } from "@prisma/client";
import { Faker, pt_BR } from "@faker-js/faker";
import bcrypt from "bcryptjs";

// ===================================================================================
// AJUSTE 1: Travado em 'true' para sempre criar dados no ambiente de portfólio.
// ===================================================================================
const CREATE_FAKE_DATA = true;
const prisma = new PrismaClient();
const faker = new Faker({ locale: [pt_BR] });

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  try {
    console.log("🚀 Iniciando o processo de seed para o portfólio...");

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
      console.log(">>> MODO PORTFÓLIO: Criando dados fictícios...");

      // Limpa dados antigos para garantir um estado inicial limpo
      await prisma.client.deleteMany({});
      await prisma.user.deleteMany({});
      console.log("🧹 Tabelas Client e User limpas.");

      const allPlans = await prisma.plan.findMany();
      const allPaymentMethods = await prisma.paymentMethod.findMany();

      // ===================================================================================
      // AJUSTE 2: Criando 50 clientes, conforme solicitado.
      // ===================================================================================
      console.log(
        `Criando 50 clientes fictícios com histórico de pagamentos...`
      );
      for (let i = 0; i < 50; i++) {
        const fullName = faker.person.fullName();
        const email = faker.internet.email().toLowerCase();
        const tempUsername = `${fullName.split(" ")[0].toLowerCase()}${i}`;
        const tempPassword = bcrypt.hashSync("tempPassword123", 10);

        // Cria um usuário admin "padrão" para facilitar o login no portfólio
        if (i === 0) {
          await prisma.user.create({
            data: { username: "admin", password: bcrypt.hashSync("admin", 10) },
          });
        }

        const tempUser = await prisma.user.create({
          data: { username: tempUsername, password: tempPassword },
        });

        // ===================================================================================
        // AJUSTE 3: Geração de um histórico de pagamentos rico e variado.
        // ===================================================================================
        const paymentHistory = [];
        const numPayments = faker.number.int({ min: 1, max: 12 }); // Cada cliente terá de 1 a 12 pagamentos

        for (let j = 0; j < numPayments; j++) {
          // Garante que alguns pagamentos tenham os valores exatos para testar a lógica do PagSeguro
          const possibleGrossAmounts = [
            30.0,
            35.0,
            faker.number.float({ min: 25, max: 80, fractionDigits: 2 }),
          ];
          const paymentBruto = faker.helpers.arrayElement(possibleGrossAmounts);
          const paymentLiquido = paymentBruto * 0.9; // Exemplo de líquido

          paymentHistory.push({
            paymentDate: randomDate(
              new Date("2025-01-01"),
              new Date("2025-12-31")
            ).toISOString(),
            paymentBruto,
            paymentLiquido,
            paymentMethodId: faker.helpers.arrayElement(allPaymentMethods).id,
          });
        }

        await prisma.client.create({
          data: {
            fullName,
            email,
            phone: faker.phone.number(),
            planId: faker.helpers.arrayElement(allPlans).id,
            paymentMethodId: faker.helpers.arrayElement(allPaymentMethods).id,
            dueDate: randomDate(new Date("2025-12-01"), new Date("2026-03-30")),
            // Os campos abaixo são menos relevantes pois os dados vêm do histórico
            grossAmount: 0,
            netAmount: 0,
            isActive: faker.datatype.boolean(0.8), // 80% de chance de ser ativo
            userId: tempUser.id,
            paymentHistory: paymentHistory, // <-- Adicionando o histórico de pagamentos
          },
        });
      }
      console.log("✅ 50 Clientes fictícios criados com sucesso.");
      console.log(
        "🔑 Dica: Um usuário 'admin' com senha 'admin' foi criado para facilitar o acesso."
      );
    } else {
      // Este bloco não será executado pois CREATE_FAKE_DATA é true.
      console.log(
        ">>> MODO DE PRODUÇÃO: Nenhuma ação de criação de dados executada."
      );
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
