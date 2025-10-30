import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Demo123!', 10);
  
  // Créer l'utilisateur démo
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@LandFi-africa.com' },
    update: {},
    create: {
      email: 'demo@LandFi-africa.com',
      passwordHash: hashedPassword,
      displayName: 'Demo User',
      emailVerified: true, // Déjà vérifié pour faciliter la démo
      role: 'USER',
      reputationScore: 750, // Score moyen pour la démo
      completedLoans: 3,
      defaultedLoans: 0,
      verifiedTransactions: 5,
      communityEndorsements: 2,
      riskLevel: 'LOW',
    },
  });

  console.log('✅ Demo user created:', demoUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });