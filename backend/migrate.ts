//backend/migrate.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function migrateExistingClients() {
  try {
    const clients = await prisma.client.findMany();

    for (const client of clients) {
      const usernameBase = client.email.split("@")[0].toLowerCase();
      let username = usernameBase;
      let suffix = 0;
      let isUnique = false;

      while (!isUnique) {
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });
        if (!existingUser) {
          isUnique = true;
        } else {
          suffix++;
          username = `${usernameBase}${suffix}`;
        }
      }

      const password = bcrypt.hashSync("tempPassword123", 10);
      const user = await prisma.user.create({
        data: { username, password },
      });

      await prisma.client.update({
        where: { id: client.id },
        data: { userId: user.id },
      });

      console.log(`Migrado cliente ${client.id} com usuário ${username}`);
    }

    console.log("Migração de clientes existente concluída!");
  } catch (error) {
    console.error("Erro durante a migração:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingClients();
