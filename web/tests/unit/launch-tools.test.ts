import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createContentBackup, restoreContentBackup, verifyContentBackup } from '../../src/lib/content-backup';
import { releaseReadiness, validProductionOrigin } from '../../src/lib/release-readiness';
import { parseResearch, profileSchema, validateRelease } from '../../src/lib/content-schema';

const profile = profileSchema.parse(JSON.parse(fs.readFileSync('src/content/profile.json','utf8')));
const base = JSON.parse(fs.readFileSync('src/content/research/beyond-the-bottom-line.json','utf8'));

describe('release readiness', () => {
  it('reports all blockers together without treating citations or contact as required', () => {
    const report = releaseReadiness({ ...profile, isPlaceholder: true, contact: undefined, contactLinks: [] }, parseResearch([{ ...base, status: 'sample' }]), undefined);
    expect(report.ready).toBe(false);
    expect(report.checks.filter(check => !check.ok).map(check => check.id)).toEqual(['profile','address','research']);
    expect(report.notices).toContain('No contact email or links are configured. Add them in Admin → Profile if visitors should be able to contact you.');
    const approved = { ...profile, isPlaceholder: false };
    const records = parseResearch([{ ...base, status: 'published', sources: [] }]);
    expect(releaseReadiness(approved, records, 'https://portfolio.test').ready).toBe(true);
    expect(() => validateRelease(approved, records, 'https://portfolio.test')).not.toThrow();
  });
  it('rejects invalid origins in both preflight and the actual release guard', () => {
    for (const origin of [undefined, '', 'http://portfolio.test', 'https://portfolio.test/research', 'https://portfolio.test/?q=x', 'https://portfolio.test/#part', 'https://user:secret@portfolio.test']) {
      expect(validProductionOrigin(origin)).toBe(false);
      expect(() => validateRelease({ ...profile, isPlaceholder: false }, parseResearch([{ ...base, status: 'published' }]), origin)).toThrow('SITE_URL');
    }
    expect(validProductionOrigin('https://portfolio.test/')).toBe(true);
  });
});

describe('content recovery', () => {
  let temp: string, project: string, backup: string, restore: string;
  const original = new Map<string, Buffer>([
    ['src/content/profile.json', Buffer.from(JSON.stringify(profile))],
    ['src/content/research/note.json', Buffer.from(JSON.stringify(base))],
    ['src/content/images/image.original.webp', Buffer.from([0,255,42,10])],
    ['src/content/workbooks/model.xlsx', Buffer.from([1,2,3,4])],
    ['public/downloads/resume.pdf', Buffer.from('Résumé asset')],
    ['.admin-trash/deleted.json', Buffer.from(JSON.stringify(base))],
  ]);
  beforeEach(() => {
    temp = fs.mkdtempSync(path.join(tmpdir(),'portfolio-recovery-')); project = path.join(temp,'project'); backup = path.join(temp,'snapshot'); restore = path.join(temp,'recovered');
    for (const [relative, bytes] of original) { const file = path.join(project,relative); fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes); }
  });
  afterEach(() => fs.rmSync(temp,{recursive:true,force:true}));
  it('round-trips private originals, workbooks, public files and trash byte for byte without changing the project', () => {
    const snapshot = createContentBackup({projectRoot:project,destination:backup});
    expect(verifyContentBackup(backup).files).toHaveLength(original.size);
    expect(snapshot.manifest.files.map(file=>file.path)).toEqual([...original.keys()].sort());
    expect(restoreContentBackup({backup,destination:restore}).files).toBe(original.size);
    for(const [relative,bytes] of original) {
      expect(fs.readFileSync(path.join(restore,relative)).equals(bytes)).toBe(true);
      expect(fs.readFileSync(path.join(project,relative)).equals(bytes)).toBe(true);
    }
  });
  it('refuses to overwrite existing backup or recovery folders', () => {
    createContentBackup({projectRoot:project,destination:backup});
    expect(()=>createContentBackup({projectRoot:project,destination:backup})).toThrow('already exists');
    expect(()=>restoreContentBackup({backup,destination:project})).toThrow('already exists');
    fs.mkdirSync(restore);
    expect(()=>restoreContentBackup({backup,destination:restore})).toThrow('already exists');
    for(const [relative,bytes] of original) expect(fs.readFileSync(path.join(project,relative)).equals(bytes)).toBe(true);
  });
  it('refuses corrupted backups before creating a recovery folder', () => {
    createContentBackup({projectRoot:project,destination:backup});
    fs.writeFileSync(path.join(backup,'data/src/content/workbooks/model.xlsx'),'corrupted');
    expect(()=>restoreContentBackup({backup,destination:restore})).toThrow('checksum');
    expect(fs.existsSync(restore)).toBe(false);
  });
  it('rejects traversal and duplicate manifest entries before writing', () => {
    createContentBackup({projectRoot:project,destination:backup});
    const manifestPath=path.join(backup,'manifest.json'); const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const first=manifest.files[0];manifest.files.push({...first,path:'src/content/../../outside'});fs.writeFileSync(manifestPath,JSON.stringify(manifest));
    expect(()=>restoreContentBackup({backup,destination:restore})).toThrow('Unsafe backup path');
    manifest.files.pop();manifest.files.push(first);fs.writeFileSync(manifestPath,JSON.stringify(manifest));
    expect(()=>restoreContentBackup({backup,destination:restore})).toThrow('Duplicate');
    expect(fs.existsSync(restore)).toBe(false);
  });
  it('rejects symlinked content and backup files', () => {
    fs.symlinkSync(path.join(project,'src/content/profile.json'),path.join(project,'src/content/link.json'));
    expect(()=>createContentBackup({projectRoot:project,destination:backup})).toThrow('Symlinks');
    fs.unlinkSync(path.join(project,'src/content/link.json'));
    createContentBackup({projectRoot:project,destination:backup});
    const file=path.join(backup,'data/src/content/profile.json');fs.unlinkSync(file);fs.symlinkSync(path.join(project,'src/content/profile.json'),file);
    expect(()=>restoreContentBackup({backup,destination:restore})).toThrow('Symlinks');
    expect(fs.existsSync(restore)).toBe(false);
  });
  it('rejects restoring private files under the working public directory', () => {
    createContentBackup({projectRoot:project,destination:backup});
    expect(()=>restoreContentBackup({backup,destination:path.join(project,'public/recovery'),projectRoot:project})).toThrow('outside');
    expect(fs.existsSync(path.join(project,'public/recovery'))).toBe(false);
  });
  it('does not mark a changing-content snapshot as complete', () => {
    const write=fs.writeFileSync;let changed=false;
    const spy=vi.spyOn(fs,'writeFileSync').mockImplementation((...args: Parameters<typeof fs.writeFileSync>) => {
      write(...args);
      if(!changed && String(args[0]).startsWith(path.join(fs.realpathSync(backup),'data'))) {
        changed=true;write(path.join(project,path.relative(path.join(fs.realpathSync(backup),'data'),String(args[0]))),'Changed while copying');
      }
    });
    try { expect(()=>createContentBackup({projectRoot:project,destination:backup})).toThrow('changed during backup'); }
    finally {spy.mockRestore();}
    expect(changed).toBe(true);
    expect(fs.existsSync(path.join(backup,'manifest.json'))).toBe(false);
  });
  it('keeps snapshots out of public/content, including through a parent symlink', () => {
    expect(()=>createContentBackup({projectRoot:project,destination:path.join(project,'public/snapshot')})).toThrow('outside');
    const alias=path.join(temp,'public-alias');fs.symlinkSync(path.join(project,'public'),alias);
    expect(()=>createContentBackup({projectRoot:project,destination:path.join(alias,'snapshot')})).toThrow('outside');
    expect(fs.existsSync(path.join(project,'public/snapshot'))).toBe(false);
  });
});
