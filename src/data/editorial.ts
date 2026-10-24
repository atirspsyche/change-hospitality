import type { LocalImage } from '../lib/sanityImages';

export interface PublicContacts {
  generalEmail: string;
  recruitmentEmail: string;
  franchisingEmail: string;
  timesheetsEmail: string;
  phone: string;
  socialLinks: Array<{ label: string; href: string }>;
}
export interface ClientLogo { _id: string; name: string; marquee: boolean; logo?: LocalImage }
export interface Testimonial { _id: string; name: string; role?: string; quote: string; client?: ClientLogo }
export interface PolicyLink { _id: string; label: string; href: string }
export interface TemporaryWork {
  benefits: Array<{ title: string; text: string }>;
  faqs: Array<{ question: string; paragraphs: string[]; contact?: 'team' | 'timesheets' }>;
}
export const telephoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;