export type StoryLayout =
  | "brand"
  | "left"
  | "right"
  | "split"
  | "center"
  | "sides"
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

export interface StoryOverlay {
  layout: StoryLayout;
  eyebrow?: string;
  heading?: string;
  body?: string;
  action?: StoryAction;
  columns?: [StoryColumn, StoryColumn];
}

export interface StoryBeat {
  id: string;
  label: string;
  frames: [number, number];
  holdFrame: number;
  travelWeight: number;
  holdWeight: number;
  exitWeight: number;
  overlay?: StoryOverlay;
}

export const homeStory = {
  frameCount: 302,
  framePadding: 3,
  extension: "avif",
  scrollScreens: 17,
  initialChunkSize: 24,
  streamChunkSize: 16,
  desktopFramePrefix: "/story_sequence/frame_",
  mobileFramePrefix: "/story_sequence/mobile/frame_",
  mobileFramesAvailable: false,
  posterFrame: 1,
  fallbackFrame: 302,
  beats: [
    {
      id: "carton-closed",
      label: "Egg carton, closed",
      frames: [1, 28],
      holdFrame: 20,
      travelWeight: 0.45,
      holdWeight: 1.25,
      exitWeight: 0.35,
      overlay: {
        layout: "brand",
        eyebrow: "People first / Since 2004",
        heading: "Change Hospitality",
        body: "Hospitality recruitment, cracked differently.",
      },
    },
    {
      id: "carton-open",
      label: "Carton open",
      frames: [29, 58],
      holdFrame: 49,
      travelWeight: 0.65,
      holdWeight: 1.15,
      exitWeight: 0.4,
      overlay: {
        layout: "left",
        eyebrow: "A better way to recruit",
        heading: "Start with the people, not the database.",
        body: "For more than twenty years, we have built hospitality teams through proper conversations, sharp instincts and relationships that last.",
        action: { label: "Find talent", href: "#divisions", tone: "citron" },
      },
    },
    {
      id: "eggs-in-carton",
      label: "Eggs in carton",
      frames: [59, 86],
      holdFrame: 77,
      travelWeight: 0.75,
      holdWeight: 0.15,
      exitWeight: 0.55,
    },
    {
      id: "egg-picked",
      label: "Hand picks an egg",
      frames: [87, 116],
      holdFrame: 108,
      travelWeight: 0.7,
      holdWeight: 1.05,
      exitWeight: 0.4,
      overlay: {
        layout: "right",
        eyebrow: "The right pick",
        heading: "Talent is personal.",
        body: "We meet people face to face, learn what makes them tick and introduce them to places where they can do their best work.",
        action: { label: "Meet the team", href: "/team/", tone: "mint" },
      },
    },
    {
      id: "egg-cracking",
      label: "Egg cracking close-up",
      frames: [117, 143],
      holdFrame: 136,
      travelWeight: 0.8,
      holdWeight: 0.1,
      exitWeight: 0.5,
    },
    {
      id: "egg-splits",
      label: "Egg splits apart",
      frames: [144, 170],
      holdFrame: 164,
      travelWeight: 0.8,
      holdWeight: 0.1,
      exitWeight: 0.5,
    },
    {
      id: "egg-in-pan",
      label: "Fried egg in pan",
      frames: [171, 207],
      holdFrame: 198,
      travelWeight: 0.8,
      holdWeight: 1.55,
      exitWeight: 0.45,
      overlay: {
        layout: "split",
        columns: [
          {
            eyebrow: "For businesses",
            heading: "Build a brilliant service.",
            body: "Permanent, temporary and contract talent across front of house, back of house, events and commercial roles.",
            action: { label: "Find talent", href: "#divisions", tone: "cream" },
          },
          {
            eyebrow: "For people",
            heading: "Find work that fits.",
            body: "Straight-talking support, roles worth moving for and consultants who know your corner of hospitality.",
            action: { label: "Find work", href: "#opportunities", tone: "citron" },
          },
        ],
      },
    },
    {
      id: "egg-tossed",
      label: "Egg tossed from pan",
      frames: [208, 236],
      holdFrame: 228,
      travelWeight: 0.75,
      holdWeight: 1,
      exitWeight: 0.45,
      overlay: {
        layout: "center",
        eyebrow: "Good chemistry matters",
        heading: "The right match changes the whole service.",
      },
    },
    {
      id: "egg-on-plate",
      label: "Egg settling on plate",
      frames: [237, 270],
      holdFrame: 263,
      travelWeight: 0.75,
      holdWeight: 1.15,
      exitWeight: 0.4,
      overlay: {
        layout: "sides",
        columns: [
          {
            eyebrow: "Twenty years",
            heading: "Instinct, earned.",
            body: "We know the pace, pressure and personalities behind great hospitality.",
          },
          {
            eyebrow: "Face to face",
            heading: "Trust, served daily.",
            body: "Every introduction starts with listening and ends with a human handoff.",
          },
        ],
      },
    },
    {
      id: "plated-breakfast",
      label: "Final plated breakfast",
      frames: [271, 302],
      holdFrame: 302,
      travelWeight: 0.9,
      holdWeight: 1.75,
      exitWeight: 0,
      overlay: {
        layout: "closing",
        eyebrow: "Ready when you are",
        heading: "Your next move is on the pass.",
        body: "Explore live hospitality roles or tell us who your team needs next.",
        action: { label: "See live jobs", href: "#opportunities", tone: "flame" },
      },
    },
  ] satisfies StoryBeat[],
};

export function getStoryFrameUrl(frame: number, prefix = homeStory.desktopFramePrefix) {
  return `${prefix}${String(frame).padStart(homeStory.framePadding, "0")}.${homeStory.extension}`;
}