import { PrismaClient } from '@prisma/client'

async function main() {
  const loginId = process.argv[2]
  if (!loginId) {
    console.error('Usage: tsx scripts/delete-user.ts <loginId>')
    process.exit(1)
  }
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { loginId } })
    if (!user) {
      console.log(`User '${loginId}' not found.`)
      return
    }
    await prisma.character.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log(`Deleted user '${loginId}' and related characters.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


