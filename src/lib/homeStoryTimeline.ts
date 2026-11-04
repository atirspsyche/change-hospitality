import { homeStory, type StoryBeat } from "../data/homeStory.ts";

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

interface FrameSegment {
  progressStart: number;
  progressEnd: number;
  frameStart: number;
  frameEnd: number;
}

interface OverlayWindow {
  id: string;
  progressStart: number;
  progressEnd: number;
  hideAtEnd: boolean;
}

function buildStoryTimeline(beats: StoryBeat[] = homeStory.beats) {
  const weightPerFrame = homeStory.movementWeight / (homeStory.frameCount - homeStory.posterFrame);
  const segments: FrameSegment[] = [];
  const plateaus = new Map<string, [number, number]>();
  let cursor = 0;

  const addSegment = (weight: number, frameStart: number, frameEnd: number) => {
    const progressStart = cursor;
    cursor += weight;
    const progressEnd = cursor;
    if (weight > 0) segments.push({ progressStart, progressEnd, frameStart, frameEnd });
    return [progressStart, progressEnd] as [number, number];
  };

  let previousFrame = homeStory.posterFrame;
  beats.forEach((beat) => {
    addSegment(beat.approachWeight ?? (beat.holdFrame - previousFrame) * weightPerFrame, previousFrame, beat.holdFrame);
    const plateau = addSegment(beat.holdWeight, beat.holdFrame, beat.holdFrame);
    if (beat.holdWeight > 0) plateaus.set(beat.id, plateau);
    addSegment((beat.frames[1] - beat.holdFrame) * weightPerFrame, beat.holdFrame, beat.frames[1]);
    previousFrame = beat.frames[1];
  });
  const totalWeight = cursor;
  segments.forEach((segment) => {
    segment.progressStart /= totalWeight;
    segment.progressEnd /= totalWeight;
  });
  plateaus.forEach((plateau) => {
    plateau[0] /= totalWeight;
    plateau[1] /= totalWeight;
  });

  const progressForFrame = (frame: number) => {
    const segment = segments.find(
      ({ frameStart, frameEnd }) => frame >= frameStart && frame <= frameEnd,
    );
    if (!segment) return 0;
    const distance = segment.frameEnd - segment.frameStart;
    const local = distance ? (frame - segment.frameStart) / distance : 0;
    return segment.progressStart + (segment.progressEnd - segment.progressStart) * local;
  };

  const overlayWindows = beats.flatMap<OverlayWindow>((beat) => {
    if (!beat.overlay) return [];
    if (beat.overlayFrames) {
      const hideAtEnd = beat.overlayFrames[1] < homeStory.frameCount;
      return [{
        id: beat.id,
        progressStart: progressForFrame(beat.overlayFrames[0]),
        // The closing CTA stays visible throughout the final table-setting hold.
        progressEnd: hideAtEnd ? progressForFrame(beat.overlayFrames[1]) : 1,
        hideAtEnd,
      }];
    }
    const plateau = plateaus.get(beat.id);
    return plateau ? [{
      id: beat.id,
      progressStart: plateau[0],
      progressEnd: plateau[1],
      hideAtEnd: false,
    }] : [];
  });

  return { segments, overlayWindows, progressForFrame, totalWeight, scrollScreens: homeStory.scrollScreens };
}

export const storyTimeline = buildStoryTimeline();

export const mobileStoryBeats = homeStory.beats.flatMap<StoryBeat>((source) => {
  const beat: StoryBeat = source;
  if (beat.overlay?.columns) {
    return beat.overlay.columns.map((column, index) => ({
      ...beat,
      id: `${beat.id}-${index + 1}`,
      frames: [beat.holdFrame, beat.holdFrame],
      holdWeight: beat.id === "egg-transition" ? 0.85 : 0.9,
      approachWeight: index ? 0 : beat.id === "egg-transition" ? 0.4 : 1.05,
      overlayFrames: undefined,
      overlay: { layout: "center", ...column },
    }));
  }
  if (beat.id === "carton-open-brand") {
    return [{
      ...beat,
      approachWeight: 0.6,
      holdWeight: 0.95,
      overlay: {
        layout: "brand",
        eyebrow: "Change Hospitality",
        heading: beat.overlay?.body,
      },
    }];
  }
  if (beat.id === "egg-in-hand") {
    return [{
      ...beat,
      approachWeight: 0.5,
      holdWeight: 1.05,
      overlay: { ...beat.overlay!, heading: "We\u2019re good eggs" },
    }];
  }
  if (beat.id === "egg-zoom") return [{ ...beat, approachWeight: 0.45 }];
  if (beat.id === "plate-center-next") return [{ ...beat, holdWeight: 1.1, approachWeight: 0 }];
  if (beat.id === "final-plate") {
    return [{ ...beat, holdFrame: 305, holdWeight: 0.75, approachWeight: 0.4, overlayFrames: undefined }];
  }
  return [beat];
});

const mobileTimeline = buildStoryTimeline(mobileStoryBeats);
export const mobileStoryTimeline = {
  ...mobileTimeline,
  overlayWindows: mobileTimeline.overlayWindows.map((window, index) =>
    index === 0 ? { ...window, progressStart: 0 } : window),
};

// Keep a fractional playhead: coded transforms must not step at the source FPS.
// Only the image-sequence renderer rounds this value to an image number.
export function frameForProgress(progress: number, timeline = storyTimeline) {
  const safe = clamp(progress, 0, 1);
  const segment = timeline.segments.find(
    (item) => safe >= item.progressStart && safe <= item.progressEnd,
  ) ?? timeline.segments.at(-1);
  if (!segment) return homeStory.posterFrame;
  const length = segment.progressEnd - segment.progressStart;
  const local = length ? (safe - segment.progressStart) / length : 1;
  return segment.frameStart + (segment.frameEnd - segment.frameStart) * clamp(local, 0, 1);
}