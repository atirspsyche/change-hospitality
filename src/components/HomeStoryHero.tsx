import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { PrimaryButton } from "./Button";
import FranchiseMap from "./FranchiseMap";
import type { FranchiseLocation } from "../data/franchiseLocations";
import {
  getStoryFrameUrl,
  homeStory,
  homeStoryRecruitmentLine,
  type StoryAction,
  type StoryBeat,
  type StoryColumn,
  type StoryTypography,
} from "../data/homeStory";
import { frameForProgress, mobileStoryBeats, mobileStoryTimeline, storyTimeline, clamp } from "../lib/homeStoryTimeline";
import {
  getMobileStoryScene,
  getStoryLayerBounds,
  getStoryScene,
  sequenceFrameForPosition,
  storyKeyFrames,
  storySequenceFrames,
  type StorySprite,
} from "../lib/homeStoryScene";
import "./HomeStoryHero.css";

type DecodedFrame = ImageBitmap | HTMLImageElement;
const mobileStoryQuery = "(max-width: 767px), (max-width: 1023px) and (max-height: 500px) and (pointer: coarse)";

function getTypographyStyle(typography?: StoryTypography) {
  if (!typography) return undefined;

  return {
    "--story-heading-size": typography.headingSize,
    "--story-heading-line-height": typography.headingLineHeight,
    "--story-heading-weight": typography.headingWeight,
    "--story-heading-max-width": typography.headingMaxWidth,
    "--story-body-size": typography.bodySize,
    "--story-body-line-height": typography.bodyLineHeight,
    "--story-body-weight": typography.bodyWeight,
    "--story-body-max-width": typography.bodyMaxWidth,
  } as CSSProperties;
}

function HeadingWords({ text }: { text: string }) {
  const words = text.split(" ");

  return words.map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      <span className="story-word-wrap">
        <span className="story-word">{word}</span>
      </span>
      {index < words.length - 1 && " "}
    </Fragment>
  ));
}

function StoryButton({ action }: { action: StoryAction }) {
  return (
    <PrimaryButton
      className="story-button"
      href={action.href}
      backgroundColor={`var(--color-${action.tone ?? "cream"})`}
      textColor={action.tone === "flame" ? "var(--color-cream)" : "var(--color-ink)"}
      data-story-reveal
    >
      {action.label}
    </PrimaryButton>
  );
}

function StoryColumnContent({ column }: { column: StoryColumn }) {
  return (
    <div className="story-column">
      <p className="story-eyebrow" data-story-reveal>
        {column.eyebrow}
      </p>
      <h2 className="story-column-heading">
        <HeadingWords text={column.heading} />
      </h2>
      <p className="story-body" data-story-reveal>
        {column.body}
      </p>
      {column.action && <StoryButton action={column.action} />}
    </div>
  );
}

function BeatContent({ beat, franchiseLocations }: { beat: StoryBeat; franchiseLocations: FranchiseLocation[] }) {
  const overlay = beat.overlay;
  if (!overlay) return null;

  if (overlay.layout === "edges" && overlay.columns) {
    return (
      <div className="story-edge-layout">
        {overlay.topText && (
          <p className="story-edge-note story-edge-note--top" data-story-reveal>
            {overlay.topText}
          </p>
        )}
        <div className="story-edge-columns">
          {overlay.columns.map((column) => (
            <StoryColumnContent column={column} key={column.heading} />
          ))}
        </div>
        {overlay.bottomText && (
          <p className="story-edge-note story-edge-note--bottom" data-story-reveal>
            {overlay.bottomText}
          </p>
        )}
      </div>
    );
  }

  if (overlay.columns) {
    return (
      <div className="story-columns">
        {overlay.columns.map((column) => (
          <StoryColumnContent column={column} key={column.heading} />
        ))}
      </div>
    );
  }

  const HeadingTag = overlay.layout === "brand" ? "h1" : "h2";
  const BodyTag = overlay.layout === "brand" ? "h1" : "p";

  const copy = (
    <div className="story-copy">
      {overlay.eyebrow && (
        <p className="story-eyebrow" data-story-reveal>
          {overlay.eyebrow}
        </p>
      )}
      {overlay.heading && (
        <HeadingTag className="story-heading">
          <HeadingWords text={overlay.heading} />
        </HeadingTag>
      )}
      {overlay.body && (
        <BodyTag className="story-body" data-story-reveal={overlay.layout !== "brand" || undefined}>
          {overlay.layout === "brand" ? <HeadingWords text={overlay.body} /> : overlay.body}
        </BodyTag>
      )}
      {overlay.action && <StoryButton action={overlay.action} />}
    </div>
  );

  if (overlay.layout === "locations") {
    return (
      <div className="story-locations-layout">
        {copy}
        <div className="story-locations-map" data-story-reveal>
          <FranchiseMap locations={franchiseLocations} />
        </div>
      </div>
    );
  }

  return copy;
}

