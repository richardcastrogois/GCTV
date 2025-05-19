//backend/src/seed.ts

import { PrismaClient } from "@prisma/client";
import { Faker, pt_BR } from "@faker-js/faker";

const prisma = new PrismaClient();

// Inicializar o Faker com localidade pt_BR para nomes e dados em português
const faker = new Faker({ locale: [pt_BR] });

// Função para gerar uma data aleatória entre duas datas
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function seed() {
  try {
    // Inserir métodos de pagamento com upsert
    const paymentMethods = [
      { id: 999, name: "Outros", isActive: true }, // "Outros" com ID fixo
      { name: "Nubank", isActive: true },
      { name: "Banco do Brasil", isActive: true },
      { name: "Caixa", isActive: true },
      { name: "Picpay", isActive: true },
      { name: "PagSeguro", isActive: true },
    ];

    for (const method of paymentMethods) {
      await prisma.paymentMethod.upsert({
        where: { name: method.name },
        update: { isActive: method.isActive },
        create: {
          id: method.id, // Apenas para "Outros"
          name: method.name,
          isActive: method.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    console.log("Métodos de pagamento inseridos/atualizados com sucesso!");

    // Inserir planos com upsert
    const plans = [
      { id: 999, name: "Outros", isActive: true }, // "Outros" com ID fixo
      { name: "Comum", isActive: true },
      { name: "Platinum", isActive: true },
      { name: "P2P", isActive: true },
    ];

    for (const plan of plans) {
      await prisma.plan.upsert({
        where: { name: plan.name },
        update: { isActive: plan.isActive },
        create: {
          id: plan.id, // Apenas para "Outros"
          name: plan.name,
          isActive: plan.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    console.log("Planos inseridos/atualizados com sucesso!");

    // Inserir taxas de desconto na nova tabela PlanPaymentMethodDiscount
    const pagSeguro = await prisma.paymentMethod.findFirst({
      where: { name: "PagSeguro" },
    });
    const outrosPayment = await prisma.paymentMethod.findFirst({
      where: { name: "Outros" },
    });
    const nubank = await prisma.paymentMethod.findFirst({
      where: { name: "Nubank" },
    });
    const bancoDoBrasil = await prisma.paymentMethod.findFirst({
      where: { name: "Banco do Brasil" },
    });
    const caixa = await prisma.paymentMethod.findFirst({
      where: { name: "Caixa" },
    });
    const picpay = await prisma.paymentMethod.findFirst({
      where: { name: "Picpay" },
    });

    const comum = await prisma.plan.findFirst({ where: { name: "Comum" } });
    const platinum = await prisma.plan.findFirst({
      where: { name: "Platinum" },
    });
    const p2p = await prisma.plan.findFirst({ where: { name: "P2P" } });
    const outrosPlan = await prisma.plan.findFirst({
      where: { name: "Outros" },
    });

    if (
      pagSeguro &&
      outrosPayment &&
      nubank &&
      bancoDoBrasil &&
      caixa &&
      picpay &&
      comum &&
      platinum &&
      p2p &&
      outrosPlan
    ) {
      const discounts = [
        // PagSeguro
        { planId: comum.id, paymentMethodId: pagSeguro.id, discount: 0.5666 }, // 56,66% para Comum
        { planId: platinum.id, paymentMethodId: pagSeguro.id, discount: 0.49 }, // 49% para Platinum
        { planId: p2p.id, paymentMethodId: pagSeguro.id, discount: 0.49 }, // 49% para P2P
        { planId: outrosPlan.id, paymentMethodId: pagSeguro.id, discount: 0 }, // 0% para Outros

        // Outros (forma de pagamento)
        { planId: comum.id, paymentMethodId: outrosPayment.id, discount: 0 },
        { planId: platinum.id, paymentMethodId: outrosPayment.id, discount: 0 },
        { planId: p2p.id, paymentMethodId: outrosPayment.id, discount: 0 },
        {
          planId: outrosPlan.id,
          paymentMethodId: outrosPayment.id,
          discount: 0,
        },

        // Nubank
        { planId: comum.id, paymentMethodId: nubank.id, discount: 0 },
        { planId: platinum.id, paymentMethodId: nubank.id, discount: 0 },
        { planId: p2p.id, paymentMethodId: nubank.id, discount: 0 },
        { planId: outrosPlan.id, paymentMethodId: nubank.id, discount: 0 },

        // Banco do Brasil
        { planId: comum.id, paymentMethodId: bancoDoBrasil.id, discount: 0 },
        { planId: platinum.id, paymentMethodId: bancoDoBrasil.id, discount: 0 },
        { planId: p2p.id, paymentMethodId: bancoDoBrasil.id, discount: 0 },
        {
          planId: outrosPlan.id,
          paymentMethodId: bancoDoBrasil.id,
          discount: 0,
        },

        // Caixa
        { planId: comum.id, paymentMethodId: caixa.id, discount: 0 },
        { planId: platinum.id, paymentMethodId: caixa.id, discount: 0 },
        { planId: p2p.id, paymentMethodId: caixa.id, discount: 0 },
        { planId: outrosPlan.id, paymentMethodId: caixa.id, discount: 0 },

        // Picpay
        { planId: comum.id, paymentMethodId: picpay.id, discount: 0 },
        { planId: platinum.id, paymentMethodId: picpay.id, discount: 0 },
        { planId: p2p.id, paymentMethodId: picpay.id, discount: 0 },
        { planId: outrosPlan.id, paymentMethodId: picpay.id, discount: 0 },
      ];

      for (const discount of discounts) {
        await prisma.planPaymentMethodDiscount.upsert({
          where: {
            planId_paymentMethodId: {
              planId: discount.planId,
              paymentMethodId: discount.paymentMethodId,
            },
          },
          update: { discount: discount.discount },
          create: {
            planId: discount.planId,
            paymentMethodId: discount.paymentMethodId,
            discount: discount.discount,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      console.log("Taxas de desconto inseridas/atualizadas com sucesso!");
    } else {
      console.error(
        "Erro: Algum plano ou método de pagamento não foi encontrado."
      );
    }

    // Limpar a tabela Client para evitar duplicatas (opcional)
    await prisma.client.deleteMany();
    console.log("Tabela Client limpa");

    // Buscar todos os planos e métodos de pagamento para usar nos clientes
    const allPlans = await prisma.plan.findMany();
    const allPaymentMethods = await prisma.paymentMethod.findMany();

    // Criar 300 clientes fictícios
    const clients = [];
    for (let i = 0; i < 300; i++) {
      const fullName = faker.person.fullName();
      // Garantir e-mail único adicionando um sufixo incremental
      const emailBase = faker.internet.email({
        firstName: fullName.split(" ")[0],
        lastName: fullName.split(" ")[1],
      });
      const email = `${emailBase.split("@")[0]}.${i}@${
        emailBase.split("@")[1]
      }`; // Ex.: joao.silva.0@gmail.com
      const phone = faker.phone.number(); // Formato padrão do pt_BR
      const plan = faker.helpers.arrayElement(allPlans); // Escolhe um plano aleatório
      const paymentMethod = faker.helpers.arrayElement(allPaymentMethods); // Escolhe um método de pagamento aleatório
      const dueDate = randomDate(
        new Date("2023-01-01"),
        new Date("2025-04-30")
      ); // Data entre 01/01/2023 e 30/04/2025
      const grossAmount = faker.number.float({
        min: 50,
        max: 500,
        fractionDigits: 2,
      }); // Valor bruto entre R$ 50 e R$ 500
      const isActive = faker.datatype.boolean(0.8); // 80% de chance de estar ativo

      // Buscar a taxa de desconto para a combinação de plano e método de pagamento
      const discountEntry = await prisma.planPaymentMethodDiscount.findUnique({
        where: {
          planId_paymentMethodId: {
            planId: plan.id,
            paymentMethodId: paymentMethod.id,
          },
        },
      });
      const discount = discountEntry?.discount || 0;
      const netAmount = grossAmount * (1 - discount); // Calcular o valor líquido

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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Inserir os clientes no banco
    let createdCount = 0;
    for (const client of clients) {
      try {
        await prisma.client.create({
          data: client,
        });
        createdCount++;
      } catch (error) {
        console.error(`Erro ao criar cliente ${client.email}:`, error);
        // Continuar com os próximos clientes mesmo se houver erro
      }
    }

    console.log(`${createdCount} clientes fictícios criados`);
  } catch (error) {
    console.error("Erro ao inserir dados iniciais:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
