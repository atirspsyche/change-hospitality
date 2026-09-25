import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { homeStory, getStoryFrameUrl } from "../data/homeStory.ts";
import { frameForProgress, storyTimeline } from "./homeStoryTimeline.ts";
import { getStoryScene, sequenceFrameForPosition, storySequenceFrames } from "./homeStoryScene.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} ≠ ${expected}`);
const { animation } = homeStory;

test("the new storyboard holds only at 40, 70, 213, 253, 259 and 279", () => {
  const plateaus = storyTimeline.segments.filter((segment) => segment.frameStart === segment.frameEnd);
  assert.deepEqual(plateaus.map((segment) => segment.frameStart), [40, 70, 213, 253, 259, 279]);
  assert.ok(!homeStory.beats.some((beat) => beat.id === "egg-close-up"));
  for (const plateau of plateaus) {
    close(frameForProgress((plateau.progressStart + plateau.progressEnd) / 2), plateau.frameStart);
  }
  close(frameForProgress(0), 1);
  close(frameForProgress(1), 279);
});

test("logical frames stay fractional through coded animations", () => {
  for (const frame of [55.125, 60.25, 65.75, 66.999, 67.125, 69.5, 73.75, 83.5, 84.125, 96.5, 109, 120.25, 131.75, 138, 266.5, 274.125]) {
    close(frameForProgress(storyTimeline.progressForFrame(frame)), frame);
  }
  const forward = Array.from({ length: 1001 }, (_, i) => frameForProgress(i / 1000));
  assert.ok(forward.every((frame, index) => index === 0 || frame >= forward[index - 1]));
});

test("transition copy starts after the shells exit and closing copy spans the final hold", () => {
  const transition = storyTimeline.overlayWindows.find((overlay) => overlay.id === "egg-transition");
  close(transition.progressStart, storyTimeline.progressForFrame(138));
  close(transition.progressEnd, storyTimeline.progressForFrame(182));
  assert.equal(transition.hideAtEnd, true);
  const closing = storyTimeline.overlayWindows.find((overlay) => overlay.id === "final-plate");
  close(closing.progressStart, storyTimeline.progressForFrame(266));
  close(closing.progressEnd, 1);
  assert.equal(closing.hideAtEnd, false);
});

test("streaming and neighbour prefetch never request replaced or missing frames", () => {
  const replaced = (frame) => (frame >= 67 && frame <= 108) || (frame >= 120 && frame <= 137) || frame >= 267;
  assert.ok(storySequenceFrames.every((frame) => !replaced(frame)));
  assert.ok(storySequenceFrames.includes(109)); // texture handoff only
  for (let position = 1; position <= 279; position += 0.125) {
    for (const offset of [0, 1, -1, 2, -2]) {
      assert.ok(!replaced(sequenceFrameForPosition(Math.min(279, Math.max(1, position + offset)))));
    }
  }
  for (const frame of [...storySequenceFrames, homeStory.fallbackFrame]) {
    assert.ok(existsSync(new URL(`../../public${getStoryFrameUrl(frame)}`, import.meta.url)));
  }
  for (const { src } of Object.values(animation.sprites)) {
    assert.ok(existsSync(new URL(`../../public${src}`, import.meta.url)));
  }
});

test("coded transitions switch back to the correct sequence frames", () => {
  for (const [position, kind, background] of [
    [54, "sequence", 54], [55, "hand", "handEgg"], [60, "hand", "handEgg"], [66.999, "hand", "handEgg"],
    [67, "hand", "handEgg"], [70, "hand", "handEgg"], [83, "hand", "handEgg"],
    [84, "zoom", "handEgg"], [109.5, "zoom", "handEgg"],
    [110, "sequence", 110], [119.999, "sequence", 119],
    [120, "shells", 138], [138, "shells", 138], [139, "sequence", 139],
    [265, "sequence", 265], [266, "cutlery", 266], [279, "cutlery", 266],
  ]) {
    const scene = getStoryScene(position, 1440, 900);
    assert.equal(scene.kind, kind);
    assert.equal(scene.layers[0].asset, background);
  }
  assert.ok(!getStoryScene(138, 1440, 900).layers.some((layer) => typeof layer.asset === "string"));
  assert.equal(getStoryScene(109, 1440, 900).layers.at(-1).opacity, 1);
});

test("frames 55–66 keep the carton sequence in front of the coded hand", () => {
  for (let frame = 55; frame < 67; frame += 0.125) {
    const scene = getStoryScene(frame, 1450, 768);
    const carton = Math.min(66, Math.round(frame));
    assert.equal(scene.kind, "hand");
    assert.deepEqual(scene.layers.map((layer) => layer.asset), ["handEgg", carton]);
    assert.equal(sequenceFrameForPosition(frame), carton);
    assert.ok(storySequenceFrames.includes(carton), `carton frame ${carton} must still load`);
    assert.equal(scene.layers[0].opacity ?? 1, 1);
    assert.equal(scene.layers[1].opacity ?? 1, 1);
    assert.equal(scene.layers[1].rotation, undefined);
    close(scene.layers[1].height, 768);
    getStoryScene(100, 2560, 1080);
    assert.deepEqual(getStoryScene(frame, 1450, 768), scene);
  }
  assert.deepEqual(getStoryScene(67, 1450, 768).layers.map((layer) => layer.asset), ["handEgg"]);
  for (let frame = 54; frame <= 110; frame += 0.125) {
    const numericAssets = getStoryScene(frame, 1450, 768).layers
      .filter((layer) => typeof layer.asset === "number").map((layer) => layer.asset);
    assert.ok(numericAssets.every((asset) => asset === sequenceFrameForPosition(frame)));
  }
});

