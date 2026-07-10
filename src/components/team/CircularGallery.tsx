import { useEffect, useRef } from 'react';

interface GalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps {
  items?: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  font?: string;
  fontUrl?: string;
  scrollSpeed?: number;
  scrollEase?: number;
}

const fallbackItems = [
  { image: '/home_sequence/Untitled_Artwork-1.png', text: 'Story frame' },
  { image: '/home_sequence/Untitled_Artwork-4.png', text: 'Service detail' },
  { image: '/home_sequence/Untitled_Artwork-8.png', text: 'A clean handover' },
];

export default function CircularGallery({
  items,
  textColor = 'var(--color-cream)',
  borderColor = 'var(--color-blush)',
  scrollSpeed = 1.8,
}: CircularGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const galleryItems = items?.length ? items : fallbackItems;
  const repeatedItems = [...galleryItems, ...galleryItems];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const startOffset = Math.max(0, (track.scrollWidth - track.clientWidth) / 4);
    track.scrollLeft = startOffset;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      track.scrollBy({ left: event.deltaY * scrollSpeed, behavior: 'smooth' });
    };

    track.addEventListener('wheel', onWheel, { passive: false });
    return () => track.removeEventListener('wheel', onWheel);
  }, [scrollSpeed]);

  const moveBy = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.min(track.clientWidth * 0.75, 720), behavior: 'smooth' });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { active: true, startX: event.clientX, scrollLeft: track.scrollLeft };
    track.setPointerCapture(event.pointerId);
    track.dataset.dragging = 'true';
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !dragState.current.active) return;
    const distance = event.clientX - dragState.current.startX;
    track.scrollLeft = dragState.current.scrollLeft - distance;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    dragState.current.active = false;
    if (!track) return;
    track.releasePointerCapture(event.pointerId);
    delete track.dataset.dragging;
  };

  return (
    <div className="cartoon-gallery" style={{ '--gallery-text': textColor, '--gallery-frame': borderColor } as React.CSSProperties}>
      <div className="cartoon-gallery-actions" aria-hidden="false">
        <button type="button" aria-label="Previous gallery image" onClick={() => moveBy(-1)}>
          Back
        </button>
        <button type="button" aria-label="Next gallery image" onClick={() => moveBy(1)}>
          Next
        </button>
      </div>

      <div
        className="cartoon-gallery-track"
        ref={trackRef}
        role="region"
        tabIndex={0}
        aria-label="Image gallery. Use buttons, drag, or horizontal scrolling to explore."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {repeatedItems.map((item, index) => (
          <article
            className="cartoon-gallery-card"
            key={`${item.text}-${index}`}
            style={{ '--frame-rotate': `${index % 2 === 0 ? -4 : 4}deg`, '--image-rotate': `${index % 3 === 0 ? 1.5 : -1.25}deg` } as React.CSSProperties}
          >
            <div className="cartoon-gallery-frame">
              <img src={item.image} alt={item.text} loading="lazy" draggable={false} />
            </div>
            <h3>{item.text}</h3>
          </article>
        ))}
      </div>

      <style>{`
        .cartoon-gallery {
          position: relative;
          height: 100%;
          color: var(--gallery-text);
        }

        .cartoon-gallery-actions {
          position: absolute;
          right: min(4vw, 4rem);
          top: 0.5rem;
          z-index: 3;
          display: flex;
          gap: 0.7rem;
        }

        .cartoon-gallery-actions button {
          border-radius: 1rem;
          background: var(--color-cream);
          color: var(--color-ink);
          padding: 0.85rem 1.1rem;
          font-size: 0.82rem;
          font-weight: 900;
          text-transform: uppercase;
          transition: transform 280ms var(--ease-cartoon), background-color 220ms ease;
        }

        .cartoon-gallery-actions button:hover,
        .cartoon-gallery-actions button:focus-visible {
          background: var(--color-citron);
          transform: translateY(-0.2rem) rotate(-2deg);
        }

        .cartoon-gallery-track {
          display: flex;
          height: 100%;
          gap: clamp(1.3rem, 3vw, 3rem);
          align-items: center;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 5.5rem max(1.5rem, calc((100vw - 80rem) / 2)) 3rem;
          cursor: grab;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
          touch-action: pan-y;
        }

        .cartoon-gallery-track::-webkit-scrollbar {
          display: none;
        }

        .cartoon-gallery-track[data-dragging='true'] {
          cursor: grabbing;
          scroll-snap-type: none;
        }

        .cartoon-gallery-card {
          position: relative;
          flex: 0 0 clamp(18rem, 28vw, 31rem);
          scroll-snap-align: center;
          transform: rotate(var(--image-rotate));
          transition: transform 320ms var(--ease-cartoon);
        }

        .cartoon-gallery-card:hover,
        .cartoon-gallery-card:focus-within {
          transform: translateY(-0.7rem) rotate(calc(var(--image-rotate) * -1));
        }

        .cartoon-gallery-frame {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 1.4rem;
        }

        .cartoon-gallery-frame::before {
          position: absolute;
          inset: -0.85rem;
          z-index: 0;
          border: 0.78rem solid var(--gallery-frame);
          border-radius: 1.55rem;
          content: '';
          transform: translate(0.55rem, 0.45rem) rotate(var(--frame-rotate));
        }

        .cartoon-gallery-frame img {
          position: relative;
          z-index: 1;
          height: 100%;
          width: 100%;
          border-radius: 1.15rem;
          object-fit: cover;
          user-select: none;
        }

        .cartoon-gallery-card h3 {
          margin-top: 1.25rem;
          color: var(--gallery-text);
          font-family: var(--font-serif);
          font-size: clamp(1.6rem, 3vw, 3.2rem);
          line-height: 0.92;
          text-align: center;
        }

        @media (max-width: 767px) {
          .cartoon-gallery-actions {
            left: 1rem;
            right: auto;
            top: 0;
          }

          .cartoon-gallery-track {
            padding-inline: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
