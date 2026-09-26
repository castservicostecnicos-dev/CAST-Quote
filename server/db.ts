import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { DEFAULT_CATALOG } from './defaultCatalog';

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'castquote.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing database file, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  try {
    dbInstance.run("UPDATE work_orders SET technician_id = '' WHERE technician_id IS NULL;");
    // Ensure all emails across all tables are strictly lowercase and trimmed
    dbInstance.run("UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != '';");
    dbInstance.run("UPDATE technicians SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != '';");
    dbInstance.run("UPDATE clients SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != '';");
    dbInstance.run("UPDATE companies SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != '';");
  } catch (err) {
    console.warn('Startup database sanitization note:', err);
  }
  saveDatabase();
  return dbInstance;
}

export function saveDatabase() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(sql, params);
  return all.length > 0 ? all[0] : null;
}

export function runSql(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDatabase();
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cnpj TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#2563eb',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      role_title TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      document TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Serviço',
      subcategory TEXT,
      item_type TEXT DEFAULT 'servico',
      unit TEXT DEFAULT 'UN',
      purchase_unit TEXT,
      consumption_unit TEXT,
      package_quantity TEXT,
      unit_cost REAL,
      default_price REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      quote_number INTEGER NOT NULL,
      client_id TEXT NOT NULL,
      technician_id TEXT,
      created_by TEXT NOT NULL,
      date TEXT NOT NULL,
      validity_date TEXT,
      status TEXT NOT NULL DEFAULT 'Rascunho',
      description TEXT NOT NULL,
      address TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      addition REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      client_signature TEXT,
      client_signed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'UN',
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quote_photos (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      order_number INTEGER NOT NULL,
      quote_id TEXT,
      client_id TEXT NOT NULL,
      technician_id TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aberta',
      service_description TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      addition REAL DEFAULT 0,
      total REAL DEFAULT 0,
      client_signature TEXT,
      client_signed_at TEXT,
      technician_signature TEXT,
      technician_signed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_order_items (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'UN',
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS work_order_photos (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT,
      status TEXT DEFAULT 'sent',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'wa_me',
      api_url TEXT,
      api_key TEXT,
      instance_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drive_settings (
      id TEXT PRIMARY KEY,
      account_email TEXT NOT NULL,
      account_name TEXT,
      account_photo TEXT,
      root_folder_name TEXT DEFAULT 'CAST_Quote',
      auto_sync INTEGER DEFAULT 1,
      sync_photos INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_required_materials (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      material_id TEXT,
      material_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'UN',
      default_price REAL DEFAULT 0,
      is_optional INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_srv_req_mat_service_id ON service_required_materials(service_id);
  `);

  // Migration check: ensure created_at exists on drive_settings table
  try { db.run(`ALTER TABLE drive_settings ADD COLUMN created_at TEXT;`); } catch {}

  // Migration check: ensure primary_color column exists on companies table
  try {
    db.run(`ALTER TABLE companies ADD COLUMN primary_color TEXT DEFAULT '#2563eb'`);
  } catch {
    // Column already exists, safe to ignore
  }

  // Migration check: ensure signature columns exist on work_orders and quotes
  try { db.run(`ALTER TABLE work_orders ADD COLUMN client_signature TEXT;`); } catch {}
  try { db.run(`ALTER TABLE work_orders ADD COLUMN client_signed_at TEXT;`); } catch {}
  try { db.run(`ALTER TABLE work_orders ADD COLUMN technician_signature TEXT;`); } catch {}
  try { db.run(`ALTER TABLE work_orders ADD COLUMN technician_signed_at TEXT;`); } catch {}
  try { db.run(`ALTER TABLE quotes ADD COLUMN client_signature TEXT;`); } catch {}
  try { db.run(`ALTER TABLE quotes ADD COLUMN client_signed_at TEXT;`); } catch {}

  // Migration check: ensure extended material & unit fields exist on services table
  try { db.run(`ALTER TABLE services ADD COLUMN subcategory TEXT;`); } catch {}
  try { db.run(`ALTER TABLE services ADD COLUMN purchase_unit TEXT;`); } catch {}
  try { db.run(`ALTER TABLE services ADD COLUMN consumption_unit TEXT;`); } catch {}
  try { db.run(`ALTER TABLE services ADD COLUMN package_quantity TEXT;`); } catch {}
  try { db.run(`ALTER TABLE services ADD COLUMN unit_cost REAL;`); } catch {}

  // Migration check: ensure users table company_id allows NULL
  try {
    const tableInfo = db.exec("PRAGMA table_info(users)");
    if (tableInfo.length > 0) {
      const companyIdCol = tableInfo[0].values.find(v => v[1] === 'company_id');
      if (companyIdCol && companyIdCol[3] === 1) {
        db.run('BEGIN TRANSACTION;');
        db.run('CREATE TABLE users_new (id TEXT PRIMARY KEY, company_id TEXT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, active INTEGER DEFAULT 1, avatar_url TEXT, created_at TEXT NOT NULL);');
        db.run('INSERT INTO users_new (id, company_id, name, email, password, role, active, avatar_url, created_at) SELECT id, company_id, name, email, password, role, active, avatar_url, created_at FROM users;');
        db.run('DROP TABLE users;');
        db.run('ALTER TABLE users_new RENAME TO users;');
        db.run("UPDATE users SET company_id = NULL WHERE role = 'DEV';");
        db.run('COMMIT;');
      }
    }
  } catch (err) {
    console.error('Error verifying users table company_id nullability:', err);
  }

  // Ensure requested Dev accounts exist with full DEV role and requested credentials
  try {
    const nowIso = new Date().toISOString();
    
    // DEV Ale
    const existingAle = queryOne(`SELECT * FROM users WHERE email = ?`, ['ale11062@gmail.com']);
    if (!existingAle) {
      db.run(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES ('usr-dev-ale', NULL, 'Desenvolvedor Master (Ale)', 'ale11062@gmail.com', 'cast.2468', 'DEV', 1, ?)`,
        [nowIso]
      );
    } else {
      db.run(
        `UPDATE users SET password = 'cast.2468', role = 'DEV', company_id = NULL, active = 1, name = 'Desenvolvedor Master (Ale)'
         WHERE email = 'ale11062@gmail.com'`
      );
    }

    // DEV ClientesIPTV
    const existingCliente = queryOne(`SELECT * FROM users WHERE email = ?`, ['clientesiptv.2468@gmail.com']);
    if (!existingCliente) {
      db.run(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES ('usr-dev-cliente', NULL, 'Administrador Master DEV', 'clientesiptv.2468@gmail.com', 'cast.2468', 'DEV', 1, ?)`,
        [nowIso]
      );
    } else {
      db.run(
        `UPDATE users SET password = 'cast.2468', role = 'DEV', company_id = NULL, active = 1, name = 'Administrador Master DEV'
         WHERE email = 'clientesiptv.2468@gmail.com'`
      );
    }

    // DEV CAST Serviços Técnicos
    const existingCast = queryOne(`SELECT * FROM users WHERE email = ?`, ['cast.servicostecnicos@gmail.com']);
    if (!existingCast) {
      db.run(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES ('usr-dev-cast', NULL, 'CAST Serviços Técnicos (DEV)', 'cast.servicostecnicos@gmail.com', 'cast.2468', 'DEV', 1, ?)`,
        [nowIso]
      );
    } else {
      db.run(
        `UPDATE users SET password = 'cast.2468', role = 'DEV', company_id = NULL, active = 1, name = 'CAST Serviços Técnicos (DEV)'
         WHERE email = 'cast.servicostecnicos@gmail.com'`
      );
    }

    // DEV Master dev@castquote.com
    const existingDev = queryOne(`SELECT * FROM users WHERE email = ?`, ['dev@castquote.com']);
    if (!existingDev) {
      db.run(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES ('usr-dev-master', NULL, 'Dev Master (Administrador Global)', 'dev@castquote.com', 'cast.2468', 'DEV', 1, ?)`,
        [nowIso]
      );
    } else {
      db.run(
        `UPDATE users SET password = 'cast.2468', role = 'DEV', company_id = NULL, active = 1, name = 'Dev Master (Administrador Global)'
         WHERE email = 'dev@castquote.com'`
      );
    }

    // Desvincular todas as contas de desenvolvedores (DEV) de qualquer empresa
    db.run(`UPDATE users SET company_id = NULL WHERE role = 'DEV'`);

    // Ensure Master Company comp-master-cast exists
    const masterComp = queryOne(`SELECT id FROM companies WHERE id = ?`, ['comp-master-cast']);
    if (!masterComp) {
      db.run(
        `INSERT INTO companies (id, name, cnpj, email, phone, address, city, state, logo_url, primary_color, active, created_at)
         VALUES ('comp-master-cast', 'CAST Serviços Técnicos', '00.000.000/0001-99', 'cast.servicostecnicos@gmail.com', '(11) 99999-8888', 'Av. Paulista, 1000', 'São Paulo', 'SP', '', '#2563eb', 1, ?)`,
        [nowIso]
      );
    }

    // Ensure at least one default client and technician exist for initial operations
    const clientCount = queryOne(`SELECT COUNT(*) as count FROM clients`);
    if (!clientCount || Number(clientCount.count) === 0) {
      db.run(
        `INSERT INTO clients (id, company_id, name, email, phone, address, city, state, notes, created_at)
         VALUES ('cli-padrao-01', 'comp-master-cast', 'Cliente Consumidor / Geral', 'cliente@exemplo.com', '(11) 98765-4321', 'São Paulo', 'São Paulo', 'SP', 'Cliente padrão do sistema', ?)`,
        [nowIso]
      );
    }

    const techCount = queryOne(`SELECT COUNT(*) as count FROM technicians`);
    if (!techCount || Number(techCount.count) === 0) {
      db.run(
        `INSERT INTO technicians (id, company_id, name, phone, email, role_title, active, created_at)
         VALUES ('tech-padrao-01', 'comp-master-cast', 'Técnico Especialista Principal', '(11) 97777-6666', 'tecnico@castquote.com', 'Técnico Líder', 1, ?)`,
        [nowIso]
      );
    }

    // Auto-seed of services removed to respect user requests to clear the catalog.
    // Seeding can be triggered manually via UI button or API endpoint.
  } catch (err) {
    console.error('Error ensuring accounts and company defaults:', err);
  }
}

/**
 * Cadastra/importa o catálogo padrão de serviços, materiais e vínculos de insumos necessários
 */
export function seedDefaultServicesAndMaterials(targetCompanyId: string = 'comp-master-cast') {
  if (!dbInstance) return;
  const nowIso = new Date().toISOString();
  console.log(`[DATABASE] Semeando catálogo padrão de serviços e materiais para a empresa ${targetCompanyId}...`);

  try {
    dbInstance.run('BEGIN TRANSACTION;');

    for (const item of DEFAULT_CATALOG) {
      dbInstance.run(
        `INSERT OR REPLACE INTO services (id, company_id, name, description, category, subcategory, item_type, unit, unit_cost, default_price, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          item.id,
          targetCompanyId,
          item.name,
          item.description || '',
          item.category || (item.item_type === 'material' ? 'Material' : 'Serviço'),
          item.category || null,
          item.item_type,
          item.unit || 'UN',
          item.unit_cost || null,
          item.default_price || 0,
          nowIso
        ]
      );

      // Insert required materials relations if any
      if (item.required_materials && item.required_materials.length > 0) {
        dbInstance.run(`DELETE FROM service_required_materials WHERE service_id = ?`, [item.id]);

        for (const req of item.required_materials) {
          const reqId = `srm-${item.id}-${req.material_id || Math.random().toString(36).substring(2, 8)}`;
          dbInstance.run(
            `INSERT INTO service_required_materials (id, service_id, material_id, material_name, quantity, unit, default_price, is_optional, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              reqId,
              item.id,
              req.material_id || null,
              req.material_name,
              req.quantity || 1,
              req.unit || 'UN',
              req.default_price || 0,
              req.is_optional ? 1 : 0,
              req.notes || null
            ]
          );
        }
      }
    }

    dbInstance.run('COMMIT;');
    saveDatabase();
    console.log(`[DATABASE] Catálogo padrão com ${DEFAULT_CATALOG.length} itens semeado com sucesso!`);
  } catch (err) {
    try { dbInstance.run('ROLLBACK;'); } catch {}
    console.error('[DATABASE] Erro ao semear catálogo padrão:', err);
  }
}

/**
 * Limpa todo o banco de dados preservando estritamente apenas as contas de DEV.
 */
export function cleanDatabaseComplete() {
  if (!dbInstance) return;
  try {
    dbInstance.run('BEGIN TRANSACTION;');
    dbInstance.run('DELETE FROM quotes;');
    dbInstance.run('DELETE FROM quote_items;');
    dbInstance.run('DELETE FROM quote_photos;');
    dbInstance.run('DELETE FROM work_orders;');
    dbInstance.run('DELETE FROM work_order_items;');
    dbInstance.run('DELETE FROM work_order_photos;');
    dbInstance.run('DELETE FROM clients;');
    dbInstance.run('DELETE FROM services;');
    dbInstance.run('DELETE FROM service_required_materials;');
    dbInstance.run('DELETE FROM technicians;');
    dbInstance.run('DELETE FROM companies;');
    dbInstance.run('DELETE FROM notifications;');
    dbInstance.run('DELETE FROM whatsapp_settings;');
    dbInstance.run('DELETE FROM drive_settings;');
    dbInstance.run("DELETE FROM users WHERE role != 'DEV';");
    dbInstance.run("UPDATE users SET company_id = NULL WHERE role = 'DEV';");
    dbInstance.run('COMMIT;');
    saveDatabase();
    console.log('[DATABASE] Banco de dados limpo com sucesso! Apenas os cadastros de DEV foram mantidos.');
  } catch (err) {
    try { dbInstance.run('ROLLBACK;'); } catch {}
    console.error('[DATABASE] Erro ao limpar banco de dados:', err);
  }
}

/**
 * Limpa todos os serviços e materiais do catálogo
 */
export function clearCatalog(companyId?: string) {
  if (!dbInstance) return;
  try {
    dbInstance.run('BEGIN TRANSACTION;');
    if (companyId && companyId !== 'ALL') {
      dbInstance.run(
        `DELETE FROM service_required_materials WHERE service_id IN (SELECT id FROM services WHERE company_id = ?)`,
        [companyId]
      );
      dbInstance.run(`DELETE FROM services WHERE company_id = ?`, [companyId]);
    } else {
      dbInstance.run('DELETE FROM service_required_materials;');
      dbInstance.run('DELETE FROM services;');
    }
    dbInstance.run('COMMIT;');
    saveDatabase();
    console.log(`[DATABASE] Catálogo de serviços e materiais limpo com sucesso! (Filtro: ${companyId || 'TODOS'})`);
  } catch (err) {
    try { dbInstance.run('ROLLBACK;'); } catch {}
    console.error('[DATABASE] Erro ao limpar catálogo:', err);
    throw err;
  }
}

