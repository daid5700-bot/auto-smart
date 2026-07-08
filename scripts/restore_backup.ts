import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function run() {
  const sqlFilePath = path.join(process.cwd(), 'backup.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: SQL file not found at ${sqlFilePath}`);
    process.exit(1);
  }

  console.log(`Reading SQL file from: ${sqlFilePath}`);
  const content = fs.readFileSync(sqlFilePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  console.log("Dropping and recreating public schema...");
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE;`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`);
  await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO postgres;`);
  await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
  
  let currentSql = "";
  let inCopyMode = false;
  let copyTarget = "";
  let copyColumns = "";
  let copyRows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (inCopyMode) {
      if (line.trim() === '\\.') {
        // End of COPY block. Generate and run INSERT query.
        if (copyRows.length > 0 && copyTarget.startsWith('public.')) {
          console.log(`Inserting ${copyRows.length} rows into ${copyTarget}...`);
          const insertHeader = `INSERT INTO ${copyTarget} ${copyColumns} VALUES `;
          const valueBlocks = copyRows.map(row => {
            const valStrings = row.map(val => {
              if (val === '\\N') {
                return 'NULL';
              }
              // Escape single quotes and wrap in single quotes
              const escaped = val.replace(/'/g, "''");
              return `'${escaped}'`;
            });
            return `(${valStrings.join(', ')})`;
          });
          
          // Execute inserts in chunks to prevent query length limits
          const chunkSize = 200;
          for (let j = 0; j < valueBlocks.length; j += chunkSize) {
            const chunk = valueBlocks.slice(j, j + chunkSize);
            const sql = insertHeader + chunk.join(', ') + ';';
            await prisma.$executeRawUnsafe(sql);
          }
        }
        inCopyMode = false;
        copyRows = [];
      } else {
        // Collect COPY data row (split by tab)
        const row = line.split('\t');
        copyRows.push(row);
      }
      continue;
    }
    
    const copyMatch = line.match(/^COPY\s+(public\.[^\s]+)\s*\(([^)]+)\)\s*FROM\s+stdin;/i);
    if (copyMatch) {
      inCopyMode = true;
      copyTarget = copyMatch[1];
      copyColumns = `(${copyMatch[2]})`;
      copyRows = [];
      continue;
    }
    
    // Ignore COPY statements for other schemas
    if (line.startsWith('COPY ')) {
      // Skip lines until \.
      while (i < lines.length && lines[i].trim() !== '\\.') {
        i++;
      }
      continue;
    }
    
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }
    
    currentSql += line + "\n";
    if (trimmed.endsWith(';')) {
      // Execute the statement ONLY if it targets the public schema and does not touch system schemas
      const hasPublicSchema = /(?<![a-zA-Z0-9_])public\./.test(currentSql);
      const touchesSystemSchema = /(realtime|auth|graphql|pgbouncer|storage|vault|extensions)\./i.test(currentSql);
      if (hasPublicSchema && !touchesSystemSchema) {
        try {
          await prisma.$executeRawUnsafe(currentSql);
        } catch (err) {
          console.error(`Error executing SQL block:\n${currentSql}`);
          console.error(err);
          throw err;
        }
      }
      currentSql = "";
    }
  }
  
  console.log("🎉 Database restore from backup.sql completed successfully!");
}

run()
  .catch(err => {
    console.error("❌ Restore failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
