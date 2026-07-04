import { PrismaClient } from "@prisma/client";

// Seed stub. The real seed (materials/kits/tipologias from the prototype's
// planner/data.js) is defined in Phase 5. For now it just ensures a demo org.
const prisma = new PrismaClient();

async function main() {
  await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Organização Demo",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
