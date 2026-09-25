import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  getStoryFrameUrl,
  homeStory,
  type StoryAction,
  type StoryBeat,
  type StoryColumn,
  type StoryTypography,
} from "../data/homeStory";
import { frameForProgress, storyTimeline, clamp } from "../lib/homeStoryTimeline";
import {
  getStoryScene,
  sequenceFrameForPosition,
  storyKeyFrames,
  storySequenceFrames,
  type StorySprite,
} from "../lib/homeStoryScene";
import "./HomeStoryHero.css";

type DecodedFrame = ImageBitmap | HTMLImageElement;

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
    <a
      className={`story-button story-button--${action.tone ?? "cream"}`}
      href={action.href}
      data-story-reveal
    >
      {action.label}
      <span aria-hidden="true">&rarr;</span>
    </a>
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

function BeatContent({ beat }: { beat: StoryBeat }) {
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

  return (
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
        <p className="story-body" data-story-reveal>
          {overlay.body}
        </p>
      )}
      {overlay.action && <StoryButton action={overlay.action} />}
    </div>
  );
}

function FallbackStory({ className }: { className: string }) {
  return (
    <section className={className} aria-label="Change Hospitality story">
      <figure className="story-fallback-figure">
        <img
          src={getStoryFrameUrl(homeStory.fallbackFrame)}
          alt="A plated breakfast marking the end of the Change Hospitality story"
          loading={className === "story-nojs" ? "eager" : "lazy"}
          decoding="async"
        />
      </figure>
      <div className="story-fallback-content">
        {homeStory.beats
          .filter((beat) => beat.overlay)
          .map((beat) => (
            <article
              className="story-fallback-beat"
              key={beat.id}
              style={getTypographyStyle(beat.overlay?.typography)}
            >
              <BeatContent beat={beat} />
            </article>
          ))}
      </div>
    </section>
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

export default function HomeStoryHero() {
  const experienceRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isInitialChunkReady, setIsInitialChunkReady] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionEnabled(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const experience = experienceRef.current;
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!experience || !hero || !canvas || !motionEnabled) return;
    setLoadProgress(0);
    setIsInitialChunkReady(false);
    experience.classList.remove("is-failed");

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      experience.classList.add("is-failed");
      return;
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
    const backgroundColor = getComputedStyle(hero).getPropertyValue("--color-flame").trim();
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
      setLoadProgress(Math.round((loadedAssetCount / initialAssetCount) * 100));
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
          if (initialFrames.has(frame)) {
            loadedAssetCount += 1;
            updateLoadingProgress();
          }
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
      if (destroyed) return;
      const scene = getStoryScene(requestedPosition, canvas.width, canvas.height);
      const images = scene.layers.map(({ asset }) => typeof asset === "number"
        ? decodedFrames.get(asset) : decodedSprites.get(asset));
      // Keep the last complete composition during a seek. Never substitute an
      // unrelated nearest frame underneath the shells or the cutlery.
      if (images.some((image) => !image)) return;

      context.globalAlpha = 1;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      scene.layers.forEach((layer, index) => {
        const image = images[index]!;
        context.save();
        context.globalAlpha = layer.opacity ?? 1;
        if (layer.rotation) {
          context.translate(layer.rotation.x, layer.rotation.y);
          context.rotate(layer.rotation.radians);
          context.translate(-layer.rotation.x, -layer.rotation.y);
        }
        if (layer.crop) {
          const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
          const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
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
      hero.classList.add("has-canvas-frame");
      hero.dataset.storyFrame = requestedPosition.toFixed(3);
      hero.dataset.storyScene = scene.kind;
    };

    const requestRender = () => {
      if (!destroyed && !renderFrame) renderFrame = window.requestAnimationFrame(renderScene);
    };

    const requestFrame = (position: number) => {
      requestedPosition = clamp(position, 1, homeStory.frameCount);
      requestRender();
      const sourceFrame = sequenceFrameForPosition(requestedPosition);
      if (!decodedFrames.has(sourceFrame)) {
        void decodeFrame(sourceFrame).then(requestRender).catch(() => undefined);
      }
      // Map neighbours through the coded ranges too, so prefetch cannot fetch
      // the baked animations that this renderer deliberately replaces.
      const neighbours = new Set([1, -1, 2, -2].map((offset) =>
        sequenceFrameForPosition(clamp(requestedPosition + offset, 1, homeStory.frameCount))));
      neighbours.forEach((frame) => {
        if (!decodedFrames.has(frame)) void decodeFrame(frame).catch(() => undefined);
      });
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width * renderDpr));
      const height = Math.max(1, Math.round(bounds.height * renderDpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
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

      const media = gsap.matchMedia();
      gsapCleanup = () => media.revert();
      media.add({
        desktop: "(min-width: 1024px)",
        motion: "(prefers-reduced-motion: no-preference)",
      }, (mediaContext) => {
        if (!mediaContext.conditions?.motion) return;
        const desktop = mediaContext.conditions.desktop;
        const overlays = Array.from(
          hero.querySelectorAll<HTMLElement>("[data-story-overlay]"),
        );
        gsap.set(overlays, { autoAlpha: 0 });
        const playhead = { progress: 0 };
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: "home-story",
            trigger: hero,
            start: "top top",
            end: () => `+=${window.innerHeight * homeStory.scrollScreens}`,
            pin: true,
            // The story needs one pin on mobile too; omit secondary word
            // choreography and pointer motion there instead of extra pins.
            scrub: desktop ? 0.28 : true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
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
            onUpdate: () => requestFrame(frameForProgress(playhead.progress)),
          },
          0,
        );

        storyTimeline.overlayWindows.forEach((overlayWindow) => {
          const overlay = hero.querySelector<HTMLElement>(
            `[data-story-overlay="${overlayWindow.id}"]`,
          );
          if (!overlay) return;
          const words = overlay.querySelectorAll<HTMLElement>(".story-word");
          const supportingCopy = overlay.querySelectorAll<HTMLElement>(
            "[data-story-reveal]",
          );
          const windowLength =
            overlayWindow.progressEnd - overlayWindow.progressStart;
          const enterDuration = Math.min(0.018, windowLength * 0.22);
          const exitDuration = Math.min(0.014, windowLength * 0.18);

          timeline.fromTo(
            overlay,
            { autoAlpha: 0, y: desktop ? 28 : 0 },
            {
              autoAlpha: 1,
              y: 0,
              duration: enterDuration,
              ease: "power3.out",
            },
            overlayWindow.progressStart,
          );
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

          if (overlayWindow.hideAtEnd) {
            timeline.set(
              overlay,
              { autoAlpha: 0, y: -22 },
              overlayWindow.progressEnd,
            );
          } else if (overlayWindow.progressEnd < 0.999) {
            timeline.to(
              overlay,
              {
                autoAlpha: 0,
                y: -22,
                duration: exitDuration,
                ease: "power2.in",
              },
              overlayWindow.progressEnd - exitDuration,
            );
          }
        });
      }, hero);

      ScrollTrigger.refresh();
      document.documentElement.dataset.homeStoryReady = "true";
      document.dispatchEvent(new CustomEvent("home-story-ready"));
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

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
            loadedAssetCount = 1;
            updateLoadingProgress();
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
        // No scroll-driven scene can run before its composite assets exist.
        await setupGsap();
        if (destroyed) return;
        canStream = true;
        setIsInitialChunkReady(true);
        void streamRemainingFrames();
      } catch {
        if (!abortController.signal.aborted) {
          gsapCleanup?.();
          experience.classList.add("is-failed");
        }
      }
    };

    void initialize();

    return () => {
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
      delete document.documentElement.dataset.homeStoryReady;
    };
  }, [motionEnabled]);

  return (
    <div className="story-experience" ref={experienceRef}>
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

        <div
          className={`story-loader ${isInitialChunkReady ? "is-ready" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="story-loader-egg" aria-hidden="true" />
          <span>Preparing the pass</span>
          <strong>{loadProgress}%</strong>
        </div>

        <div className="story-overlays">
          {homeStory.beats
            .filter((beat) => beat.overlay)
            .map((beat) => (
              <article
                className={`story-overlay story-overlay--${beat.overlay?.layout}`}
                data-story-overlay={beat.id}
                key={beat.id}
                style={getTypographyStyle(beat.overlay?.typography)}
              >
                <BeatContent beat={beat} />
              </article>
            ))}
        </div>

        <div className="story-scroll-cue" aria-hidden="true">
          <span>Scroll to cook</span>
          <i />
        </div>
      </section>

      <FallbackStory className="story-reduced" />
      <noscript>
        <style>{`.story-hero, .story-reduced { display: none !important; } .story-nojs { display: block !important; }`}</style>
        <FallbackStory className="story-nojs" />
      </noscript>
    </div>
  );
}