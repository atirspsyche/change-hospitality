import { useEffect, useRef, useState } from "react";
import {
  getStoryFrameUrl,
  homeStory,
  type StoryAction,
  type StoryBeat,
  type StoryColumn,
} from "../data/homeStory";
import "./HomeStoryHero.css";

type DecodedFrame = ImageBitmap | HTMLImageElement;

interface FrameSegment {
  progressStart: number;
  progressEnd: number;
  frameStart: number;
  frameEnd: number;
}

interface BeatPlateau {
  id: string;
  progressStart: number;
  progressEnd: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function buildStoryTimeline() {
  const totalWeight = homeStory.beats.reduce(
    (total, beat) =>
      total + beat.travelWeight + beat.holdWeight + beat.exitWeight,
    0,
  );
  const segments: FrameSegment[] = [];
  const plateaus: BeatPlateau[] = [];
  let cursor = 0;

  homeStory.beats.forEach((beat) => {
    const travelStart = cursor / totalWeight;
    cursor += beat.travelWeight;
    const travelEnd = cursor / totalWeight;
    const plateauFrameEnd = Math.min(beat.frames[1], beat.holdFrame + 1);

    segments.push({
      progressStart: travelStart,
      progressEnd: travelEnd,
      frameStart: beat.frames[0],
      frameEnd: beat.holdFrame,
    });

    const plateauStart = cursor / totalWeight;
    cursor += beat.holdWeight;
    const plateauEnd = cursor / totalWeight;

    segments.push({
      progressStart: plateauStart,
      progressEnd: plateauEnd,
      frameStart: beat.holdFrame,
      frameEnd: plateauFrameEnd,
    });
    plateaus.push({
      id: beat.id,
      progressStart: plateauStart,
      progressEnd: plateauEnd,
    });

    if (beat.exitWeight > 0) {
      const exitStart = cursor / totalWeight;
      cursor += beat.exitWeight;
      segments.push({
        progressStart: exitStart,
        progressEnd: cursor / totalWeight,
        frameStart: plateauFrameEnd,
        frameEnd: beat.frames[1],
      });
    }
  });

  return { segments, plateaus };
}

const storyTimeline = buildStoryTimeline();

function frameForProgress(progress: number) {
  const safeProgress = clamp(progress, 0, 1);
  const segment =
    storyTimeline.segments.find(
      (item) =>
        safeProgress >= item.progressStart && safeProgress <= item.progressEnd,
    ) ?? storyTimeline.segments.at(-1);

  if (!segment) return homeStory.posterFrame;
  const segmentLength = segment.progressEnd - segment.progressStart;
  const localProgress = segmentLength
    ? (safeProgress - segment.progressStart) / segmentLength
    : 1;

  return Math.round(
    segment.frameStart +
      (segment.frameEnd - segment.frameStart) * clamp(localProgress, 0, 1),
  );
}

function HeadingWords({ text }: { text: string }) {
  return text.split(" ").map((word, index) => (
    <span className="story-word-wrap" key={`${word}-${index}`}>
      <span className="story-word">{word}</span>{" "}
    </span>
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

  if (overlay.columns) {
    return (
      <div className="story-columns">
        {overlay.columns.map((column) => (
          <StoryColumnContent column={column} key={column.heading} />
        ))}
      </div>
    );
  }

  const HeadingTag = beat.id === "carton-closed" ? "h1" : "h2";

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
            <article className="story-fallback-beat" key={beat.id}>
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

  useEffect(() => {
    const experience = experienceRef.current;
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!experience || !hero || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
    const sourceDpr = window.devicePixelRatio || 1;
    const prefersLightFrames = window.innerWidth < 768 || sourceDpr <= 1;
    const useMobileFrames =
      prefersLightFrames && homeStory.mobileFramesAvailable;
    const renderDpr = Math.min(sourceDpr, prefersLightFrames ? 1.5 : 2);
    const maxDecodedFrames = prefersLightFrames ? 30 : 54;
    let activePrefix = useMobileFrames
      ? homeStory.mobileFramePrefix
      : homeStory.desktopFramePrefix;
    let loadedFrameCount = 0;
    let requestedFrame = homeStory.posterFrame;
    let drawnFrame = 0;
    let isVisible = true;
    let isStreaming = false;
    let canStream = false;
    let streamCursor = homeStory.initialChunkSize + 1;
    let destroyed = false;
    let gsapCleanup: (() => void) | undefined;

    const updateLoadingProgress = () => {
      const progress = Math.round(
        (Math.min(loadedFrameCount, homeStory.initialChunkSize) /
          homeStory.initialChunkSize) *
          100,
      );
      setLoadProgress(progress);
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
          blobs.set(frame, blob);
          blobRequests.delete(frame);
          loadedFrameCount += 1;
          updateLoadingProgress();
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
      const protectedFrames = new Set([
        requestedFrame,
        requestedFrame - 1,
        requestedFrame + 1,
        drawnFrame,
      ]);

      for (const [frameNumber, frame] of decodedFrames) {
        if (decodedFrames.size <= maxDecodedFrames) break;
        if (protectedFrames.has(frameNumber)) continue;
        decodedFrames.delete(frameNumber);
        closeFrame(frame);
      }
    };

    const decodeBlobWithImage = (blob: Blob) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("The browser could not decode an AVIF story frame."));
        };
        image.src = url;
      });

    const decodeFrame = (frame: number) => {
      const cached = decodedFrames.get(frame);
      if (cached) {
        decodedFrames.delete(frame);
        decodedFrames.set(frame, cached);
        return Promise.resolve(cached);
      }
      const pending = decodeRequests.get(frame);
      if (pending) return pending;

      const request = loadBlob(frame)
        .then((blob) =>
          "createImageBitmap" in window
            ? window.createImageBitmap(blob)
            : decodeBlobWithImage(blob),
        )
        .then((decoded) => {
          decodeRequests.delete(frame);
          if (destroyed) {
            closeFrame(decoded);
            return decoded;
          }
          decodedFrames.set(frame, decoded);
          trimDecodedFrames();
          return decoded;
        })
        .catch((error) => {
          decodeRequests.delete(frame);
          throw error;
        });
      decodeRequests.set(frame, request);
      return request;
    };

    const drawFrame = (frame: DecodedFrame, frameNumber: number) => {
      const sourceWidth =
        frame instanceof HTMLImageElement ? frame.naturalWidth : frame.width;
      const sourceHeight =
        frame instanceof HTMLImageElement ? frame.naturalHeight : frame.height;
      if (!sourceWidth || !sourceHeight) return;

      const scale = Math.min(
        canvas.width / sourceWidth,
        canvas.height / sourceHeight,
      );
      const width = sourceWidth * scale;
      const height = sourceHeight * scale;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      context.fillStyle = "#cf4f3a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(frame, x, y, width, height);
      drawnFrame = frameNumber;
      hero.classList.add("has-canvas-frame");
    };

    const drawNearestDecodedFrame = (target: number) => {
      const exact = decodedFrames.get(target);
      if (exact) {
        drawFrame(exact, target);
        return;
      }

      let nearestNumber = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      decodedFrames.forEach((_frame, frameNumber) => {
        const distance = Math.abs(frameNumber - target);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestNumber = frameNumber;
        }
      });
      const nearest = decodedFrames.get(nearestNumber);
      if (nearest) drawFrame(nearest, nearestNumber);
    };

