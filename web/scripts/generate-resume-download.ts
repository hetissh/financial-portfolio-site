// Copies only the selected uploaded résumé into the public static export.
import { contentRoot, readProfileFile } from '../src/lib/content';
import { profileSchema } from '../src/lib/content-schema';
import { syncPublishedResume } from '../src/lib/admin/resumes';

const root = contentRoot();
const selected = syncPublishedResume(profileSchema.parse(readProfileFile(root)), root);
console.log(selected ? 'Prepared the visible résumé download.' : 'No uploaded résumé is public.');
