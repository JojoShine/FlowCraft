import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'tbtparent';
  const password = 'Xiaz123579...';
  const passwordHash = await bcrypt.hash(password, 10);

  // Create or find the user
  let user = await prisma.user.findUnique({ where: { username } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name: '管理员',
      },
    });
    console.log(`Created user: ${username} (ID: ${user.id})`);
  } else {
    // Update password if user exists
    user = await prisma.user.update({
      where: { username },
      data: { passwordHash },
    });
    console.log(`Updated user: ${username} (ID: ${user.id})`);
  }

  // Update all projects to be owned by this user
  const projectsUpdated = await prisma.project.updateMany({
    data: { ownerId: user.id },
  });
  console.log(`Updated ${projectsUpdated.count} projects`);

  console.log('\nDefault account created:');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
