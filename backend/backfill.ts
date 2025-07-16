
const { format } = require("date-fns");
const { zonedTimeToUtc } = require("date-fns-tz"); // <-- A MUDANÇA MAIS IMPORTANTE

const prismaClient = require("./src/lib/prisma").default;

const formatDueDate = (date: Date): string => {
  const timeZone = "America/Sao_Paulo";
  // Agora usamos a função diretamente, como no início
  const zonedDate = zonedTimeToUtc(date, timeZone);
  return format(zonedDate, "dd/MM/yyyy");
};

async function backfillDueDateStrings() {
  console.log("Iniciando a atualização dos campos dueDateString...");

  const clientsToUpdate = await prismaClient.client.findMany({
    where: {
      OR: [{ dueDateString: null }, { dueDateString: "" }],
    },
  });

  if (clientsToUpdate.length === 0) {
    console.log("Nenhum cliente precisava de atualização. Tudo certo!");
    await prismaClient.$disconnect();
    return;
  }

  console.log(`Encontrados ${clientsToUpdate.length} clientes para atualizar.`);

  for (const client of clientsToUpdate) {
    const newDueDateString = formatDueDate(client.dueDate);
    await prismaClient.client.update({
      where: { id: client.id },
      data: { dueDateString: newDueDateString },
    });
    console.log(
      `Cliente ID ${client.id} atualizado com a data ${newDueDateString}`
    );
  }

  console.log("Atualização concluída com sucesso!");
}

backfillDueDateStrings()
  .catch((e) => {
    console.error("Ocorreu um erro durante a atualização:", e);
    process.exit(1);
  })
  .finally(async () => {
    // A declaração 'any' aqui evita um erro de tipo com o 'process' em alguns ambientes.
    (process as any).exit(0);
  });
