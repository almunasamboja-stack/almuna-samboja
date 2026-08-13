// Singleton Prisma Client agar tidak membuat koneksi baru di setiap request
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
