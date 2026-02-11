import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool } from './pool.js';

async function migrate() {
  const cwd = process.cwd();
  const schemaPath = join(cwd, 'src/db/schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  console.log('Schema applied successfully.');

  const migrationsDir = join(cwd, 'src/db/migrations');
  try {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      const path = join(migrationsDir, f);
      const migrationSql = readFileSync(path, 'utf-8');
      await pool.query(migrationSql);
      console.log(`Migration ${f} applied.`);
    }
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
