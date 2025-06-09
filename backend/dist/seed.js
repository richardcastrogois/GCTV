"use strict";
//backend/src/seed.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
// Inicializar o Faker com localidade pt_BR para nomes e dados em português
const faker = new faker_1.Faker({ locale: [faker_1.pt_BR] });
// Função para gerar uma data aleatória entre duas datas
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Inserir métodos de pagamento com upsert
            const paymentMethods = [
                { id: 999, name: "Outros", isActive: true },
                { name: "Nubank", isActive: true },
                { name: "Banco do Brasil", isActive: true },
                { name: "Caixa", isActive: true },
                { name: "Picpay", isActive: true },
                { name: "PagSeguro", isActive: true },
            ];
            for (const method of paymentMethods) {
                yield prisma.paymentMethod.upsert({
                    where: { name: method.name },
                    update: { isActive: method.isActive },
                    create: {
                        id: method.id,
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
                { id: 999, name: "Outros", isActive: true },
                { name: "Comum", isActive: true },
                { name: "Platinum", isActive: true },
                { name: "P2P", isActive: true },
            ];
            for (const plan of plans) {
                yield prisma.plan.upsert({
                    where: { name: plan.name },
                    update: { isActive: plan.isActive },
                    create: {
                        id: plan.id,
                        name: plan.name,
                        isActive: plan.isActive,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }
            console.log("Planos inseridos/atualizados com sucesso!");
            // Inserir taxas de desconto
            const pagSeguro = yield prisma.paymentMethod.findFirst({
                where: { name: "PagSeguro" },
            });
            const outrosPayment = yield prisma.paymentMethod.findFirst({
                where: { name: "Outros" },
            });
            const nubank = yield prisma.paymentMethod.findFirst({
                where: { name: "Nubank" },
            });
            const bancoDoBrasil = yield prisma.paymentMethod.findFirst({
                where: { name: "Banco do Brasil" },
            });
            const caixa = yield prisma.paymentMethod.findFirst({
                where: { name: "Caixa" },
            });
            const picpay = yield prisma.paymentMethod.findFirst({
                where: { name: "Picpay" },
            });
            const comum = yield prisma.plan.findFirst({ where: { name: "Comum" } });
            const platinum = yield prisma.plan.findFirst({
                where: { name: "Platinum" },
            });
            const p2p = yield prisma.plan.findFirst({ where: { name: "P2P" } });
            const outrosPlan = yield prisma.plan.findFirst({
                where: { name: "Outros" },
            });
            if (pagSeguro &&
                outrosPayment &&
                nubank &&
                bancoDoBrasil &&
                caixa &&
                picpay &&
                comum &&
                platinum &&
                p2p &&
                outrosPlan) {
                const discounts = [
                    { planId: comum.id, paymentMethodId: pagSeguro.id, discount: 0.5666 },
                    { planId: platinum.id, paymentMethodId: pagSeguro.id, discount: 0.49 },
                    { planId: p2p.id, paymentMethodId: pagSeguro.id, discount: 0.49 },
                    { planId: outrosPlan.id, paymentMethodId: pagSeguro.id, discount: 0 },
                    { planId: comum.id, paymentMethodId: outrosPayment.id, discount: 0 },
                    { planId: platinum.id, paymentMethodId: outrosPayment.id, discount: 0 },
                    { planId: p2p.id, paymentMethodId: outrosPayment.id, discount: 0 },
                    {
                        planId: outrosPlan.id,
                        paymentMethodId: outrosPayment.id,
                        discount: 0,
                    },
                    { planId: comum.id, paymentMethodId: nubank.id, discount: 0 },
                    { planId: platinum.id, paymentMethodId: nubank.id, discount: 0 },
                    { planId: p2p.id, paymentMethodId: nubank.id, discount: 0 },
                    { planId: outrosPlan.id, paymentMethodId: nubank.id, discount: 0 },
                    { planId: comum.id, paymentMethodId: bancoDoBrasil.id, discount: 0 },
                    { planId: platinum.id, paymentMethodId: bancoDoBrasil.id, discount: 0 },
                    { planId: p2p.id, paymentMethodId: bancoDoBrasil.id, discount: 0 },
                    {
                        planId: outrosPlan.id,
                        paymentMethodId: bancoDoBrasil.id,
                        discount: 0,
                    },
                    { planId: comum.id, paymentMethodId: caixa.id, discount: 0 },
                    { planId: platinum.id, paymentMethodId: caixa.id, discount: 0 },
                    { planId: p2p.id, paymentMethodId: caixa.id, discount: 0 },
                    { planId: outrosPlan.id, paymentMethodId: caixa.id, discount: 0 },
                    { planId: comum.id, paymentMethodId: picpay.id, discount: 0 },
                    { planId: platinum.id, paymentMethodId: picpay.id, discount: 0 },
                    { planId: p2p.id, paymentMethodId: picpay.id, discount: 0 },
                    { planId: outrosPlan.id, paymentMethodId: picpay.id, discount: 0 },
                ];
                for (const discount of discounts) {
                    yield prisma.planPaymentMethodDiscount.upsert({
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
            }
            else {
                console.error("Erro: Algum plano ou método de pagamento não foi encontrado.");
            }
            // Limpar a tabela Client para evitar duplicatas (opcional)
            yield prisma.client.deleteMany();
            console.log("Tabela Client limpa");
            // Buscar todos os planos e métodos de pagamento para usar nos clientes
            const allPlans = yield prisma.plan.findMany();
            const allPaymentMethods = yield prisma.paymentMethod.findMany();
            // Criar 300 clientes fictícios com usuários associados
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
                const dueDate = randomDate(new Date("2023-01-01"), new Date("2025-04-30"));
                const grossAmount = faker.number.float({
                    min: 50,
                    max: 500,
                    fractionDigits: 2,
                });
                const isActive = faker.datatype.boolean(0.8);
                const discountEntry = yield prisma.planPaymentMethodDiscount.findUnique({
                    where: {
                        planId_paymentMethodId: {
                            planId: plan.id,
                            paymentMethodId: paymentMethod.id,
                        },
                    },
                });
                const discount = (discountEntry === null || discountEntry === void 0 ? void 0 : discountEntry.discount) || 0;
                const netAmount = grossAmount * (1 - discount);
                const username = `${fullName.split(" ")[0].toLowerCase()}.${i}`;
                const password = bcryptjs_1.default.hashSync("tempPassword123", 10);
                const user = yield prisma.user.create({
                    data: { username, password },
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: user.id,
                });
            }
            // Inserir os clientes no banco
            let createdCount = 0;
            for (const client of clients) {
                try {
                    yield prisma.client.create({
                        data: client,
                    });
                    createdCount++;
                }
                catch (error) {
                    console.error(`Erro ao criar cliente ${client.email}:`, error);
                }
            }
            console.log(`${createdCount} clientes fictícios criados`);
        }
        catch (error) {
            console.error("Erro ao inserir dados iniciais:", error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
seed();
