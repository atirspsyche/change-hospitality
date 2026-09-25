import { homeStory } from "../data/homeStory.ts";

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

function buildStoryTimeline() {
  const totalWeight = homeStory.beats.reduce(
    (total, beat) => total + beat.travelWeight + beat.holdWeight + beat.exitWeight,
    0,
  );
  const segments: FrameSegment[] = [];
  const plateaus = new Map<string, [number, number]>();
  let cursor = 0;

  const addSegment = (weight: number, frameStart: number, frameEnd: number) => {
    const progressStart = cursor / totalWeight;
    cursor += weight;
    const progressEnd = cursor / totalWeight;
    if (weight > 0) segments.push({ progressStart, progressEnd, frameStart, frameEnd });
    return [progressStart, progressEnd] as [number, number];
  };

  homeStory.beats.forEach((beat) => {
    addSegment(beat.travelWeight, beat.frames[0], beat.holdFrame);
    const plateau = addSegment(beat.holdWeight, beat.holdFrame, beat.holdFrame);
    if (beat.holdWeight > 0) plateaus.set(beat.id, plateau);
    addSegment(beat.exitWeight, beat.holdFrame, beat.frames[1]);
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

  const overlayWindows = homeStory.beats.flatMap<OverlayWindow>((beat) => {
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

  return { segments, overlayWindows, progressForFrame };
}

export const storyTimeline = buildStoryTimeline();

// Keep a fractional playhead: coded transforms must not step at the source FPS.
// Only the image-sequence renderer rounds this value to an image number.
export function frameForProgress(progress: number) {
  const safe = clamp(progress, 0, 1);
  const segment = storyTimeline.segments.find(
    (item) => safe >= item.progressStart && safe <= item.progressEnd,
  ) ?? storyTimeline.segments.at(-1);
  if (!segment) return homeStory.posterFrame;
  const length = segment.progressEnd - segment.progressStart;
  const local = length ? (safe - segment.progressStart) / length : 1;
  return segment.frameStart + (segment.frameEnd - segment.frameStart) * clamp(local, 0, 1);
}