import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from "@headlessui/react";
import { useEffect, useId, useState, type CSSProperties } from "react";
import type { FranchiseLocation } from "../data/franchiseLocations";
import { telephoneHref } from "../data/editorial";
import "./FranchiseMap.css";

const eggShapePath = "M20 5C14 5 7 18 7 29C7 37 12 43 20 43C28 43 33 37 33 29C33 18 26 5 20 5Z";

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
        <span className="office-marker__egg" aria-hidden="true">
          <svg viewBox="0 0 40 48" fill="none" focusable="false">
            <path className="office-marker__egg-white" d={eggShapePath} />
            <circle className="office-marker__egg-yolk" cx="20" cy="24" r="8" />
            <path className="office-marker__egg-glint" d="M17 21C18 19.5 20 19 21.5 19.5" />
            <path
              className="office-marker__egg-outline"
              d={eggShapePath}
              transform="translate(20 24) scale(1.16) translate(-20 -24)"
              pathLength="1"
            />
          </svg>
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
        <span>Good eggs,<br />cracking local knowledge.</span>
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
