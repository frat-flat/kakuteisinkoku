const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

try {
    const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });

    const prisma = new PrismaClient({ adapter });
    prisma.entity.count().then(count => {
        console.log('Success with BetterSQLite3 adapter. Count:', count);
        process.exit(0);
    }).catch(e => {
        console.error('Connection error with adapter:', e);
        process.exit(1);
    });
} catch (e) {
    console.error('Init error:', e);
}
