// Checks the purpose-comment convention for maintained code during CI.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const codeExtension = /\.(?:css|js|mjs|ts|tsx)$/;
const checkedFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'content' && path.relative(root, directory) === 'src') continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filePath);
    else if (entry.isFile() && codeExtension.test(entry.name)) checkedFiles.push(filePath);
  }
}

for (const directory of ['src', 'scripts', 'tests']) collect(path.join(root, directory));
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && codeExtension.test(entry.name) && entry.name !== 'next-env.d.ts') {
    checkedFiles.push(path.join(root, entry.name));
  }
}

const missing = checkedFiles.filter((filePath) => {
  const source = fs
    .readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();
  return !source.startsWith('//') && !source.startsWith('/*');
});

if (missing.length) {
  console.error(
    'Missing opening purpose comments:\n' +
      missing.map((file) => path.relative(root, file)).join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(`Opening purpose comments found in ${checkedFiles.length} maintained code files.`);
}