function FallbackStory({ className, franchiseLocations }: { className: string; franchiseLocations: FranchiseLocation[] }) {
  return (
    <section className={className} aria-label="Change Hospitality story">
      <figure className="story-fallback-figure">
        <img
          src={getStoryFrameUrl(homeStory.fallbackFrame)}
          alt="A plated breakfast marking the end of the Change Hospitality story"
          loading="lazy"
          decoding="async"
        />
      </figure>
      <div className="story-fallback-content">
        {homeStory.beats
          .filter((beat) => beat.overlay)
          .map((beat) => (
            <article
              className={`story-fallback-beat story-fallback-beat--${beat.overlay?.layout}`}
              key={beat.id}
              style={getTypographyStyle(beat.overlay?.typography)}
            >
              <BeatContent beat={beat} franchiseLocations={franchiseLocations} />
            </article>
          ))}
      </div>
    </section>
  );
}

function MobileStoryChapters() {
  return (
    <div className="story-mobile-overlays">
      {mobileStoryBeats.filter((beat) => beat.overlay).map((beat) => {
        const overlay = beat.overlay!;
        const HeadingTag = overlay.layout === "brand" ? "h1" : "h2";
        return (
          <article className="story-mobile-chapter" data-story-overlay={beat.id} key={beat.id}>
            <div className="story-mobile-lead">
              {overlay.eyebrow && <p className="story-mobile-eyebrow">{overlay.eyebrow}</p>}
              <HeadingTag className="story-mobile-heading">{overlay.heading}</HeadingTag>
            </div>
            <div className="story-mobile-details">
              {overlay.body && <p className="story-mobile-body">{overlay.body}</p>}
              {overlay.action && <StoryButton action={overlay.action} />}
            </div>
          </article>
        );
      })}
    </div>
  );
}

async function mapWithConcurrency<T>(
  items: number[],
  concurrency: number,
  task: (item: number) => Promise<T>,
) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item !== undefined) await task(item);
      }
    },
  );
  await Promise.all(workers);
}