// Apply the same pivot rotation as the canvas without needing a DOM in tests.
function transformedPoint(layer, point) {
  const scale = layer.width / animation.referenceWidth;
  const x = layer.x + point.x * scale;
  const y = layer.y + point.y * scale;
  if (!layer.rotation) return { x, y };
  const { radians, x: cx, y: cy } = layer.rotation;
  return {
    x: cx + (x - cx) * Math.cos(radians) - (y - cy) * Math.sin(radians),
    y: cy + (x - cx) * Math.sin(radians) + (y - cy) * Math.cos(radians),
  };
}

test("hand key poses match the reference at its original aspect ratio", () => {
  for (const pose of animation.hand.poses) {
    const layer = getStoryScene(pose.frame, 1920, 1080).layers.find((layer) => layer.asset === "handEgg");
    close(layer.rotation.radians, pose.rotation * Math.PI / 180);
    close(layer.width / animation.referenceWidth, pose.scale);
    close(layer.rotation.x, pose.x);
    close(layer.rotation.y, pose.y);
  }
  const middle = getStoryScene(73, 1920, 1080).layers[0];
  close(middle.rotation.radians, (70.5 + 87.8) / 2 * Math.PI / 180);
});

for (const [width, height] of [[1440, 900], [1438, 768], [1512, 982], [1920, 1080], [2560, 1080], [3440, 1440], [5120, 1440], [390, 844], [320, 568], [1024, 600]]) {
  test(`${width}×${height}: height-fit, offscreen shell exits and visible final cutlery`, () => {
    const scale = height / animation.referenceHeight;
    const ordinary = getStoryScene(40, width, height).layers[0];
    close(ordinary.height, height);
    close(ordinary.width, animation.referenceWidth * scale);
    close(ordinary.x, (width - ordinary.width) / 2);

    const nearExit = getStoryScene(137.999, width, height);
    const left = nearExit.layers.find((layer) => layer.asset === "leftShell" && !layer.crop);
    const right = nearExit.layers.find((layer) => layer.asset === "rightShell" && !layer.crop);
    assert.ok(left.x + animation.sprites.leftShell.bounds.right * scale < 0);
    assert.ok(right.x + animation.sprites.rightShell.bounds.left * scale > width);

    const start = getStoryScene(266, width, height);
    const middle = getStoryScene(272.5, width, height);
    const final = getStoryScene(279, width, height);
    for (const asset of ["fork", "knife"]) {
      const bounds = animation.sprites[asset].bounds;
      const first = start.layers.find((layer) => layer.asset === asset);
      const halfway = middle.layers.find((layer) => layer.asset === asset);
      const last = final.layers.find((layer) => layer.asset === asset);
      if (asset === "fork") assert.ok(first.x + bounds.right * scale < 0);
      else assert.ok(first.x + bounds.left * scale > width);
      assert.ok(last.x + bounds.left * scale >= 0);
      assert.ok(last.x + bounds.right * scale <= width);
      close(halfway.x, (first.x + last.x) / 2);
    }
    // Seeking backward/rebuilding after resize has no accumulated transforms.
    getStoryScene(279, width * 2, height);
    assert.deepEqual(getStoryScene(272.5, width, height), middle);
  });

  test(`${width}×${height}: hand sleeve stays offscreen and zoom has no frame-84 swap`, () => {
    for (let frame = 55; frame <= 109; frame += 0.25) {
      const layer = getStoryScene(frame, width, height).layers.find((layer) => layer.asset === "handEgg");
      assert.equal(layer.asset, "handEgg");
      assert.ok(Number.isFinite(layer.rotation.x) && Number.isFinite(layer.rotation.y));
      const [start, end] = animation.hand.sleeveEnd.map((point) => transformedPoint(layer, point));
      // Independently sample the complete cut edge, including both corners.
      for (let t = 0; t <= 1; t += 0.01) {
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        assert.ok(x < 0 || x > width || y < 0 || y > height, `sleeve visible at ${frame}: ${x}, ${y}`);
      }
      const egg = transformedPoint(layer, animation.hand.origin);
      // During the carton entrance the egg intentionally rises from below.
      if (frame >= 63) assert.ok(egg.x > 0 && egg.x < width && egg.y > 0 && egg.y < height, `egg offscreen at ${frame}`);
    }
    // Removing the last carton layer must not reset the hand's transform.
    const cartonEnd = getStoryScene(67 - 0.000001, width, height).layers.find((layer) => layer.asset === "handEgg");
    const handOnly = getStoryScene(67, width, height).layers[0];
    for (const key of ["x", "y", "width", "height"]) {
      assert.ok(Math.abs(cartonEnd[key] - handOnly[key]) < 0.01);
    }
    close(cartonEnd.rotation.radians, handOnly.rotation.radians);
    const before = getStoryScene(84 - 0.000001, width, height).layers[0];
    const after = getStoryScene(84, width, height).layers[0];
    for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(before[key] - after[key]) < 0.01);
    close(before.rotation.radians, after.rotation.radians);
    const held = getStoryScene(70, width, height);
    getStoryScene(100, width * 2, height);
    assert.deepEqual(getStoryScene(70, width, height), held);
    const hold = storyTimeline.segments.find((segment) => segment.frameStart === 70 && segment.frameEnd === 70);
    assert.deepEqual(getStoryScene(frameForProgress((hold.progressStart + hold.progressEnd) / 2), width, height), held);
  });
}