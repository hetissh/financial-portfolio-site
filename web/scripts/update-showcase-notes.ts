import { updateShowcaseNotes } from '../src/lib/showcase-notes';
const change = process.argv.slice(2).join(' ').trim();
await updateShowcaseNotes({ change: change || undefined });
console.log('Updated the same three sample showcase notes. Other notes and profile settings were kept.');