export default function HomeStoryHero({ franchiseLocations }: { franchiseLocations: FranchiseLocation[] }) {
  const experienceRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMotionEnabled(!preference.matches);
      if (preference.matches) {
        document.documentElement.dataset.homeStoryReady = "true";
        document.dispatchEvent(new Event("home-story-ready"));
      }
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const experience = experienceRef.current;
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!experience || !hero || !canvas || !motionEnabled
      || document.documentElement.dataset.homeStoryFallback === "true") return;
    document.documentElement.dataset.homeStoryProgress = "0";
    experience.classList.remove("is-failed", "is-readable");
    const mobileOverlays = hero.querySelector<HTMLElement>(".story-mobile-overlays")!;
    const mobileMap = hero.querySelector<HTMLElement>(".story-mobile-map")!;
    const mobileChapters = Array.from(mobileOverlays.querySelectorAll<HTMLElement>("[data-story-overlay]"));
    let isMobileStory = window.matchMedia(mobileStoryQuery).matches;

    const notifyReady = () => {
      document.documentElement.dataset.homeStoryReady = "true";
      document.dispatchEvent(new CustomEvent("home-story-ready"));
    };

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      console.warn("Canvas is unavailable. Showing the readable Change Hospitality story.");
      experience.classList.add("is-failed");
      document.documentElement.dataset.homeStoryFallback = "true";
      notifyReady();
      return () => { delete document.documentElement.dataset.homeStoryReady; };
    }

    const abortController = new AbortController();
    const blobs = new Map<number, Blob>();
    const blobRequests = new Map<number, Promise<Blob>>();
    const decodedFrames = new Map<number, DecodedFrame>();
    const decodeRequests = new Map<number, Promise<DecodedFrame>>();
    const decodedSprites = new Map<StorySprite, DecodedFrame>();
    const initialFrames = new Set([
      ...storySequenceFrames.slice(0, homeStory.initialChunkSize),
      ...storyKeyFrames,
    ]);
    const spriteNames = Object.keys(homeStory.animation.sprites) as StorySprite[];
    const initialAssetCount = initialFrames.size + spriteNames.length;
    const remainingFrames = storySequenceFrames.filter((frame) => !initialFrames.has(frame));
    let backgroundColor = getComputedStyle(hero).backgroundColor;
    const sourceDpr = window.devicePixelRatio || 1;
    const prefersLightFrames = window.innerWidth < 768 || sourceDpr <= 1;
    const useMobileFrames =
      prefersLightFrames && homeStory.mobileFramesAvailable;
    const renderDpr = Math.min(sourceDpr, prefersLightFrames ? 1.5 : 2);
    const maxDecodedFrames = prefersLightFrames ? 30 : 54;
    let activePrefix = useMobileFrames
      ? homeStory.mobileFramePrefix
      : homeStory.desktopFramePrefix;
    let loadedAssetCount = 0;
    let requestedPosition = homeStory.posterFrame;
    let renderedPosition = Number.NaN;
    let frameDirection = 1;
    let decodeQueue: number[] = [];
    let activeDecodes = 0;
    let isVisible = true;
    let isStreaming = false;
    let canStream = false;
    let streamCursor = 0;
    let destroyed = false;
    let parallaxFrame = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    let renderFrame = 0;
    let gsapCleanup: (() => void) | undefined;
    let refreshStory: (() => void) | undefined;
    let storyHeight = hero.clientHeight;

    const renderParallax = () => {
      parallaxFrame = 0;
      hero.style.setProperty("--story-copy-x", `${parallaxX * -5}px`);
      hero.style.setProperty("--story-copy-y", `${parallaxY * -3}px`);
    };

    const requestParallaxRender = () => {
      if (parallaxFrame) return;
      parallaxFrame = window.requestAnimationFrame(renderParallax);
    };

    if (window.innerWidth >= 1024) {
      hero.addEventListener("pointermove", (event) => {
        const bounds = hero.getBoundingClientRect();
        parallaxX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        parallaxY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        requestParallaxRender();
      }, { signal: abortController.signal });
      hero.addEventListener("pointerleave", () => {
        parallaxX = 0;
        parallaxY = 0;
        requestParallaxRender();
      }, { signal: abortController.signal });
    }

    const updateLoadingProgress = () => {
      if (destroyed) return;
      document.documentElement.dataset.homeStoryProgress = String(Math.round((loadedAssetCount / initialAssetCount) * 100));
      document.dispatchEvent(new Event("home-story-progress"));
    };

    const fetchBlobFrom = async (frame: number, prefix: string) => {
      const response = await fetch(getStoryFrameUrl(frame, prefix), {
        cache: "force-cache",
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error(`Frame ${frame} returned ${response.status}`);
      return response.blob();
    };

    const loadBlob = (frame: number) => {
      const cached = blobs.get(frame);
      if (cached) return Promise.resolve(cached);
      const pending = blobRequests.get(frame);
      if (pending) return pending;

      const request = fetchBlobFrom(frame, activePrefix)
        .then((blob) => {
          if (destroyed) return blob;
          blobs.set(frame, blob);
          blobRequests.delete(frame);
          return blob;
        })
        .catch((error) => {
          blobRequests.delete(frame);
          throw error;
        });
      blobRequests.set(frame, request);
      return request;
    };

    const closeFrame = (frame: DecodedFrame) => {
      if ("close" in frame && typeof frame.close === "function") frame.close();
    };

    const trimDecodedFrames = () => {
      if (decodedFrames.size <= maxDecodedFrames) return;
      const requestedFrame = sequenceFrameForPosition(requestedPosition);
      const protectedFrames = new Set([
        ...storyKeyFrames,
        requestedFrame,
        requestedFrame - 1,
        requestedFrame + 1,
      ]);

      for (const [frameNumber, frame] of decodedFrames) {
        if (decodedFrames.size <= maxDecodedFrames) break;
        if (protectedFrames.has(frameNumber)) continue;
        decodedFrames.delete(frameNumber);
        closeFrame(frame);
      }
    };

    const decodeBlobWithImage = (blob: Blob): Promise<HTMLImageElement> =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("The browser could not decode a story frame."));
        };
        image.src = url;
      });

    const decodeImage = async (blob: Blob): Promise<DecodedFrame> => {
      if (typeof window.createImageBitmap === "function") {
        try {
          return await window.createImageBitmap(blob);
        } catch {
          // Some Safari versions expose ImageBitmap without decoding WebP.
        }
      }
      return decodeBlobWithImage(blob);
    };

    const decodeFrame = (frame: number): Promise<DecodedFrame> => {
      const cached = decodedFrames.get(frame);
      if (cached) {
        decodedFrames.delete(frame);
        decodedFrames.set(frame, cached);
        return Promise.resolve(cached);
      }
      const pending = decodeRequests.get(frame);
      if (pending) return pending;

      const request = (async (): Promise<DecodedFrame> => {
        try {
          const blob = await loadBlob(frame);
          const decoded = await decodeImage(blob);
          decodeRequests.delete(frame);
          if (destroyed) {
            closeFrame(decoded);
            return decoded;
          }
          decodedFrames.set(frame, decoded);
          if (initialFrames.has(frame)) {
            loadedAssetCount += 1;
            updateLoadingProgress();
          }
          trimDecodedFrames();
          return decoded;
        } catch (error) {
          decodeRequests.delete(frame);
          throw error;
        }
      })();
      decodeRequests.set(frame, request);
      return request;
    };

    const renderScene = () => {
      renderFrame = 0;
      if (destroyed || renderedPosition === requestedPosition) return;
      const scene = isMobileStory
        ? getMobileStoryScene(requestedPosition, canvas.width, canvas.height)
        : getStoryScene(requestedPosition, canvas.width, canvas.height);
      const images = scene.layers.map(({ asset }) => typeof asset === "number"
        ? decodedFrames.get(asset) : decodedSprites.get(asset));
      // Keep the last complete composition during a seek. Never substitute an
      // unrelated nearest frame underneath the shells or the cutlery.
      if (images.some((image) => !image)) return;

      context.globalAlpha = 1;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      scene.layers.forEach((sceneLayer, index) => {
        const image = images[index]!;
        const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
        const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
        const layer = getStoryLayerBounds(sceneLayer, sourceWidth, sourceHeight, canvas.width);
        context.save();
        context.globalAlpha = layer.opacity ?? 1;
        if (layer.rotation) {
          context.translate(layer.rotation.x, layer.rotation.y);
          context.rotate(layer.rotation.radians);
          context.translate(-layer.rotation.x, -layer.rotation.y);
        }
        if (layer.crop) {
          const sx = sourceWidth / homeStory.animation.referenceWidth;
          const sy = sourceHeight / homeStory.animation.referenceHeight;
          context.drawImage(image,
            layer.crop.x * sx, layer.crop.y * sy, layer.crop.width * sx, layer.crop.height * sy,
            layer.x, layer.y, layer.width, layer.height);
        } else {
          context.drawImage(image, layer.x, layer.y, layer.width, layer.height);
        }
        context.restore();
      });
      context.globalAlpha = 1;
      renderedPosition = requestedPosition;
      hero.classList.add("has-canvas-frame");
      hero.dataset.storyFrame = requestedPosition.toFixed(3);
      hero.dataset.storyScene = scene.kind;
    };

    const requestRender = () => {
      if (!destroyed && !renderFrame) renderFrame = window.requestAnimationFrame(renderScene);
    };

    const decodeUpcomingFrames = () => {
      while (!destroyed && activeDecodes < 3 && decodeQueue.length) {
        const frame = decodeQueue.shift()!;
        if (decodedFrames.has(frame)) continue;
        activeDecodes += 1;
        void decodeFrame(frame).then(requestRender).catch(() => undefined).finally(() => {
          activeDecodes -= 1;
          decodeUpcomingFrames();
        });
      }
    };

    const requestFrame = (position: number) => {
      if (position !== requestedPosition) frameDirection = position > requestedPosition ? 1 : -1;
      requestedPosition = clamp(position, 1, homeStory.frameCount);
      requestRender();
      const offsets = [0, -frameDirection, ...Array.from({ length: 12 }, (_, index) => (index + 1) * frameDirection)];
      decodeQueue = [...new Set(offsets.map((offset) =>
        sequenceFrameForPosition(clamp(requestedPosition + offset, 1, homeStory.frameCount))))]
        .filter((frame) => !decodedFrames.has(frame) && !decodeRequests.has(frame));
      decodeUpcomingFrames();
    };

    const updateMobileLayout = () => {
      if (!isMobileStory || destroyed) return;
      const bounds = mobileOverlays.getBoundingClientRect();
      if (!bounds.height) return;
      const tallest = (selector: string) => Math.max(...mobileChapters.map((chapter) =>
        chapter.querySelector<HTMLElement>(selector)!.getBoundingClientRect().height));
      let leadHeight = tallest(".story-mobile-lead");
      let detailHeight = tallest(".story-mobile-details");
      if (bounds.height - leadHeight - detailHeight - 24 < 160) {
        const active = mobileChapters.find((chapter) => chapter.dataset.storyOverlay === hero.dataset.storyMobileChapter)
          ?? mobileChapters[0];
        leadHeight = active.querySelector<HTMLElement>(".story-mobile-lead")!.getBoundingClientRect().height;
        detailHeight = active.querySelector<HTMLElement>(".story-mobile-details")!.getBoundingClientRect().height;
      }
      const stageHeight = bounds.height - leadHeight - detailHeight - 24;
      if (hero.clientHeight < 480 || stageHeight < 96) {
        experience.classList.add("is-readable");
        document.documentElement.dataset.homeStoryFallback = "true";
        document.dispatchEvent(new Event("home-story-cancel"));
        notifyReady();
        return;
      }
      hero.style.setProperty("--story-mobile-stage-top", `${bounds.top - hero.getBoundingClientRect().top + leadHeight + 12}px`);
      hero.style.setProperty("--story-mobile-stage-height", `${stageHeight}px`);
    };

    const resizeCanvas = () => {
      backgroundColor = getComputedStyle(hero).backgroundColor;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width * renderDpr));
      const height = Math.max(1, Math.round(bounds.height * renderDpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        renderedPosition = Number.NaN;
      }
      requestRender();
    };

    const idleYield = () =>
      new Promise<void>((resolve) => {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(() => resolve(), { timeout: 180 });
        } else {
          globalThis.setTimeout(resolve, 16);
        }
      });

    const streamRemainingFrames = async () => {
      if (isStreaming || !canStream || !isVisible || destroyed) return;
      isStreaming = true;

      while (
        isVisible &&
        !destroyed &&
        streamCursor < remainingFrames.length
      ) {
        const chunk = remainingFrames.slice(streamCursor, streamCursor + homeStory.streamChunkSize);
        streamCursor += chunk.length;
        await mapWithConcurrency(chunk, 4, (frame) =>
          loadBlob(frame).catch(() => new Blob()),
        );
        await idleYield();
      }

      isStreaming = false;
    };

    const setupGsap = async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (destroyed) return;
      gsap.registerPlugin(ScrollTrigger);
      refreshStory = () => ScrollTrigger.refresh();

      const media = gsap.matchMedia();
      gsapCleanup = () => media.revert();
      media.add({
        desktop: "(min-width: 1024px)",
        phone: mobileStoryQuery,
        motion: "(prefers-reduced-motion: no-preference)",
      }, (mediaContext) => {
        if (!mediaContext.conditions?.motion) return;
        const desktop = mediaContext.conditions.desktop;
        isMobileStory = !!mediaContext.conditions.phone;
        hero.dataset.storyLayout = isMobileStory ? "mobile" : "desktop";
        const activeTimeline = isMobileStory ? mobileStoryTimeline : storyTimeline;
        updateMobileLayout();
        if (destroyed) return;
        renderedPosition = Number.NaN;
        resizeCanvas();
        const allOverlays = Array.from(hero.querySelectorAll<HTMLElement>("[data-story-overlay]"));
        const overlays = Array.from(
          hero.querySelectorAll<HTMLElement>(isMobileStory
            ? ".story-mobile-overlays [data-story-overlay]"
            : ".story-overlays [data-story-overlay]"),
        );
        gsap.set(allOverlays, { autoAlpha: 0 });
        allOverlays.forEach((overlay) => { overlay.inert = isMobileStory || mobileOverlays.contains(overlay); });
        let activeChapter: string | undefined;
        let hasSyncedChapter = false;
        const syncStory = (progress: number) => {
          requestFrame(frameForProgress(progress, activeTimeline));
          const chapter = isMobileStory
            ? activeTimeline.overlayWindows.find((window) => progress >= window.progressStart && progress <= window.progressEnd)?.id
            : undefined;
          if (hasSyncedChapter && chapter === activeChapter) return;
          hasSyncedChapter = true;
          activeChapter = chapter;
          hero.dataset.storyMobileChapter = chapter ?? "transition";
          mobileChapters.forEach((overlay) => { overlay.inert = overlay.dataset.storyOverlay !== chapter; });
          const showMap = isMobileStory && chapter === "plate-center-next";
          mobileMap.inert = !showMap;
          gsap.set(mobileMap, { autoAlpha: showMap ? 1 : 0 });
          canvas.style.opacity = showMap ? "0" : "";
          if (isMobileStory) {
            updateMobileLayout();
            resizeCanvas();
          }
        };
        syncStory(0);
        const playhead = { progress: 0 };
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: "home-story",
            trigger: hero,
            start: "top top",
            end: () => `+=${(isMobileStory ? hero.clientHeight : window.innerHeight) * activeTimeline.scrollScreens}`,
            pin: true,
            // The story needs one pin on mobile too; omit secondary word
            // choreography and pointer motion there instead of extra pins.
            scrub: desktop ? 0.18 : 0.12,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Refresh seeks the timeline with tween callbacks suppressed.
            onRefresh: (trigger) => {
              hero.dataset.storyPinned = String(trigger.isActive);
              syncStory(trigger.progress);
            },
            onToggle: (trigger) => { hero.dataset.storyPinned = String(trigger.isActive); },
            onEnter: () => {
              isVisible = true;
              void streamRemainingFrames();
            },
            onEnterBack: () => {
              isVisible = true;
              void streamRemainingFrames();
            },
            onLeave: () => {
              isVisible = false;
            },
          },
        });

        timeline.to(
          playhead,
          {
            progress: 1,
            duration: 1,
            ease: "none",
            onUpdate: () => syncStory(playhead.progress),
          },
          0,
        );

        activeTimeline.overlayWindows.forEach((overlayWindow) => {
          const overlay = overlays.find((element) => element.dataset.storyOverlay === overlayWindow.id);
          if (!overlay) return;
          const words = overlay.querySelectorAll<HTMLElement>(".story-word");
          const supportingCopy = overlay.querySelectorAll<HTMLElement>(
            "[data-story-reveal]",
          );
          const windowLength =
            overlayWindow.progressEnd - overlayWindow.progressStart;
          const isBrand = overlayWindow.id === "carton-open-brand";
          const enterDuration = Math.min(0.018, windowLength * 0.22);
          const exitDuration = Math.min(0.014, windowLength * 0.18);

          if (desktop && !isBrand) {
            timeline.fromTo(overlay, { "--story-depth-y": "10px" }, {
              "--story-depth-y": "-10px",
              duration: windowLength,
              ease: "none",
            }, overlayWindow.progressStart);
          }

          timeline.fromTo(
            overlay,
            { autoAlpha: isMobileStory && isBrand ? 1 : 0, y: desktop && !isBrand ? 28 : 0 },
            {
              autoAlpha: 1,
              y: 0,
              duration: enterDuration,
              ease: "power3.out",
            },
            overlayWindow.progressStart,
          );
          if (!isMobileStory) {
            timeline.fromTo(
              words,
              { yPercent: desktop ? 115 : 0, rotate: desktop ? 2 : 0 },
              {
                yPercent: 0,
                rotate: 0,
                duration: enterDuration * 1.6,
                stagger: desktop ? 0.0025 : 0,
                ease: "power3.out",
              },
              overlayWindow.progressStart + enterDuration * 0.25,
            );
          }
          if (supportingCopy.length && !isMobileStory) {
            timeline.fromTo(
              supportingCopy,
              { y: desktop ? 18 : 0, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: enterDuration * 1.4,
                stagger: desktop ? 0.003 : 0,
                ease: "power2.out",
              },
              overlayWindow.progressStart + enterDuration * 0.6,
            );
          }

          const mapMarkers = overlay.querySelectorAll("[data-story-map-marker]");
          if (mapMarkers.length && desktop) {
            timeline.fromTo(mapMarkers, { scale: 0.6, opacity: 0 }, {
              scale: 1,
              opacity: 1,
              duration: enterDuration * 1.5,
              stagger: 0.004,
              ease: "back.out(1.4)",
            }, overlayWindow.progressStart + enterDuration);
          }

          if (overlayWindow.hideAtEnd || overlayWindow.progressEnd < 0.999) {
            timeline.to(
              overlay,
              {
                autoAlpha: 0,
                y: isBrand || isMobileStory ? 0 : -22,
                duration: exitDuration,
                ease: "power2.in",
              },
              overlayWindow.progressEnd - exitDuration,
            );
          }
        });
      }, hero);

      if (destroyed) return;
      ScrollTrigger.refresh();
      const scene = isMobileStory
        ? getMobileStoryScene(requestedPosition, canvas.width, canvas.height)
        : getStoryScene(requestedPosition, canvas.width, canvas.height);
      await Promise.all(scene.layers.flatMap(({ asset }) =>
        typeof asset === "number" ? [decodeFrame(asset)] : []));
      if (destroyed) return;
      renderScene();
      notifyReady();
    };

    const resizeObserver = new ResizeObserver(() => {
      const heightChanged = hero.clientHeight !== storyHeight;
      storyHeight = hero.clientHeight;
      updateMobileLayout();
      resizeCanvas();
      if (isMobileStory && heightChanged && !destroyed) refreshStory?.();
    });
    resizeObserver.observe(canvas);
    resizeObserver.observe(hero);
    mobileChapters.forEach((chapter) => {
      resizeObserver.observe(chapter.querySelector(".story-mobile-lead")!);
      resizeObserver.observe(chapter.querySelector(".story-mobile-details")!);
    });

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) void streamRemainingFrames();
      },
      { rootMargin: "120% 0px" },
    );
    visibilityObserver.observe(hero);

    const initialize = async () => {
      try {
        if (useMobileFrames) {
          try {
            const mobilePoster = await fetchBlobFrom(
              homeStory.posterFrame,
              homeStory.mobileFramePrefix,
            );
            if (destroyed) return;
            blobs.set(homeStory.posterFrame, mobilePoster);
          } catch {
            activePrefix = homeStory.desktopFramePrefix;
          }
        }

        await decodeFrame(homeStory.posterFrame);
        if (destroyed) return;
        resizeCanvas();
        renderScene();

        await Promise.all([
          mapWithConcurrency([...initialFrames], 3, decodeFrame),
          ...spriteNames.map(async (name) => {
            const response = await fetch(homeStory.animation.sprites[name].src, {
              cache: "force-cache", signal: abortController.signal,
            });
            if (!response.ok) throw new Error(`Story sprite ${name} returned ${response.status}`);
            const decoded = await decodeImage(await response.blob());
            if (destroyed) {
              closeFrame(decoded);
              return;
            }
            decodedSprites.set(name, decoded);
            loadedAssetCount += 1;
            updateLoadingProgress();
          }),
        ]);
        if (destroyed) return;
        await document.fonts.ready;
        if (destroyed) return;
        // No scroll-driven scene can run before its composite assets exist.
        await setupGsap();
        if (destroyed) return;
        canStream = true;
        void streamRemainingFrames();
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("The opening story could not load. Showing the readable story instead.", error);
          dispose();
          experience.classList.add("is-failed");
          document.documentElement.dataset.homeStoryFallback = "true";
          notifyReady();
        }
      }
    };

    void initialize();

    const dispose = () => {
      if (destroyed) return;
      destroyed = true;
      abortController.abort();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      gsapCleanup?.();
      if (parallaxFrame) window.cancelAnimationFrame(parallaxFrame);
      if (renderFrame) window.cancelAnimationFrame(renderFrame);
      decodedFrames.forEach(closeFrame);
      decodedFrames.clear();
      decodedSprites.forEach(closeFrame);
      decodedSprites.clear();
      hero.classList.remove("has-canvas-frame");
      hero.style.removeProperty("--story-copy-x");
      hero.style.removeProperty("--story-copy-y");
      hero.style.removeProperty("--story-mobile-stage-top");
      hero.style.removeProperty("--story-mobile-stage-height");
      canvas.style.removeProperty("opacity");
      delete hero.dataset.storyLayout;
      delete hero.dataset.storyMobileChapter;
      delete hero.dataset.storyPinned;
      delete document.documentElement.dataset.homeStoryReady;
    };
    document.addEventListener("home-story-cancel", dispose, { once: true });
    document.addEventListener("astro:before-swap", dispose, { once: true });
    return () => {
      document.removeEventListener("home-story-cancel", dispose);
      document.removeEventListener("astro:before-swap", dispose);
      dispose();
    };
  }, [motionEnabled]);

  return (
    <div
      className="story-experience"
      ref={experienceRef}
      style={{ "--story-scroll-screens": storyTimeline.scrollScreens } as CSSProperties}
    >
      <section
        className="story-hero"
        ref={heroRef}
        aria-label="The Change Hospitality egg story"
      >
        <img
          className="story-poster"
          src={getStoryFrameUrl(homeStory.posterFrame)}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <canvas className="story-canvas" ref={canvasRef} aria-hidden="true" />
        <h1 className="story-printed-copy visually-hidden">{homeStoryRecruitmentLine}</h1>
        <div className="story-mobile-map"><FranchiseMap locations={franchiseLocations} compact /></div>
        <MobileStoryChapters />

        <div className="story-overlays">
          {homeStory.beats
            .filter((beat) => beat.overlay && beat.overlay.layout !== "brand")
            .map((beat) => (
              <article
                className={`story-overlay story-overlay--${beat.overlay?.layout}`}
                data-story-overlay={beat.id}
                key={beat.id}
                style={getTypographyStyle(beat.overlay?.typography)}
              >
                <BeatContent beat={beat} franchiseLocations={franchiseLocations} />
              </article>
            ))}
        </div>

        <div className="story-scroll-cue" aria-hidden="true">
          <span>Scroll to cook</span>
          <i />
        </div>
      </section>

      <p className="story-fallback-notice" role="status">
        The animated story couldn&apos;t load this time. Here&apos;s the same story, at your own pace.
      </p>
      <FallbackStory className="story-reduced" franchiseLocations={franchiseLocations} />
    </div>
  );
}