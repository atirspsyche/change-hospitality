import { homeStory } from "../data/homeStory.ts";
import { clamp } from "./homeStoryTimeline.ts";

export type StorySprite = keyof typeof homeStory.animation.sprites;
export type StoryAsset = number | StorySprite;

export interface StoryLayer {
  asset: StoryAsset;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  // Canvas-space pivot; all geometry remains height-fitted before rotation.
  rotation?: { radians: number; x: number; y: number };
  // Source rectangles use the original artboard coordinates, not device pixels.
  crop?: { x: number; y: number; width: number; height: number };
}

export interface StoryScene {
  kind: "sequence" | "hand" | "zoom" | "shells" | "cutlery";
  layers: StoryLayer[];
}

const { animation } = homeStory;
const { referenceWidth, referenceHeight, hand, zoom, shells, cutlery, sprites } = animation;
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;
const progressIn = (frame: number, range: readonly [number, number]) =>
  clamp((frame - range[0]) / (range[1] - range[0]), 0, 1);

// These images are reused for whole coded ranges. Keep them decoded and never
// download the baked-in hand/zoom/shell/cutlery frames they replace.
export const storyKeyFrames = [zoom.matchFrame, shells.backgroundFrame, cutlery.backgroundFrame];

export function sequenceFrameForPosition(frame: number) {
  // The entrance still needs its carton layer, even while the hand is coded.
  // Clamp fractional positions before 67 to the last carton export (66).
  if (frame < hand.cartonFrames[1] + 1) return clamp(Math.round(frame), 1, hand.cartonFrames[1]);
  // The hand itself needs no sequence image; keep only its zoom handoff cached.
  if (frame >= hand.frames[0] && frame < zoom.frames[1] + 1) return zoom.matchFrame;
  if (frame >= shells.frames[0] && frame < shells.frames[1] + 1) return shells.backgroundFrame;
  if (frame >= cutlery.frames[0]) return cutlery.backgroundFrame;
  // Do not round into the first baked shell image on the approach to frame 120.
  if (frame > zoom.frames[1] && frame < shells.frames[0]) return Math.min(119, Math.round(frame));
  return clamp(Math.round(frame), 1, homeStory.frameCount);
}

export const storySequenceFrames = Array.from(
  { length: homeStory.frameCount }, (_, index) => index + 1,
).filter((frame) => sequenceFrameForPosition(frame) === frame || storyKeyFrames.includes(frame));

function handPoseForPosition(frame: number) {
  const endIndex = hand.poses.findIndex((pose) => pose.frame >= frame);
  if (endIndex === -1) return hand.poses[hand.poses.length - 1];
  if (endIndex === 0) return hand.poses[0];
  const start = hand.poses[endIndex - 1];
  const end = hand.poses[endIndex];
  const progress = progressIn(frame, [start.frame, end.frame]);
  return {
    rotation: mix(start.rotation, end.rotation, progress),
    scale: mix(start.scale, end.scale, progress),
    x: mix(start.x, end.x, progress),
    y: mix(start.y, end.y, progress),
  };
}

type Point = { x: number; y: number };

// Find the smallest translation along the sleeve's outward normal that puts
// its cut edge outside the viewport. Segment/rectangle separating axes avoid
// unnecessary movement when the edge is already beyond the bottom-right corner.
// No stretching, extra artwork, or accumulated transforms are needed.
function sleeveExitOffset(start: Point, end: Point, width: number, height: number, padding: number): Point {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const outward = { x: (end.y - start.y) / length, y: (start.x - end.x) / length };
  let distance = Infinity;
  for (const axis of [{ x: 1, y: 0 }, { x: 0, y: 1 }, outward]) {
    const a = start.x * axis.x + start.y * axis.y;
    const b = end.x * axis.x + end.y * axis.y;
    const edgeMin = Math.min(a, b);
    const edgeMax = Math.max(a, b);
    const margin = padding * (Math.abs(axis.x) + Math.abs(axis.y));
    const viewportMin = Math.min(0, width * axis.x) + Math.min(0, height * axis.y) - margin;
    const viewportMax = Math.max(0, width * axis.x) + Math.max(0, height * axis.y) + margin;
    if (edgeMin >= viewportMax || edgeMax <= viewportMin) return { x: 0, y: 0 };
    const velocity = outward.x * axis.x + outward.y * axis.y;
    if (velocity > 0.000001) distance = Math.min(distance, (viewportMax - edgeMin) / velocity);
    else if (velocity < -0.000001) distance = Math.min(distance, (viewportMin - edgeMax) / velocity);
  }
  return { x: outward.x * distance, y: outward.y * distance };
}

