import { loadContent } from "../src/lib/content";
const { profile, research, mode } = loadContent();
console.log(`Validated ${profile.displayName}: ${research.length} visible research notes (${mode}).`);
