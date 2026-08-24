import React, { useCallback, useMemo, useRef } from 'react';

type Accent = 'pink' | 'blue' | 'lime' | 'pale';

interface ProfileCardProps {
  avatarUrl?: string;
  className?: string;
  enableTilt?: boolean;
  name?: string;
  title?: string;
  accent?: Accent;
  note?: string;
  signal?: string;
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
  className = '',
  enableTilt = true,
  name = 'Change Consultant',
  title = 'Hospitality Consultant',
  accent = 'pink',
  note = 'Human-led recruitment with a close eye on service, timing and fit.',
  signal = 'Human read / careful handover',
}: ProfileCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const accentColor = accentVars[accent];

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
      if (!enableTilt || !wrapRef.current || !shellRef.current) return;
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
      className={`team-card-wrap relative h-full w-full min-w-0 touch-none ${className}`.trim()}
      style={cardStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <article
        ref={shellRef}
        className="team-profile-card group relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-3xl border-ink bg-(--team-accent) p-3.5 text-ink"
      >
        {/* <div className="team-card-blob pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-[38%_62%_52%_48%/45%_38%_62%_55%] bg-ink opacity-0 transition-opacity duration-300" aria-hidden="true" /> */}

        <div className="team-card-photo-frame relative z-10 aspect-square overflow-hidden rounded-[1.35rem] border-3 border-cream bg-cream">
          {avatarUrl ? (
            <img className="team-card-avatar h-full w-full object-cover" src={avatarUrl} alt={`${name} portrait`} loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-8xl text-ink">
              {getInitials(name)}
            </div>
          )}
          <p className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] -rotate-1 rounded-xl bg-citron px-3 py-2 text-[0.65rem] font-black uppercase leading-tight text-ink">
            {signal}
          </p>
          <span className="absolute right-3 top-3 grid h-10 w-10 rotate-3 place-items-center rounded-full bg-cream p-2" aria-hidden="true">
            <img className="h-full w-full object-contain" src="/CH_LOGO.svg" alt="" />
          </span>
        </div>

        <div className="team-card-info relative z-10 px-1 pb-1">
          <h4 className="team-card-name font-serif font-semibold leading-none text-ink">{name}</h4>
          <p className="team-card-title mt-2 w-fit rounded-lg bg-flame px-2.5 py-1.5 text-[0.65rem] font-black uppercase leading-tight text-cream">
            {title}
          </p>
          <p className="mt-2 truncate text-sm font-bold leading-5 text-cocoa" title={note}>{note}</p>
        </div>
      </article>
    </div>
  );
}
