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
  frameCount: 340,
  framePadding: 4,
  extension: "webp",
  scrollScreens: 20,
  initialChunkSize: 24,
  streamChunkSize: 16,
  desktopFramePrefix: "/story_sequence/",
  mobileFramePrefix: "/story_sequence/mobile/frame_",
  mobileFramesAvailable: false,
  posterFrame: 1,
  fallbackFrame: 340,
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
      label: "Egg held on the right",
      frames: [41, 80],
      holdFrame: 80,
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
      id: "egg-close-up",
      label: "Clean egg close-up",
      frames: [81, 120],
      holdFrame: 120,
      travelWeight: 0.75,
      holdWeight: 1.35,
      exitWeight: 0,
      overlay: {
        layout: "center",
        eyebrow: "The right pick",
        heading: "Talent is personal.",
        body: "We meet people face to face, learn what makes them tick and introduce them to places where they can do their best work.",
        action: { label: "Meet the team", href: "/team/", tone: "mint" },
      },
    },
    {
      id: "egg-transition",
      label: "Egg transition with copy on both sides",
      frames: [121, 194],
      holdFrame: 132,
      travelWeight: 0.55,
      holdWeight: 0,
      exitWeight: 1,
      overlayFrames: [132, 194],
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
      frames: [195, 225],
      holdFrame: 225,
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
      frames: [226, 267],
      holdFrame: 267,
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
      frames: [268, 300],
      holdFrame: 300,
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
      frames: [300, 340],
      holdFrame: 340,
      travelWeight: 0.5,
      holdWeight: 1.5,
      exitWeight: 0,
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
  ] satisfies StoryBeat[],
};

export function getStoryFrameUrl(
  frame: number,
  prefix = homeStory.desktopFramePrefix,
) {
  return `${prefix}${String(frame).padStart(homeStory.framePadding, "0")}.${homeStory.extension}`;
}