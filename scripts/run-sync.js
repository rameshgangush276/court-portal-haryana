const { PrismaClient } = require('@prisma/client');
const { syncTableDefinitions } = require('./auto-sync');

const prisma = new PrismaClient();
syncTableDefinitions(prisma)
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });
