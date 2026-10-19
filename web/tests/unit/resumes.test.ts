// Verifies PDF résumé validation and safe local storage for the admin upload.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { storeResume, syncPublishedResume } from '../../src/lib/admin/resumes';
import {
  storeCertification,
  syncPublishedCertifications,
} from '../../src/lib/admin/certifications';
import { profileSchema } from '../../src/lib/content-schema';

describe('résumé uploads', () => {
  it('stores a PDF under a generated filename', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'portfolio-resume-'));
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
    try {
      const saved = storeResume(pdf, 'my-resume.pdf', root);
      expect(saved).toMatch(/^\/downloads\/resumes\/[0-9a-f-]+\.pdf$/);
      expect(readFileSync(path.join(root, 'resumes', path.basename(saved)))).toEqual(pdf);
      expect(storeResume(pdf, 'another.pdf', root)).not.toBe(saved);
      const publicRoot = path.join(root, 'public');
      const profile = profileSchema.parse({
        ...JSON.parse(readFileSync('src/content/profile.json', 'utf8')),
        resume: saved,
        resumeVisible: false,
      });
      syncPublishedResume(profile, root, publicRoot);
      expect(() => readFileSync(path.join(publicRoot, saved))).toThrow();
      syncPublishedResume({ ...profile, resumeVisible: true }, root, publicRoot);
      expect(readFileSync(path.join(publicRoot, saved))).toEqual(pdf);
      syncPublishedResume(profile, root, publicRoot);
      expect(() => readFileSync(path.join(publicRoot, saved))).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('rejects non-PDF content and oversized files', () => {
    expect(() => storeResume(Buffer.from('not a pdf'), 'resume.pdf', '/tmp')).toThrow();
    expect(() => storeResume(Buffer.from('%PDF-1.4\n%%EOF'), 'resume.txt', '/tmp')).toThrow();
    expect(() => storeResume(Buffer.alloc(5 * 1024 * 1024 + 1), 'resume.pdf', '/tmp')).toThrow();
  });
});

describe('certification PDFs', () => {
  it('publishes only PDFs attached to visible certifications and removes them when hidden', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'portfolio-certification-'));
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
    try {
      const saved = storeCertification(pdf, 'certificate.pdf', root);
      const publicRoot = path.join(root, 'public');
      const profile = profileSchema.parse({
        ...JSON.parse(readFileSync('src/content/profile.json', 'utf8')),
        certifications: [{ name: 'Finance', issuer: 'Institute', visible: false, pdf: saved }],
      });
      syncPublishedCertifications(profile, root, publicRoot);
      expect(() => readFileSync(path.join(publicRoot, saved))).toThrow();
      syncPublishedCertifications(
        { ...profile, certifications: [{ ...profile.certifications[0], visible: true }] },
        root,
        publicRoot,
      );
      expect(readFileSync(path.join(publicRoot, saved))).toEqual(pdf);
      syncPublishedCertifications(profile, root, publicRoot);
      expect(() => readFileSync(path.join(publicRoot, saved))).toThrow();
      expect(() => storeCertification(Buffer.from('not a PDF'), 'certificate.pdf', root)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
