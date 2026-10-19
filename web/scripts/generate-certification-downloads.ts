// Copies only PDFs attached to visible certifications into the static export.
import { contentRoot, readProfileFile } from '../src/lib/content';
import { profileSchema } from '../src/lib/content-schema';
import { syncPublishedCertifications } from '../src/lib/admin/certifications';

const root = contentRoot();
const count = syncPublishedCertifications(profileSchema.parse(readProfileFile(root)), root);
console.log(`Prepared ${count} visible certification PDF${count === 1 ? '' : 's'}.`);
