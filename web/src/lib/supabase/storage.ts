// Stores managed uploads in the private Supabase bucket and reads them on trusted server routes.
import { adminSupabase } from './client';

const bucket = 'portfolio-private';
const validKey = /^(images|workbooks|resumes|certifications)\/[a-zA-Z0-9_.-]+$/;

function checkedKey(key: string) {
  if (!validKey.test(key) || key.includes('..')) throw new Error('Invalid Storage object key.');
  return key;
}

export async function uploadPrivate(key: string, bytes: Uint8Array, contentType: string) {
  const result = await adminSupabase().storage.from(bucket).upload(checkedKey(key), bytes, {
    contentType,
    upsert: false,
    cacheControl: '0',
  });
  if (result.error) throw new Error(`Unable to store ${key}: ${result.error.message}`);
}

export async function removePrivate(keys: string[]) {
  if (!keys.length) return;
  const result = await adminSupabase().storage.from(bucket).remove(keys.map(checkedKey));
  if (result.error) throw new Error('Unable to clean up an incomplete upload.');
}

export async function downloadPrivate(key: string): Promise<Buffer | undefined> {
  const result = await adminSupabase().storage.from(bucket).download(checkedKey(key));
  if (result.error) {
    if ('statusCode' in result.error && String(result.error.statusCode) === '404') return;
    throw new Error(`Unable to read ${key}: ${result.error.message}`);
  }
  return Buffer.from(await result.data.arrayBuffer());
}

export async function privateObjectExists(key: string) {
  return Boolean(await downloadPrivate(key));
}

export async function publicObjectExists(key: string) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.split('/').includes('..'))
    throw new Error('Invalid public Storage object key.');
  const result = await adminSupabase().storage.from('portfolio-public').download(key);
  if (result.error) {
    if ('statusCode' in result.error && String(result.error.statusCode) === '404') return false;
    throw new Error(`Unable to inspect ${key}: ${result.error.message}`);
  }
  return true;
}