    const requestFrame = (frame: number) => {
      requestedFrame = clamp(frame, 1, homeStory.frameCount);
      drawNearestDecodedFrame(requestedFrame);
      void decodeFrame(requestedFrame)
        .then((decoded) => {
          if (requestedFrame === frame && !destroyed) {
            drawFrame(decoded, frame);
          }
        })
        .catch(() => undefined);

      [1, -1, 2, -2].forEach((offset) => {
        const neighbor = requestedFrame + offset;
        if (neighbor >= 1 && neighbor <= homeStory.frameCount) {
          void decodeFrame(neighbor).catch(() => undefined);
        }
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
      drawNearestDecodedFrame(requestedFrame);
    };

    const idleYield = () =>
      new Promise<void>((resolve) => {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(() => resolve(), { timeout: 180 });
        } else {
          window.setTimeout(resolve, 16);
        }
      });

    const streamRemainingFrames = async () => {
      if (isStreaming || !canStream || !isVisible || destroyed) return;
      isStreaming = true;

      while (
        isVisible &&
        !destroyed &&
        streamCursor <= homeStory.frameCount
      ) {
        const chunk = Array.from(
          {
            length: Math.min(
              homeStory.streamChunkSize,
              homeStory.frameCount - streamCursor + 1,
            ),
          },
          (_, index) => streamCursor + index,
        );
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

      const gsapContext = gsap.context(() => {
        const overlays = Array.from(
          hero.querySelectorAll<HTMLElement>("[data-story-overlay]"),
        );
        gsap.set(overlays, { autoAlpha: 0 });
        const playhead = { progress: 0 };
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () => `+=${window.innerHeight * homeStory.scrollScreens}`,
            pin: true,
            scrub: 0.28,
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

        storyTimeline.plateaus.forEach((plateau) => {
          const overlay = hero.querySelector<HTMLElement>(
            `[data-story-overlay="${plateau.id}"]`,
          );
          if (!overlay) return;
          const words = overlay.querySelectorAll<HTMLElement>(".story-word");
          const supportingCopy = overlay.querySelectorAll<HTMLElement>(
            "[data-story-reveal]",
          );
          const plateauLength = plateau.progressEnd - plateau.progressStart;
          const enterDuration = Math.min(0.018, plateauLength * 0.22);
          const exitDuration = Math.min(0.014, plateauLength * 0.18);

          timeline.fromTo(
            overlay,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: enterDuration,
              ease: "power3.out",
            },
            plateau.progressStart,
          );
          timeline.fromTo(
            words,
            { yPercent: 115, rotate: 2 },
            {
              yPercent: 0,
              rotate: 0,
              duration: enterDuration * 1.6,
              stagger: 0.0025,
              ease: "power3.out",
            },
            plateau.progressStart + enterDuration * 0.25,
          );
          timeline.fromTo(
            supportingCopy,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: enterDuration * 1.4,
              stagger: 0.003,
              ease: "power2.out",
            },
            plateau.progressStart + enterDuration * 0.6,
          );

          if (plateau.progressEnd < 0.999) {
            timeline.to(
              overlay,
              {
                autoAlpha: 0,
                y: -22,
                duration: exitDuration,
                ease: "power2.in",
              },
              plateau.progressEnd - exitDuration,
            );
          }
        });
      }, hero);

      gsapCleanup = () => gsapContext.revert();
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
      void setupGsap();
      try {
        if (useMobileFrames) {
          try {
            const mobilePoster = await fetchBlobFrom(
              homeStory.posterFrame,
              homeStory.mobileFramePrefix,
            );
            blobs.set(homeStory.posterFrame, mobilePoster);
            loadedFrameCount = 1;
            updateLoadingProgress();
          } catch {
            activePrefix = homeStory.desktopFramePrefix;
          }
        }

        const firstFrame = await decodeFrame(homeStory.posterFrame);
        resizeCanvas();
        drawFrame(firstFrame, homeStory.posterFrame);

        const initialFrames = Array.from(
          { length: homeStory.initialChunkSize - 1 },
          (_, index) => index + 2,
        );
        await mapWithConcurrency(initialFrames, 3, decodeFrame);
        if (destroyed) return;
        setIsInitialChunkReady(true);
        canStream = true;
        void streamRemainingFrames();
      } catch {
        if (!abortController.signal.aborted) {
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
      decodedFrames.forEach(closeFrame);
      decodedFrames.clear();
    };
  }, []);

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
        <FallbackStory className="story-nojs" />
      </noscript>
    </div>
  );
}