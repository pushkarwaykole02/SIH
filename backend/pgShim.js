import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export async function createPgPool() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL or DATABASE_URL is required');
  }
  const pool = new Pool({ connectionString });

  // Simple health check
  await pool.query('SELECT 1');

  // Provide a minimal MSSQL-like API shim
  const shim = {
    request() {
      const params = [];
      const nameToIndex = new Map();
      return {
        input(name, _type, value) {
          if (!nameToIndex.has(name)) {
            nameToIndex.set(name, params.length);
            params.push(value);
          } else {
            params[nameToIndex.get(name)] = value;
          }
          return this;
        },
        async query(sql) {
          // Replace @param with $1, $2 ... preserving insertion order
          const orderedNames = [...nameToIndex.keys()];
          let text = sql;
          orderedNames.forEach((n, i) => {
            const re = new RegExp('[@]'+n+'(?![a-zA-Z0-9_])', 'g');
            text = text.replace(re, `$${i+1}`);
          });
          const res = await pool.query({ text, values: params });
          return { recordset: res.rows, rowsAffected: [res.rowCount] };
        }
      };
    },
    // Direct query without params
    async query(sql) {
      const res = await pool.query(sql);
      return { recordset: res.rows, rowsAffected: [res.rowCount] };
    },
    // For compatibility in some places that do pool.request().query(...)
    async connect() { return shim; }
  };

  return shim;
}

// Minimal mssql-like type shim to keep existing input signatures intact
export const sql = {
  Int: 'int',
  NVarChar: 'text',
  VarChar: 'text',
  NVarchar: 'text',
  Bit: 'boolean',
  DateTime2: 'timestamptz',
  Date: 'date',
  Time: 'time',
  Decimal: 'decimal'
};


