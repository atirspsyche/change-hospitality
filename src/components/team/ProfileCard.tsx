import React, { useCallback, useMemo, useRef } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ArrowUpRight, ChevronUp, Mail, Phone } from 'lucide-react';
import './ProfileCard.css';

type Accent = 'pink' | 'blue' | 'lime' | 'pale';

interface ProfileCardProps {
  avatarUrl?: string;
  avatarSrcSet?: string;
  avatarAlt?: string;
  className?: string;
  enableTilt?: boolean;
  name?: string;
  title?: string;
  accent?: Accent;
  note?: string;
  signal?: string;
  email?: string;
  phone?: string;
}

function ContactLinks({
  name,
  email,
  phone,
  variant,
}: Pick<ProfileCardProps, 'email' | 'phone'> & { name: string; variant: 'icons' | 'details' }) {
  const emailAddress = email?.trim();
  const phoneNumber = phone?.trim();
  const dialNumber = phoneNumber?.replace(/[^+\d]/g, '');
  const links = [
    ...(emailAddress ? [{ href: `mailto:${emailAddress}`, label: `Email ${name}`, value: emailAddress, Icon: Mail }] : []),
    ...(dialNumber ? [{ href: `tel:${dialNumber}`, label: `Call ${name}`, value: phoneNumber, Icon: Phone }] : []),
  ];

  if (!links.length) return null;

  return (
    <div className={`team-contact-links team-contact-links--${variant}`}>
      {links.map(({ href, label, value, Icon }) => (
        <a className="team-contact-link" key={href} href={href} aria-label={`${label}: ${value}`} title={`${label}: ${value}`}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
          {variant === 'details' && <span>{value}</span>}
          {variant === 'details' && <ArrowUpRight className="team-contact-arrow" size={15} aria-hidden="true" />}
        </a>
      ))}
    </div>
  );
}

