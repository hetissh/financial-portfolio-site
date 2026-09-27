import type { Profile } from './content-schema';
export const aboutDefaults = { label: '02 / THE PERSON BEHIND THE NOTES', heading: 'Curiosity is\nthe', accent: 'starting point.', principles: ['Question the obvious.', 'Follow the evidence.', 'Make the complex clear.'] };
export const contactDefaults = { label: '03 / KEEP THE CONVERSATION GOING', heading: 'Good questions\ndeserve', accent: 'good company.', intro: 'Have a perspective to share or a question worth exploring? Get in touch.', emailLabel: 'Email me', emailSubject: 'Hello from your research notebook' };
export const profileAbout = (profile: Profile) => ({ ...aboutDefaults, ...profile.about });
export const profileContact = (profile: Profile) => ({ ...contactDefaults, ...profile.contact });
export function contactEmailHref(email: string, subject: string) { return `mailto:${email}?subject=${encodeURIComponent(subject)}`; }