export function getStoryScene(position: number, viewportWidth: number, viewportHeight: number): StoryScene {
  const frame = clamp(position, 1, homeStory.frameCount);
  const scale = viewportHeight / referenceHeight;
  const width = referenceWidth * scale;
  const x = (viewportWidth - width) / 2;
  const layers: StoryLayer[] = [];
  const image = (asset: StoryAsset, offsetX = x, opacity = 1) => {
    layers.push({ asset, x: offsetX, y: 0, width, height: viewportHeight, opacity });
  };

  // Keep all main artwork height-fitted. On ultrawide screens only the opaque
  // outer texture is extended; neither the egg seam nor the pan is stretched.
  const extendEdge = (asset: StoryAsset, side: "left" | "right", edge: number, opacity = 1) => {
    const extra = side === "left" ? edge : viewportWidth - edge;
    if (extra <= 0) return;
    layers.push({
      asset, x: side === "left" ? 0 : edge, y: 0,
      width: extra, height: viewportHeight, opacity,
      crop: { x: side === "left" ? 0 : referenceWidth - 1, y: 0, width: 1, height: referenceHeight },
    });
  };
  const texture = (asset: number, opacity = 1) => {
    image(asset, x, opacity);
    extendEdge(asset, "left", x, opacity);
    extendEdge(asset, "right", x + width, opacity);
  };

  if (frame >= hand.frames[0] && frame < zoom.frames[1] + 1) {
    const pose = handPoseForPosition(Math.min(frame, hand.frames[1]));
    const radians = pose.rotation * Math.PI / 180;
    const handScale = scale * pose.scale;
    const egg = { x: x + pose.x * scale, y: pose.y * scale };
    const transform = (point: Point): Point => {
      const dx = (point.x - hand.origin.x) * handScale;
      const dy = (point.y - hand.origin.y) * handScale;
      return {
        x: egg.x + dx * Math.cos(radians) - dy * Math.sin(radians),
        y: egg.y + dx * Math.sin(radians) + dy * Math.cos(radians),
      };
    };
    const offset = sleeveExitOffset(
      transform(hand.sleeveEnd[0]), transform(hand.sleeveEnd[1]),
      viewportWidth, viewportHeight, hand.edgePadding * handScale,
    );
    egg.x += offset.x;
    egg.y += offset.y;

    const isZoom = frame >= zoom.frames[0];
    const progress = isZoom ? progressIn(frame, zoom.frames) : 0;
    // Enough magnification to fill even an ultrawide viewport with the egg.
    const endScale = Math.max(zoom.endScale, viewportWidth / (280 * scale));
    const magnification = Math.pow(endScale, progress);
    const drawScale = handScale * magnification;
    const pivot = {
      x: mix(egg.x, viewportWidth / 2, progress),
      y: mix(egg.y, viewportHeight / 2, progress),
    };
    layers.push({
      asset: "handEgg",
      x: pivot.x - hand.origin.x * drawScale,
      y: pivot.y - hand.origin.y * drawScale,
      width: referenceWidth * drawScale,
      height: referenceHeight * drawScale,
      rotation: { radians, ...pivot },
    });
    if (frame >= hand.cartonFrames[0] && frame < hand.cartonFrames[1] + 1) {
      // The transparent carton sequence is foreground: its lid hides the hand
      // as it rises. Carton-only replacements retain this same layer order.
      image(sequenceFrameForPosition(frame));
    }
    // Match the actual close-up texture before handing back to frame 110.
    // The same sprite carries through frame 84; never swap to a clipped image.
    const blend = clamp((progress - zoom.textureBlendStart) / (1 - zoom.textureBlendStart), 0, 1);
    if (blend > 0) texture(zoom.matchFrame, blend);
    return { kind: isZoom ? "zoom" : "hand", layers };
  }

  if (frame >= shells.frames[0] && frame < shells.frames[1] + 1) {
    const progress = progressIn(frame, shells.frames);
    image(shells.backgroundFrame);
    // At 138 the complete pan is visible, with no shell pixels left onscreen.
    if (progress < 1) {
      const leftTravel = Math.max(0, x + sprites.leftShell.bounds.right * scale) + 2;
      const rightTravel = Math.max(0, viewportWidth - (x + sprites.rightShell.bounds.left * scale)) + 2;
      const leftX = x - leftTravel * progress;
      const rightX = x + rightTravel * progress;
      image("leftShell", leftX);
      extendEdge("leftShell", "left", leftX);
      image("rightShell", rightX);
      extendEdge("rightShell", "right", rightX + width);
    }
    return { kind: "shells", layers };
  }

  if (frame >= cutlery.frames[0]) {
    const progress = progressIn(frame, cutlery.frames);
    image(cutlery.backgroundFrame);
    const margin = Math.min(16, viewportWidth * 0.025);
    const plateLeft = x + cutlery.plateBounds.left * scale;
    const plateRight = x + cutlery.plateBounds.right * scale;

    (["fork", "knife"] as const).forEach((asset) => {
      const bounds = sprites[asset].bounds;
      const itemWidth = (bounds.right - bounds.left) * scale;
      const desired = asset === "fork"
        ? plateLeft - cutlery.gap * scale - itemWidth
        : plateRight + cutlery.gap * scale;
      // In portrait keep both utensils visible rather than losing them in the
      // height-fitted artboard's cropped sides. The plate stays height-fitted.
      const target = clamp(desired, margin, Math.max(margin, viewportWidth - margin - itemWidth));
      const start = asset === "fork" ? -itemWidth - 2 : viewportWidth + 2;
      image(asset, mix(start, target, progress) - bounds.left * scale);
    });
    return { kind: "cutlery", layers };
  }

  const sourceFrame = sequenceFrameForPosition(frame);
  if (frame > zoom.frames[1] && frame < shells.frames[0]) texture(sourceFrame);
  else image(sourceFrame);
  return { kind: "sequence", layers };
}