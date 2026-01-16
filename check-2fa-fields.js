const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFields() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'professor@uexam.com' },
      select: {
        email: true,
        twoFactorEnabled: true,
        twoFactorCode: true,
        twoFactorCodeExpires: true
      }
    });
    console.log('✅ 2FA fields exist! User data:', user);
  } catch (error) {
    console.error('❌ 2FA fields missing. Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFields(); 