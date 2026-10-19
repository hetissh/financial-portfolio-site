// Creates the only two admin accounts once from private environment settings.
import { initializeAdmins } from '../src/lib/admin/auth-store';

const required = [
  'ADMIN_ONE_EMAIL',
  'ADMIN_ONE_PASSWORD',
  'ADMIN_TWO_EMAIL',
  'ADMIN_TWO_PASSWORD',
] as const;
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required.`);
initializeAdmins([
  {
    name: process.env.ADMIN_ONE_NAME || 'Admin One',
    email: process.env.ADMIN_ONE_EMAIL!,
    password: process.env.ADMIN_ONE_PASSWORD!,
  },
  {
    name: process.env.ADMIN_TWO_NAME || 'Admin Two',
    email: process.env.ADMIN_TWO_EMAIL!,
    password: process.env.ADMIN_TWO_PASSWORD!,
  },
]);
console.log('Created the two admin accounts in the private auth file.');
