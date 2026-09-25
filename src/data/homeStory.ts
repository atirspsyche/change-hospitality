export type StoryLayout =
  | "brand"
  | "left"
  | "right"
  | "split"
  | "center"
  | "sides"
  | "edges"
  | "bottom"
  | "closing";

export interface StoryAction {
  label: string;
  href: string;
  tone?: "flame" | "citron" | "mint" | "cream";
}

export interface StoryColumn {
  eyebrow: string;
  heading: string;
  body: string;
  action?: StoryAction;
}

export interface StoryTypography {
  headingSize?: string;
  headingLineHeight?: string;
  headingWeight?: number;
  headingMaxWidth?: string;
  bodySize?: string;
  bodyLineHeight?: string;
  bodyWeight?: number;
  bodyMaxWidth?: string;
}

export interface StoryOverlay {
  layout: StoryLayout;
  eyebrow?: string;
  heading?: string;
  body?: string;
  action?: StoryAction;
  typography?: StoryTypography;
  columns?: [StoryColumn, StoryColumn];
  topText?: string;
  bottomText?: string;
}

export interface StoryBeat {
  id: string;
  label: string;
  frames: [number, number];
  holdFrame: number;
  travelWeight: number;
  holdWeight: number;
  exitWeight: number;
  overlayFrames?: [number, number];
  overlay?: StoryOverlay;
}

