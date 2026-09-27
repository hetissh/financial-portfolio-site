import path from 'node:path';
import { createContentBackup, restoreContentBackup, verifyContentBackup } from '../src/lib/content-backup';

const [action, ...args] = process.argv.slice(2);
try {
  if (action === 'restore') {
    if (args.length !== 2) throw new Error('Usage: npm run content:restore -- /absolute/backup /absolute/NEW-restore-folder');
    const result = restoreContentBackup({ backup: path.resolve(args[0]), destination: path.resolve(args[1]) });
    console.log(`Restored ${result.files} verified files into ${result.destination}.`);
    console.log('Working content was not overwritten. Compare this folder before manually recovering files.');
  } else {
    if (action || args.length) throw new Error('Usage: npm run content:backup (run from web/)');
    const result = createContentBackup();
    verifyContentBackup(result.destination);
    console.log(`Verified backup: ${result.destination}`);
    console.log(`${result.manifest.files.length} files: private content, public assets and any local trash. Keep a separate off-device copy.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