const accentVars: Record<Accent, string> = {
  pink: 'var(--color-blush)',
  blue: 'var(--color-mist)',
  lime: 'var(--color-citron)',
  pale: 'var(--color-mint)',
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);
const round = (value: number, precision = 3) => parseFloat(value.toFixed(precision));

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileCard({
  avatarUrl,
  avatarSrcSet,
  avatarAlt,
  className = '',
  enableTilt = true,
  name = 'Change Consultant',
  title = 'Hospitality Consultant',
  accent = 'pink',
  note = 'Human-led recruitment with a close eye on service, timing and fit.',
  signal = 'Human read / careful handover',
  email,
  phone,
}: ProfileCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const accentColor = accentVars[accent];
  const fullNote = note?.trim();

  const cardStyle = useMemo(
    () =>
      ({
        '--team-accent': accentColor,
        '--pointer-x': '50%',
        '--pointer-y': '50%',
        '--pointer-from-top': '0.5',
        '--pointer-from-left': '0.5',
        '--rotate-x': '0deg',
        '--rotate-y': '0deg',
        '--card-tilt': '0deg',
      }) as React.CSSProperties,
    [accentColor]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enableTilt || !wrapRef.current || !shellRef.current
        || event.pointerType === 'touch' || shellRef.current.querySelector('[data-team-note-sheet][data-open="true"]')
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = shellRef.current.getBoundingClientRect();
      const percentX = clamp(((event.clientX - rect.left) / rect.width) * 100);
      const percentY = clamp(((event.clientY - rect.top) / rect.height) * 100);
      const centerX = percentX - 50;
      const centerY = percentY - 50;
      const variables: Record<string, string> = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerY / 14))}deg`,
        '--rotate-y': `${round(centerX / 14)}deg`,
        '--card-tilt': `${round(centerX / 26)}deg`,
      };
      Object.entries(variables).forEach(([key, value]) => wrapRef.current?.style.setProperty(key, value));
    },
    [enableTilt]
  );

  const resetTilt = useCallback(() => {
    if (!wrapRef.current) return;
    wrapRef.current.style.setProperty('--pointer-x', '50%');
    wrapRef.current.style.setProperty('--pointer-y', '50%');
    wrapRef.current.style.setProperty('--pointer-from-top', '0.5');
    wrapRef.current.style.setProperty('--pointer-from-left', '0.5');
    wrapRef.current.style.setProperty('--rotate-x', '0deg');
    wrapRef.current.style.setProperty('--rotate-y', '0deg');
    wrapRef.current.style.setProperty('--card-tilt', '0deg');
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`team-card-wrap relative h-full w-full min-w-0 touch-pan-y ${className}`.trim()}
      style={cardStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <Disclosure
        as="article"
        ref={shellRef}
        className={`team-profile-card group relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-3xl border-ink bg-cream p-3.5 text-ink${fullNote ? ' team-profile-card--with-note' : ''}`}
      >
        {({ open, close }) => (
          <>
            <div className="team-card-front flex flex-col gap-3" inert={open} aria-hidden={open || undefined}>
              <div className="team-card-photo-frame relative z-10 aspect-square overflow-hidden rounded-[1.35rem] border-3 border-cream bg-cream">
                {avatarUrl ? (
                  <img className="team-card-avatar h-full w-full object-cover" src={avatarUrl} srcSet={avatarSrcSet} sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw" alt={avatarAlt || `${name} portrait`} width="800" height="800" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-8xl text-ink">
                    {getInitials(name)}
                  </div>
                )}
                <p className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] -rotate-1 rounded-xl bg-(--team-accent) px-3 py-2 text-[0.65rem] font-black uppercase leading-tight text-ink">
                  {signal}
                </p>
                <div className="team-card-contact-stack absolute right-3 top-3">
                  <span className="grid h-10 w-10 rotate-3 place-items-center rounded-full bg-cream p-2" aria-hidden="true">
                    <img className="h-full w-full object-contain" src="/CH_LOGO.svg" alt="" />
                  </span>
                  <ContactLinks name={name} email={email} phone={phone} variant="icons" />
                </div>
              </div>

              <div className="team-card-info relative z-10 px-1 pb-1">
                <h4 className="team-card-name font-serif font-semibold leading-none text-ink">{name}</h4>
                <p className="team-card-title mt-2 w-fit rounded-lg bg-(--team-flame-surface) px-2.5 py-1.5 text-[0.65rem] font-black uppercase leading-tight text-off-white">
                  {title}
                </p>
              </div>
            </div>

            {fullNote && (
              <div
                className="team-note-layer"
                data-open={open}
                data-team-note-sheet
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && open) {
                    event.stopPropagation();
                    close();
                  }
                }}
              >
                <div className="team-note-sheet">
                  <span className="team-note-grip" aria-hidden="true" />
                  <p className="team-note-preview" aria-hidden="true">{fullNote}</p>
                  <DisclosurePanel static className="team-note-panel" inert={!open} aria-hidden={!open}>
                    <header className="team-note-heading">
                      <p className="team-note-kicker">A little about me</p>
                      <h5 className="team-note-name">{name}</h5>
                      <p className="team-note-role">{title}</p>
                    </header>
                    <div
                      className="team-note-scroll"
                      tabIndex={open ? 0 : -1}
                      role="region"
                      aria-label={`About ${name}`}
                      data-lenis-prevent
                    >
                      <p>{fullNote}</p>
                    </div>
                    <ContactLinks name={name} email={email} phone={phone} variant="details" />
                  </DisclosurePanel>
                </div>
                <div className="team-note-controls">
                  <DisclosureButton className="team-note-toggle" onClick={resetTilt} aria-label={`${open ? 'Show less' : 'Show more'} about ${name}`}>
                    <span>{open ? 'Show less' : 'Show more'}</span>
                    <span className="team-note-toggle-icon"><ChevronUp size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  </DisclosureButton>
                </div>
              </div>
            )}
          </>
        )}
      </Disclosure>
    </div>
  );
}