export const homeStory = {
  // Logical frames include the coded transitions, not just downloaded images.
  frameCount: 279,
  framePadding: 4,
  extension: "webp",
  scrollScreens: 20,
  initialChunkSize: 24,
  streamChunkSize: 16,
  desktopFramePrefix: "/story_sequence/",
  mobileFramePrefix: "/story_sequence/mobile/frame_",
  mobileFramesAvailable: false,
  posterFrame: 1,
  fallbackFrame: 279,
  animation: {
    referenceWidth: 1920,
    referenceHeight: 1080,
    hand: {
      frames: [55, 84] as const,
      // Keep these sequence frames ABOVE the coded hand so the carton hides it.
      // They temporarily contain a second hand; replace them in-place with
      // transparent carton-only exports on the same 1920 × 1080 artboard.
      cartonFrames: [55, 66] as const,
      // Egg centre and sleeve cut edge in the transparent cutout's artboard.
      origin: { x: 639, y: 821 },
      sleeveEnd: [{ x: 1553, y: 178 }, { x: 1742, y: 618 }] as const,
      edgePadding: 12,
      // Reference-matched poses: clockwise degrees, uniform scale, egg centre.
      // Interpolate continuously; the timeline alone owns the frame-70 hold.
      poses: [
        // The egg starts below the artboard, rising as the carton drops away.
        { frame: 55, rotation: -45.5, scale: 1.000, x: 1938, y: 1539 },
        { frame: 56, rotation: -32.2, scale: 1.000, x: 1793, y: 1514 },
        { frame: 57, rotation: -26.7, scale: 1.000, x: 1645, y: 1484 },
        { frame: 58, rotation: -17.7, scale: 1.000, x: 1571, y: 1375 },
        { frame: 59, rotation: -8.1, scale: 1.000, x: 1396, y: 1304 },
        { frame: 60, rotation: -5.7, scale: 1.000, x: 1300, y: 1195 },
        { frame: 61, rotation: 0, scale: 1.000, x: 1244, y: 1113 },
        { frame: 62, rotation: 4, scale: 1.000, x: 1231, y: 1062 },
        { frame: 63, rotation: 14.2, scale: 0.991, x: 1198, y: 945 },
        { frame: 64, rotation: 20.1, scale: 1.006, x: 1185, y: 846 },
        { frame: 65, rotation: 26.8, scale: 1.007, x: 1145, y: 803 },
        { frame: 66, rotation: 29.8, scale: 0.999, x: 1132, y: 726 },
        { frame: 67, rotation: 32.1, scale: 1.010, x: 1135, y: 703 },
        { frame: 68, rotation: 38.3, scale: 1.013, x: 1149, y: 678 },
        { frame: 70, rotation: 58.4, scale: 1.101, x: 1045, y: 606 },
        { frame: 72, rotation: 70.5, scale: 1.101, x: 1029, y: 564 },
        { frame: 74, rotation: 87.8, scale: 1.072, x: 1013, y: 467 },
        { frame: 76, rotation: 99.2, scale: 1.118, x: 969, y: 444 },
        { frame: 78, rotation: 114.9, scale: 1.152, x: 1013, y: 393 },
        { frame: 80, rotation: 123.8, scale: 1.181, x: 1031, y: 393 },
        { frame: 82, rotation: 130.3, scale: 1.336, x: 1003, y: 411 },
        { frame: 84, rotation: 132.3, scale: 1.470, x: 986, y: 427 },
      ],
    },
    zoom: {
      frames: [84, 109] as const,
      matchFrame: 109,
      endScale: 14,
      textureBlendStart: 0.85,
    },
    shells: {
      frames: [120, 138] as const,
      backgroundFrame: 138,
    },
    cutlery: {
      frames: [266, 279] as const,
      backgroundFrame: 266,
      // Plate bounds in frame 266 and the gap visible in the final reference.
      plateBounds: { left: 680, right: 1243 },
      gap: 60,
    },
    // Cutouts retain the transparent padding of their 1920 × 1080 artboards.
    // Bounds enclose the artwork, including faint edge pixels.
    sprites: {
      handEgg: {
        src: "/story_sequence/utils/hand-egg.webp",
        bounds: { left: 256, right: 1744, top: 176, bottom: 968 },
      },
      leftShell: {
        src: "/story_sequence/utils/left-egg-shell.webp",
        bounds: { left: 0, right: 1056, top: 0, bottom: 1080 },
      },
      rightShell: {
        src: "/story_sequence/utils/right-egg-shell.webp",
        bounds: { left: 984, right: 1920, top: 0, bottom: 1080 },
      },
      fork: {
        src: "/story_sequence/utils/fork.webp",
        bounds: { left: 480, right: 624, top: 232, bottom: 832 },
      },
      knife: {
        src: "/story_sequence/utils/knife.webp",
        bounds: { left: 1328, right: 1440, top: 240, bottom: 840 },
      },
    },
  },
  beats: [
    {
      id: "carton-open-brand",
      label: "Carton opens to reveal Change Hospitality",
      frames: [1, 40],
      holdFrame: 40,
      travelWeight: 0.8,
      holdWeight: 1.25,
      exitWeight: 0,
      overlay: {
        layout: "brand",
        heading: "Change Hospitality",
        body: "Specialists in hospitality recruitment and staffing",
      },
    },
    {
      id: "egg-in-hand",
      label: "Carton entrance into the coded hand, held on the right",
      frames: [41, 70],
      holdFrame: 70,
      travelWeight: 0.55,
      holdWeight: 1.15,
      exitWeight: 0,
      overlay: {
        layout: "left",
        eyebrow: "A better way to recruit",
        heading:
          "We build bridges between passionate people and the best hospitality venues",
        body: "Every placement with us is treated with care, because the right person can make or break a team. For over two decades, we've been the ones you can trust to get it right.",
        typography: {
          headingSize: "clamp(2.4rem, 4.5vw, 4.75rem)",
          bodySize: "clamp(0.9rem, 1.2vw, 1.05rem)",
        },
      },
    },
    {
      id: "egg-zoom",
      label: "Coded hand rotation into a continuous egg zoom",
      frames: [71, 109],
      holdFrame: 109,
      travelWeight: 0.75,
      holdWeight: 0,
      exitWeight: 0,
    },
    {
      id: "egg-transition",
      label: "Egg transition with copy on both sides",
      frames: [110, 182],
      holdFrame: 138,
      travelWeight: 0.55,
      holdWeight: 0,
      exitWeight: 1,
      overlayFrames: [138, 182],
      overlay: {
        layout: "split",
        columns: [
          {
            eyebrow: "For Businesses",
            heading: "Build a team that delivers.",
            body: "Permanent, temporary talent across front of house, back of house, events and commercial roles.",
            action: {
              label: "Find talent",
              href: "/recruit-talent/",
              tone: "mint",
            },
          },
          {
            eyebrow: "For Job Seekers",
            heading: "Roles with momentum.",
            body: "Whether you're ready for the next step or just seeing what's out there, discover opportunities across every corner and level of hospitality.",
            action: { label: "Explore roles", href: "/jobs/", tone: "citron" },
          },
        ],
      },
    },
    {
      id: "egg-four-ways",
      label: "Egg with copy on all four sides",
      frames: [183, 213],
      holdFrame: 213,
      travelWeight: 0.35,
      holdWeight: 1.4,
      exitWeight: 0,
      overlay: {
        layout: "edges",
        topText: "Twenty years of hospitality instinct",
        bottomText: "Events & Commercial / Permanent / Temporary / Contract",
        columns: [
          {
            eyebrow: "Front of House",
            heading: "People who set the tone.",
            body: "Warm welcomes, sharp service and leaders who make every shift click.",
          },
          {
            eyebrow: "Back of House",
            heading: "Talent behind the pass.",
            body: "Skilled kitchens, steady hands and teams built for the pace of service.",
          },
        ],
      },
    },
    {
      id: "plate-center",
      label: "Plate in the middle",
      frames: [214, 253],
      holdFrame: 253,
      travelWeight: 1.1,
      holdWeight: 1.3,
      exitWeight: 0,
      overlay: {
        layout: "sides",
        columns: [
          {
            eyebrow: "Our team",
            heading: "Consultants, not just recruiters",
            body: "We're a team with real hospitality backgrounds, who understand the industry back to front and the impeccable standards associated with it.",
            action: { label: "Meet our team", href: "/team/", tone: "citron" },
          },
          {
            eyebrow: "Our values",
            heading: "Trust, served daily.",
            body: "At the core of it all, we're a business continuously striving to look after its people and its footprint with a commitment to doing right by both.",
            action: { label: "Sustainability", href: "/sustainability-impact/", tone: "citron" },
          },
        ],
      },
    },
    {
      id: "plate-left",
      label: "Plate on the left",
      frames: [254, 259],
      holdFrame: 259,
      travelWeight: 0.65,
      holdWeight: 1.3,
      exitWeight: 0,
      overlay: {
        layout: "right",
        eyebrow: "Ready when you are",
        heading: "Your next move is on the pass.",
        body: "Explore live hospitality roles or tell us who your team needs next.",
        action: { label: "See live jobs", href: "/jobs/", tone: "flame" },
      },
    },
    {
      id: "final-plate",
      label: "Final plated breakfast",
      frames: [260, 266],
      holdFrame: 266,
      travelWeight: 0.5,
      holdWeight: 0,
      exitWeight: 0,
      overlayFrames: [266, 279],
      overlay: {
        layout: "bottom",
        heading: "Great venues deserve great teams.",
        action: {
          label: "Start a conversation",
          href: "/recruit-talent/",
          tone: "citron",
        },
      },
    },
    {
      id: "table-setting",
      label: "Fork and knife arrive beside the plate",
      frames: [266, 279],
      holdFrame: 279,
      travelWeight: 0.65,
      holdWeight: 1.5,
      exitWeight: 0,
    },
  ] satisfies StoryBeat[],
};

export function getStoryFrameUrl(
  frame: number,
  prefix = homeStory.desktopFramePrefix,
) {
  return `${prefix}${String(frame).padStart(homeStory.framePadding, "0")}.${homeStory.extension}`;
}