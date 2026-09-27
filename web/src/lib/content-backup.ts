import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

const roots = ['src/content', 'public', '.admin-trash'] as const;
const manifestSchema = z.object({
  version: z.literal(1), createdAt: z.string().datetime(),
  files: z.array(z.object({ path: z.string().min(1), size: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(1).max(20000),
});
type Entry = z.infer<typeof manifestSchema>['files'][number];
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
function safeRelative(value: string) {
  if (!roots.some(root => value.startsWith(root + '/')) || value.includes('\\') || value.includes('\0') || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe backup path: ${value}`);
  return value;
}
function filesUnder(root: string, prefix: string): string[] {
  const directory = path.join(root, prefix);
  if (!fs.existsSync(directory)) return [];
  if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) throw new Error(`Backup directory must not be a symlink: ${prefix}`);
  return fs.readdirSync(directory).sort().flatMap(name => {
    const relative = prefix + '/' + name;
    const stat = fs.lstatSync(path.join(root, relative));
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not supported in backups: ${relative}`);
    if (stat.isDirectory()) return filesUnder(root, relative);
    if (!stat.isFile()) throw new Error(`Unsupported backup file: ${relative}`);
    return [safeRelative(relative)];
  });
}
function inventory(root: string) {
  return roots.flatMap(prefix => filesUnder(root, prefix)).sort();
}
function inside(directory: string, parent: string) {
  const relative = path.relative(parent, directory);
  return !relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function resolveDestination(value: string) {
  let parent = path.resolve(value);
  const tail: string[] = [];
  while (!fs.existsSync(parent)) {
    tail.unshift(path.basename(parent));
    parent = path.dirname(parent);
  }
  return path.join(fs.realpathSync(parent), ...tail);
}
function reserveDestination(destination: string) {
  // Never merge with or overwrite an existing destination, including empty folders.
  if (fs.existsSync(destination)) throw new Error('Destination already exists. Choose a new folder.');
  fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
  fs.mkdirSync(destination, { mode: 0o700 });
}
function writeNew(root: string, relative: string, bytes: Buffer) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
}
const label = () => new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);

export function createContentBackup({ projectRoot = process.cwd(), destination = path.join(projectRoot, '.content-backups', label()) }: { projectRoot?: string; destination?: string } = {}) {
  projectRoot = fs.realpathSync(projectRoot);
  destination = resolveDestination(destination);
  for (const root of roots) if (inside(destination, path.join(projectRoot, root))) throw new Error('Backup destination must stay outside the content/public/trash folders.');
  const paths = inventory(projectRoot);
  if (!paths.includes('src/content/profile.json')) throw new Error('No profile.json found. Run from the web directory.');
  reserveDestination(destination);
  const files: Entry[] = [];
  for (const relative of paths) {
    const bytes = fs.readFileSync(path.join(projectRoot, relative));
    files.push({ path: relative, size: bytes.length, sha256: hash(bytes) });
    writeNew(destination, 'data/' + relative, bytes);
  }
  const after = inventory(projectRoot);
  if (JSON.stringify(after) !== JSON.stringify(paths) || files.some(entry => hash(fs.readFileSync(path.join(projectRoot, entry.path))) !== entry.sha256)) throw new Error('Content changed during backup. Stop the admin and retry into a new folder. This incomplete backup has no manifest.');
  const manifest = manifestSchema.parse({ version: 1, createdAt: new Date().toISOString(), files });
  writeNew(destination, 'manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  return { destination, manifest };
}

export function verifyContentBackup(backup: string) {
  backup = path.resolve(backup);
  if (fs.lstatSync(backup).isSymbolicLink()) throw new Error('Backup root must not be a symlink.');
  const manifestPath = path.join(backup, 'manifest.json');
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 10 * 1024 * 1024) throw new Error('Invalid backup manifest.');
  const manifest = manifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  const data = path.join(backup, 'data');
  if (fs.lstatSync(data).isSymbolicLink()) throw new Error('Backup data must not be a symlink.');
  const paths = manifest.files.map(entry => safeRelative(entry.path));
  if (new Set(paths).size !== paths.length || !paths.includes('src/content/profile.json')) throw new Error('Duplicate entries or missing profile in backup manifest.');
  if (JSON.stringify(inventory(data)) !== JSON.stringify([...paths].sort())) throw new Error('Backup files differ from the manifest.');
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(path.join(data, entry.path));
    if (bytes.length !== entry.size || hash(bytes) !== entry.sha256) throw new Error(`Backup checksum mismatch: ${entry.path}`);
  }
  return manifest;
}

export function restoreContentBackup({ backup, destination, projectRoot = process.cwd() }: { backup: string; destination: string; projectRoot?: string }) {
  const manifest = verifyContentBackup(backup);
  backup = fs.realpathSync(backup);
  destination = resolveDestination(destination);
  if (inside(destination, backup)) throw new Error('Restore destination must stay outside the backup folder.');
  projectRoot = fs.realpathSync(projectRoot);
  for (const root of roots) if (inside(destination, path.join(projectRoot, root))) throw new Error('Restore destination must stay outside the working content/public/trash folders.');
  reserveDestination(destination);
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(path.join(backup, 'data', entry.path));
    // Recheck immediately before each write if another process edits the backup.
    if (bytes.length !== entry.size || hash(bytes) !== entry.sha256) throw new Error(`Backup changed during restore: ${entry.path}`);
    writeNew(destination, entry.path, bytes);
  }
  return { destination, files: manifest.files.length };
}
