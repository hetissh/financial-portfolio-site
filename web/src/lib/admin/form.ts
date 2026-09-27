// Client-safe helpers for the local admin: form drafts, conversion to content records,
// and mapping validation issues back to fields. No filesystem access here.
import type { RichDocument } from "../rich-content";
import { aboutDefaults, contactDefaults, profileAbout, profileContact } from "../profile-sections";
import { themeArtwork } from "../artwork";
import type { Profile, Research, Attachment } from "@/lib/content-schema";

export type ContentIssue = { path: string; message: string };
export type SectionDraft = { key: number; heading: string; paragraphs: string; body?: RichDocument; prompts: string };
export type SourceDraft = { key: number; title: string; url: string };
export type LinkDraft = { key: number; label: string; href: string };
export type ResearchDraft = {
  id: string; slug: string; title: string; summary: string; category: string; tags: string;
  publishedAt: string; updatedAt: string; status: Research["status"]; featuredOrder: string; theme: Research["theme"];
  cover: Research["cover"]; coverWord: string; coverColor: string;
  question: string; sections: SectionDraft[]; sources: SourceDraft[]; download: string; attachments: Attachment[];
};
export type ProfileDraft = {
  displayName: string; monogram: string; role: string; headline: string; headlineAccent: string; intro: string;
  about: NonNullable<Profile["about"]>; contact: Omit<NonNullable<Profile["contact"]>, "email"> & { email: string }; bio: string; approved: boolean; contactLinks: LinkDraft[]; resume: string;
};

let lastKey = 0;
export const nextKey = () => ++lastKey;

