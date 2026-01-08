import fs from 'fs';
import path from 'path';
import mime from 'mime';
import 'dotenv/config';
import { supabase } from '../supabaseClient.js';

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

async function ensureBucket() {
  const { data: list, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = list.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    // Optional: set public policy could be added here if needed.
  }
}

async function uploadFile(filePath, key) {
  const contentType = mime.getType(filePath) || 'application/octet-stream';
  const fileBuffer = await fs.promises.readFile(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(key, fileBuffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
}

async function main() {
  await ensureBucket();
  const entries = await fs.promises.readdir(LOCAL_UPLOADS_DIR);
  let uploaded = 0;
  for (const entry of entries) {
    const fullPath = path.join(LOCAL_UPLOADS_DIR, entry);
    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) continue;
    const key = entry; // flat namespace, same filename
    await uploadFile(fullPath, key);
    uploaded++;
    console.log(`Uploaded: ${entry}`);
  }
  console.log(`Done. Uploaded ${uploaded} files to bucket '${BUCKET}'.`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});


