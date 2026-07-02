import React, { useCallback, useMemo, useRef } from 'react';

type Accent = 'pink' | 'blue' | 'lime' | 'pale';

interface ProfileCardProps {
  avatarUrl?: string;
  iconUrl?: string;
  grainUrl?: string;
  innerGradient?: string;
  behindGlowEnabled?: boolean;
  behindGlowColor?: string;
  behindGlowSize?: string;
  className?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;
  miniAvatarUrl?: string;
  name?: string;
  title?: string;
  handle?: string;
  status?: string;
  contactText?: string;
  showUserInfo?: boolean;
  accent?: Accent;
  note?: string;
  signal?: string;
  division?: string;
  onContactClick?: () => void;
}

const accentVars: Record<Accent, string> = {
  pink: 'var(--color-story-pink)',
  blue: 'var(--color-story-blue)',
  lime: 'var(--color-story-lime)',
  pale: 'var(--color-story-pale)',
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);
const round = (value: number, precision = 3) => parseFloat(value.toFixed(precision));

function adjust(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) {
  return round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));
}

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
  handle = 'change-hospitality',
  status = 'Available for thoughtful introductions',
  contactText = 'Meet consultant',
  showUserInfo = true,
  accent = 'pink',
  note = 'Human-led recruitment with a close eye on service, timing and fit.',
  signal = 'Human read / careful handover',
  division = 'Hospitality',
  miniAvatarUrl,
  onContactClick,
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
        '--background-x': '50%',
        '--background-y': '50%',
        '--pointer-from-center': '0',
        '--pointer-from-top': '0.5',
        '--pointer-from-left': '0.5',
        '--rotate-x': '0deg',
        '--rotate-y': '0deg',
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
        '--background-x': `${adjust(percentX, 0, 100, 34, 66)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 34, 66)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerY / 8))}deg`,
        '--rotate-y': `${round(centerX / 8)}deg`,
      };
      Object.entries(variables).forEach(([key, value]) => wrapRef.current?.style.setProperty(key, value));
    },
    [enableTilt]
  );

  const resetTilt = useCallback(() => {
    if (!wrapRef.current) return;
    wrapRef.current.style.setProperty('--pointer-x', '50%');
    wrapRef.current.style.setProperty('--pointer-y', '50%');
    wrapRef.current.style.setProperty('--pointer-from-center', '0');
    wrapRef.current.style.setProperty('--pointer-from-top', '0.5');
    wrapRef.current.style.setProperty('--pointer-from-left', '0.5');
    wrapRef.current.style.setProperty('--rotate-x', '0deg');
    wrapRef.current.style.setProperty('--rotate-y', '0deg');
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`team-card-wrap relative touch-none ${className}`.trim()}
      style={cardStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <div className="team-card-glow absolute inset-0 -z-10 opacity-0 transition-opacity duration-300" aria-hidden="true" />
      <article ref={shellRef} className="team-profile-card group relative isolate grid min-h-[60vh] overflow-hidden border-2 border-story-black bg-story-black text-story-pale">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--color-story-pale)_0%,color-mix(in_srgb,var(--team-accent)_56%,var(--color-story-pale))_44%,var(--color-story-black)_100%)]" aria-hidden="true" />
        <div className="team-card-wash absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="team-card-lines absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="team-card-logo-aura absolute right-0 top-0 z-10 h-34 w-34 opacity-0 transition-opacity duration-300" aria-hidden="true" />
        <div className="team-card-mark absolute right-4 top-4 z-20 grid h-18 w-18 place-items-center border-2 border-story-black bg-story-pale font-serif text-5xl font-bold text-story-black">
          C
        </div>

        <div className="relative z-10 grid h-full grid-rows-[auto_auto_auto_auto_1fr] gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            {/* <div className="team-card-division border-2 border-story-black bg-(--team-accent) px-3 py-2 text-xs font-black uppercase leading-none text-story-black">
              {division}
            </div> */}
            <div className="team-card-handle mr-18 w-full rounded-full border-2 border-story-black bg-story-pale px-3 py-2 text-xs font-black uppercase leading-none text-story-black">
              @{handle}
            </div>
          </div>

          <div className="team-card-photo-frame relative mx-1 mt-1 aspect-4/3 overflow-hidden border-2 border-story-black bg-story-pale">
            {avatarUrl ? (
              <img className="team-card-avatar h-full w-full object-cover" src={avatarUrl} alt={`${name} portrait`} loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-(--team-accent) font-serif text-8xl text-story-black">
                {getInitials(name)}
              </div>
            )}
            <div className="team-card-photo-veil absolute inset-0" aria-hidden="true" />
          </div>

          <div className="team-card-identity border-2 border-story-black bg-story-pale p-3 text-story-black">
            <h2 className="team-card-name font-serif text-4xl font-semibold leading-none text-story-black">{name}</h2>
            <p className="team-card-title mt-2 w-fit border-2 border-story-black bg-story-lime px-3 py-1 text-xs font-black uppercase leading-tight text-story-black">
              {title}
            </p>
          </div>

          <div className="team-card-signal border-2 border-story-black bg-story-pale p-3 text-story-black">
            <p className="text-xs font-black uppercase text-story-black/62">Signal</p>
            <p className="mt-1 text-sm font-bold leading-5">{signal}</p>
          </div>

          {showUserInfo && (
            <div className="team-card-info relative z-20 grid gap-3 border-2 border-story-black bg-story-pale p-3 text-story-black">
              <p className="text-sm font-semibold leading-6 text-story-black/76">{note}</p>
              <div className="grid gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-story-black bg-story-lime">
                    {miniAvatarUrl || avatarUrl ? (
                      <img className="h-full w-full object-cover" src={miniAvatarUrl || avatarUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-sm font-black">{getInitials(name)}</span>
                    )}
                  </div>
                  <p className="min-w-0 text-xs font-bold leading-5 text-story-black/70">{status}</p>
                </div>
                <button
                  className="w-full border-2 border-story-black bg-story-black px-4 py-3 text-xs font-black uppercase text-story-lime transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1"
                  type="button"
                  aria-label={`${contactText} ${name}`}
                  onClick={onContactClick}
                >
                  {contactText}
                </button>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