export function slugify(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}
export const splitParagraphs = (value: string) => value.split(/\n\s*\n/).map((item) => item.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
export const joinParagraphs = (items: string[] = []) => items.join("\n\n");
export const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
export const splitTags = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const optional = (value: string) => value.trim() || undefined;
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const emptySection = (): SectionDraft => ({ key: nextKey(), heading: "", paragraphs: "", prompts: "" });
export const emptySource = (): SourceDraft => ({ key: nextKey(), title: "", url: "" });
export const emptyLink = (): LinkDraft => ({ key: nextKey(), label: "", href: "" });

export function researchToDraft(record?: Research): ResearchDraft {
  return {
    id: record?.id ?? "", slug: record?.slug ?? "", title: record?.title ?? "", summary: record?.summary ?? "",
    category: record?.category ?? "", tags: record?.tags.join(", ") ?? "",
    publishedAt: record?.publishedAt ?? today(), updatedAt: record?.updatedAt ?? "",
    status: record?.status ?? "draft", featuredOrder: record?.featuredOrder?.toString() ?? "", theme: record?.theme ?? "forest",
    cover: record?.cover, coverWord: record?.cover?.word ?? themeArtwork.find(p => p.id === (record?.theme ?? "forest"))!.word, coverColor: record?.cover?.color ?? themeArtwork.find(p => p.id === (record?.theme ?? "forest"))!.color,
    question: record?.question ?? "",
    sections: record?.sections.map((section) => ({ key: nextKey(), heading: section.heading, paragraphs: joinParagraphs(section.paragraphs), body: section.body, prompts: (section.prompts ?? []).join("\n") })) ?? [emptySection()],
    sources: record?.sources.map((source) => ({ key: nextKey(), ...source })) ?? [],
    download: record?.download ?? "", attachments: record?.attachments ?? [],
  };
}
/** Converts a draft into a candidate record. The server validates the result. */
export function draftToResearch(draft: ResearchDraft) {
  const order = draft.featuredOrder.trim();
  return {
    id: draft.id, slug: draft.slug.trim(), title: draft.title, summary: draft.summary, category: draft.category,
    tags: splitTags(draft.tags), publishedAt: draft.publishedAt.trim(), updatedAt: optional(draft.updatedAt),
    status: draft.status, featuredOrder: order === "" ? undefined : Number(order), theme: draft.theme, cover: draft.cover, question: draft.question,
    sections: draft.sections.map((section) => {
      const prompts = splitLines(section.prompts);
      return { heading: section.heading, paragraphs: section.body ? [] : splitParagraphs(section.paragraphs), body: section.body, prompts: prompts.length ? prompts : undefined };
    }),
    sources: draft.sources.filter((source) => source.title.trim() || source.url.trim()).map((source) => ({ title: source.title, url: source.url.trim() })),
    download: optional(draft.download), attachments: draft.attachments,
  };
}
export function profileToDraft(profile: Profile): ProfileDraft {
  return {
    about: profileAbout(profile), contact: { ...profileContact(profile), email: profile.contact?.email ?? "" }, displayName: profile.displayName, monogram: profile.monogram, role: profile.role, headline: profile.headline,
    headlineAccent: profile.headlineAccent ?? "", intro: profile.intro, bio: joinParagraphs(profile.bio), approved: !profile.isPlaceholder,
    contactLinks: profile.contactLinks.map((link) => ({ key: nextKey(), ...link })), resume: profile.resume ?? "",
  };
}
export function draftToProfile(draft: ProfileDraft) {
  return {
    displayName: draft.displayName, monogram: draft.monogram, role: draft.role, headline: draft.headline,
    headlineAccent: optional(draft.headlineAccent), intro: draft.intro, bio: splitParagraphs(draft.bio), isPlaceholder: !draft.approved,
    contactLinks: draft.contactLinks.filter((link) => link.label.trim() || link.href.trim()).map((link) => ({ label: link.label, href: link.href.trim() })),
    resume: optional(draft.resume),
    about: JSON.stringify(draft.about) === JSON.stringify(aboutDefaults) ? undefined : { ...draft.about, principles: draft.about.principles.map(p => p.trim()).filter(Boolean) },
    contact: !draft.contact.email.trim() && Object.entries(contactDefaults).every(([key, value]) => draft.contact[key as keyof typeof contactDefaults] === value) ? undefined : { ...draft.contact, email: optional(draft.contact.email) },
  };
}

// Text areas hold whole lists (one tag, paragraph, or prompt per entry), so an issue
// at `sections.0.paragraphs.2` belongs to the `sections.0.paragraphs` field.
const textLists = new Set(["tags", "paragraphs", "prompts", "bio"]);
export function issueField(path: string) {
  const parts = path.split(".");
  if (parts[0] === "sections" && parts[2] === "body") return `sections.${parts[1]}.paragraphs`;
  if (parts[0] === "about" && parts[1] === "principles") return "about.principles";
  if (parts.length > 1 && /^\d+$/.test(parts.at(-1)!) && textLists.has(parts.at(-2)!)) parts.pop();
  return parts.join(".");
}
export const fieldId = (field: string) => `field-${field.replaceAll(".", "-")}`;

const labels: Record<string, string> = {
  id: "ID", slug: "URL slug", title: "Title", summary: "Summary", category: "Category", tags: "Tags", publishedAt: "Published date",
  updatedAt: "Updated date", status: "Status", featuredOrder: "Home order", theme: "Illustration", question: "Guiding question",
  sections: "Sections", heading: "Heading", paragraphs: "Paragraphs", prompts: "Prompts", sources: "Sources", url: "URL", download: "Download", attachments: "Sheets & models",
  displayName: "Name", monogram: "Monogram", role: "Role", headline: "Headline", headlineAccent: "Headline accent", intro: "Introduction",
  bio: "Biography", isPlaceholder: "Approval", contactLinks: "Contact links", label: "Label", href: "Link", resume: "Résumé",
};
const listItems: Record<string, string> = { sections: "Section", sources: "Source", contactLinks: "Contact link", attachments: "Sheet" };
export function describeField(field: string) {
  const [first, index, child] = field.split(".");
  if (first === "about" || first === "contact") return `${first === "about" ? "About" : "Contact"} · ${index === "email" ? "Email" : index === "intro" ? "Introduction" : index === "principles" ? "Principles" : index === "accent" ? "Heading accent" : index === "emailLabel" ? "Email link label" : index === "emailSubject" ? "Email subject" : index ?? "Section"}`;
  if (first === "cover") return `Card artwork${index ? ` · ${index === "word" ? "Word" : index === "color" ? "Background colour" : index === "foregroundColor" ? "Foreground colour" : index === "foregroundOpacity" ? "Foreground opacity" : "Variation"}` : ""}`;
  if (listItems[first] && index !== undefined) return `${listItems[first]} ${Number(index) + 1}${child ? ` · ${labels[child] ?? child}` : ""}`;
  return labels[first] ?? (first || "Record");
}
export function groupIssues(issues: ContentIssue[]) {
  const map = new Map<string, string[]>();
  for (const issue of issues) {
    const field = issueField(issue.path);
    map.set(field, [...(map.get(field) ?? []), issue.message]);
  }
  return map;
}
