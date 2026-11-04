import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from "@headlessui/react";
import { useEffect, useId, useState, type CSSProperties } from "react";
import type { FranchiseLocation } from "../data/franchiseLocations";
import { telephoneHref } from "../data/editorial";
import "./FranchiseMap.css";

function OfficeMarker({
  location,
  open,
  close,
}: {
  location: FranchiseLocation;
  open: boolean;
  close: (element?: HTMLElement) => void;
}) {
  const panelId = useId();
  const [previewing, setPreviewing] = useState(false);
  const visible = open || previewing;

  useEffect(() => {
    if (!previewing) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewing(false);
    };
    document.addEventListener("keydown", dismiss, true);
    return () => document.removeEventListener("keydown", dismiss, true);
  }, [previewing]);

  return (
    <div
      className="office-marker__content"
      data-visible={visible || undefined}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof HTMLElement && !event.currentTarget.contains(next)) {
          setPreviewing(false);
          close(next);
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPreviewing(true);
      }}
      onPointerLeave={() => setPreviewing(false)}
    >
      <PopoverButton
        className="office-marker__button"
        aria-label={`${location.name}${location.headOffice ? " head office" : " office"}: view office details`}
        aria-expanded={visible}
        aria-controls={panelId}
      >
        <span className="office-marker__dot" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" focusable="false">
            <path
              d="M24 5C36 2 45 13 43 26C42 39 29 46 17 41C4 37 1 22 8 12C12 6 20 3 29 6"
              pathLength="1"
            />
          </svg>
          <span />
        </span>
        <span className="office-marker__label" aria-hidden="true">
          {location.name}
          {location.headOffice && <span className="office-marker__hq">Head office</span>}
        </span>
      </PopoverButton>
      <PopoverPanel
        static
        id={panelId}
        className="office-marker__card"
        aria-hidden={!visible}
        inert={!visible}
      >
        <span className="office-marker__card-tag">
          {location.headOffice ? "Where it all started" : "Your local Change team"}
        </span>
        <h3>{location.name}</h3>
        <p className="office-marker__card-type">
          {location.headOffice ? "Head office" : "Franchise office"}
        </p>
        <svg className="office-marker__underline" viewBox="0 0 180 12" fill="none" aria-hidden="true">
          <path d="M3 6C44 0 111 10 177 4M22 11C68 6 113 8 151 9" />
        </svg>
        <p className="office-marker__address">{location.address}</p>
        <a
          className="office-marker__phone"
          href={telephoneHref(location.phone)}
          aria-label={`Call ${location.name} office on ${location.phone}`}
        >{location.phone}</a>
      </PopoverPanel>
    </div>
  );
}

export default function FranchiseMap({ locations, compact = false }: { locations: FranchiseLocation[]; compact?: boolean }) {
  return (
    <figure className={`franchise-map${compact ? " franchise-map--compact" : ""}`} aria-label="Change Hospitality office locations" data-franchise-map>
      <div className="franchise-map__heading" aria-hidden="true">
        <span>Good people.<br />Local knowledge.</span>
        <svg viewBox="0 0 90 70" fill="none" focusable="false">
          <path d="M4 4C66 0 87 30 61 58M46 44L59 62L78 52" />
        </svg>
      </div>
      <PopoverGroup className="franchise-map__art">
        <svg
          className="franchise-map__illustration"
          viewBox="0 0 600 849"
          role="img"
          aria-label="Illustrated map of the United Kingdom, with north at the top"
          focusable="false"
        >
          {/* Crop the transparent artboard and rotate the supplied illustration clockwise. */}
          <image
            href="/illustrations/map.webp"
            width="1920"
            height="1080"
            transform="translate(813 -546) rotate(90)"
          />
        </svg>
        {locations.map((location, index) => (
          <Popover
            key={location.id}
            className={`office-marker office-marker--${location.labelSide}${location.headOffice ? " office-marker--hq" : ""}`}
            style={{
              "--marker-x": `${location.x}%`,
              "--marker-y": `${location.y}%`,
              "--marker-tilt": `${index % 2 ? -3 : 2}deg`,
            } as CSSProperties}
            data-story-map-marker
          >
            {({ open, close }) => <OfficeMarker location={location} open={open} close={close} />}
          </Popover>
        ))}
      </PopoverGroup>
      {/* <figcaption className="franchise-map__caption">
        <span>Three local teams. One Change.</span>
        <span className="franchise-map__hint">Hover or tap a location to say hello.</span>
      </figcaption> */}
      <noscript>
        <ul className="franchise-map__directory">
          {locations.map((location) => (
            <li key={location.id}>
              <strong>{location.name}{location.headOffice ? " (Head office)" : ""}</strong>
              {" "}{location.address}
              {" "}<a href={telephoneHref(location.phone)} aria-label={`Call ${location.name} office on ${location.phone}`}>{location.phone}</a>
            </li>
          ))}
        </ul>
      </noscript>
    </figure>
  );
}
