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

export interface StoryOverlay {
  layout: StoryLayout;
  eyebrow?: string;
  heading?: string;
  body?: string;
  action?: StoryAction;
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
        body: "Hospitality recruitment, cracked differently.",
      },
    },
    {
      id: "egg-in-hand",
      label: "Egg held on the right",
      frames: [41, 65],
      holdFrame: 65,
      travelWeight: 0.55,
      holdWeight: 1.15,
      exitWeight: 0,
      overlay: {
        layout: "left",
        eyebrow: "A better way to recruit",
        heading: "Start with the people, not the database.",
        body: "For more than twenty years, we have built hospitality teams through proper conversations, sharp instincts and relationships that last.",
        action: { label: "Find talent", href: "#divisions", tone: "citron" },
      },
    },
    {
      id: "egg-close-up",
      label: "Clean egg close-up",
      frames: [66, 103],
      holdFrame: 103,
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
      frames: [104, 175],
      holdFrame: 132,
      travelWeight: 0.55,
      holdWeight: 0,
      exitWeight: 1,
      overlayFrames: [132, 175],
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
      id: "egg-four-ways",
      label: "Egg with copy on all four sides",
      frames: [176, 185],
      holdFrame: 185,
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
      frames: [186, 250],
      holdFrame: 250,
      travelWeight: 1.1,
      holdWeight: 1.3,
      exitWeight: 0,
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
      id: "plate-left",
      label: "Plate on the left",
      frames: [251, 280],
      holdFrame: 280,
      travelWeight: 0.65,
      holdWeight: 1.3,
      exitWeight: 0,
      overlay: {
        layout: "right",
        eyebrow: "Ready when you are",
        heading: "Your next move is on the pass.",
        body: "Explore live hospitality roles or tell us who your team needs next.",
        action: { label: "See live jobs", href: "#opportunities", tone: "flame" },
      },
    },
    {
      id: "final-plate",
      label: "Final plated breakfast",
      frames: [281, 302],
      holdFrame: 302,
      travelWeight: 0.5,
      holdWeight: 1.5,
      exitWeight: 0,
      overlay: {
        layout: "bottom",
        heading: "Good people make great hospitality.",
        action: { label: "Start a conversation", href: "#apply", tone: "citron" },
      },
    },
  ] satisfies StoryBeat[],
};

export function getStoryFrameUrl(frame: number, prefix = homeStory.desktopFramePrefix) {
  return `${prefix}${String(frame).padStart(homeStory.framePadding, "0")}.${homeStory.extension}`;
}