# Global Design Tokens

## Colors

- **Obsidian Black** (#0D0D0D) – Primary background
- **Champagne Gold** (#D4C3B3) – Primary accent (luxury, high-end hospitality)
- **B-Corp Green** (#2E5A44) – Secondary accent (used specifically for sustainability/impact sections)
- **Off-White** (#FBF9F6) – Typography and light background sections

## Typography

- **Headings:** A sophisticated editorial Serif (e.g., Cormorant Garamond or Ogg)
- **Body/UI:** A highly readable, technical Sans-Serif (e.g., Plus Jakarta Sans)

## Section 1: The Cinematic Hero (The Hook)

**Concept:** A premium, atmospheric entrance that instantly communicates luxury hospitality while prompting immediate action.

```
+--------------------------------------------------------+
|  [Logo]              [Navigation Menu]       [B-Corp]  |
|                                                        |
|             PEOPLE-FIRST RECRUITMENT FOR               |
|               THE HOSPITALITY INDUSTRY                 |
|                                                        |
|         +-----------------+   +-----------------+      |
|         |   FIND TALENT   |   |    FIND WORK    |      |
|         +-----------------+   +-----------------+      |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- A full-viewport `<section class="relative h-screen w-full overflow-hidden bg-obsidian">`.
- An absolute-positioned background `<video>` playing a muted, high-contrast, ambient montage of high-end kitchen preparation, elegant front-of-house service, and high-energy bar operations.
- A dark gradient overlay (`bg-gradient-to-t from-obsidian via-transparent to-obsidian/50`) to ensure text contrast remains excellent.
- A centered vertical layout with an h1 displaying editorial serif text, followed by two large, minimalist split buttons: "Find Talent" and "Find Work".

### Animations & Scroll Effects:

- **Intro Load:** On page load, the video opacity fades in from 0 to 0.4 over 1.5 seconds. The text uses a "split-text" effect, where individual lines or words slide up into view from a hidden clip-path (overflow-hidden).
- **Scroll Behavior:** As the user scrolls down, the entire hero section slowly scales down (from scale: 1 to scale: 0.95) and fades out, while the background video slowly drifts upward in a subtle parallax effect (yPercent: 30).

## Section 2: The Philosophy Reveal (The Core)

**Concept:** Highlight Change Hospitality's core identity—their 20-year history, human-centric approach, and B-Corp certification—using a scroll-controlled reading experience.

```
+--------------------------------------------------------+
|                                                        |
|   Since 2004, we have believed that great recruitment  |
|   isn't driven by algorithms. It is built on deep      |
|   relationships, face-to-face trust, and a shared      |
|   passion for outstanding service.                     |
|                                                        |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- `<section class="relative min-h-screen w-full flex items-center justify-center bg-obsidian px-8 md:px-24">`
- A large, centered text block container holding a single paragraph of large display typography (approx. text-3xl md:text-5xl with wide line height).

### Animations & Scroll Effects:

- **Scroll-Driven Text Painting:** The text starts at a very low opacity (e.g., opacity: 0.15 in a muted off-white color).
- **GSAP Implementation:** Using GSAP ScrollTrigger with scrub: true and pinning the section. As the user scrolls, the words "paint" to full opacity/pure white one by one based on scroll progress[1]. This forces the user to slow down and digest the core brand narrative.

## Section 3: The Interactive Division Split (The Pin & Slide)

**Concept:** Showcasing their three key staffing areas: Front of House, Back of House, and Events & Commercial[2][3].

```
+--------------------------------------------------------+
| [ Sticky Section: Screen Splits Vertically ]            |
|                                                        |
|  LEFT SIDE: Text Information   | RIGHT SIDE: Visual    |
|  - Front of House              | - Elegant dining image|
|  - Back of House               | - Chef prepping image |
|  - Events & Commercial         | - Event styling image |
|                                                        |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- A wrapping container set to a height of 300vh to allow for scroll-scrubbing.
- An inner sticky layout (`sticky top-0 h-screen w-full flex flex-col md:flex-row overflow-hidden`).
- **Left Side (Text Panel):** Fixed-width panel with dynamic text blocks that fade in and out.
- **Right Side (Image Canvas):** A masking container containing three absolute-positioned layers, each with a high-resolution, rich image corresponding to a division.

### Animations & Scroll Effects:

- **GSAP Pinning & Clipping:** The section pins in place for the duration of the scroll.
- As the user scrolls, the right side uses a clip-path animation (e.g., vertical wipes or diagonal blinds) to transition seamlessly between the "Front of House" dining image, the "Back of House" kitchen image, and the "Events" image.
- Simultaneously, the active category title on the left side scales up slightly, shifting color from muted grey to Champagne Gold, while the supporting description updates with a quick cross-fade.

## Section 4: The B-Corp Impact Tracker (The "Ethical" Engine)

**Concept:** Celebrate their verified B-Corp status (overall score of 85.5) and their environmental accomplishments (such as tree planting via Ecologi)[4][5].

```
+--------------------------------------------------------+
|                    OUR IMPACT FOR GOOD                 |
|                                                        |
|      [ B-Corp Logo ]       [ Impact Rating ]           |
|                                                        |
|         85.5                    20,000+                |
|      B Impact Score          Trees Planted             |
|                                                        |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- `<section class="relative py-24 bg-obsidian border-t border-b border-white/10 flex flex-col items-center">`
- A clean, multi-column grid layout containing their official B-Corp seal, their rating numbers, and key environmental metrics[5].

### Animations & Scroll Effects:

- **SVG Path Draw:** When this section enters the viewport, a custom-designed SVG outline of the B-Corp circle or a tree-growth graphic draws itself on screen (stroke-dashoffset animation).
- **Dynamic Number Counting:** Numbers (like the 85.5 score or the trees planted) use a GSAP ticker to count up rapidly from zero to their actual values once the section is 20% in view[5]. This adds a technical, live feel to static data.

## Section 5: The "Live Opportunities" Stream (Dynamic Interactive Element)

**Concept:** A highly visual, real-time-feeling job carousel to encourage candidate engagement.

```
+--------------------------------------------------------+
|  LATEST OPPORTUNITIES                         [View All] |
|                                                        |
|  +--------------+  +--------------+  +--------------+  |
|  | Sous Chef    |  | Cafe Manager |  | Sales Mgr    |  |
|  | London       |  | London       |  | London       |  |
|  | £50k         |  | £34k         |  | £32k         |  |
|  +--------------+  +--------------+  +--------------+  |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- `<section class="py-24 bg-obsidian pl-8 md:pl-24 overflow-hidden">`
- Since this pulls data dynamically (via Vercel serverless functions from their ATS API), use an Astro component populated at build time, or hydrated on the client side using `<JobBoard client:visible />`[4].
- A horizontal, draggable/swipeable slider containing minimal job cards (showing Role, Location, Salary, and Type)[4].

### Animations & Scroll Effects:

- **Custom Cursor Interaction:** When the user's mouse hovers over the job carousel, a custom CSS/JS cursor emerges, transforming into a floating Champagne Gold bubble that says "Drag to Explore" or "View".
- **Hover Physics:** When hovering over individual cards, the card scales up slightly (scale: 1.03), and a subtle internal image or colored accent background slides in from the bottom of the card utilizing CSS transitions (`transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)`).

## Section 6: Client Endorsements & Social Proof

**Concept:** Showcasing testimonials from major hospitality operators with high-end, smooth editorial layouts[1].

```
+--------------------------------------------------------+
|                                                        |
|   "Beth at Change Hospitality brings a dedicated and    |
|   personal approach... always delivering reliable,      |
|   high-quality chefs."                                 |
|                                                        |
|   — [ Client Name, Venue Title ]                       |
|                                                        |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- `<section class="min-h-[80vh] flex flex-col justify-center bg-obsidian text-off-white px-8 md:px-32">`
- An asymmetrical layout: a large quote on one side, and a floating card layout on the other containing the client/venue details.

### Animations & Scroll Effects:

- **The Card-Stack Reveal:** Multiple client testimonials are stacked vertically. As the user scrolls, the cards slide over one another in a "deck-shifting" animation using GSAP pinning, meaning each card slides upward, covering the previous one while scaling down slightly to create a sense of depth.

## Section 7: The Transition to Action (The Footer Trigger)

**Concept:** Reversing the visual contrast to signal the end of the homepage journey, prompting candidates and clients to make contact.

```
+--------------------------------------------------------+
|  [ Dark Mode Obsidian transitions to Light Champagne ]|
|                                                        |
|                 READY TO MAKE THE CHANGE?              |
|                                                        |
|         +-------------------------------------+        |
|         |          GET IN TOUCH               |        |
|         +-------------------------------------+        |
+--------------------------------------------------------+
```

### HTML/Astro Structure:

- A massive CTA section that transitions into a clean, modern footer[4].
- `<section class="bg-champagne text-obsidian py-32 flex flex-col items-center text-center">`[4]

### Animations & Scroll Effects:

- **The Contrast Inversion:** As this section enters the bottom of the viewport, the page background color of the entire window dynamically shifts from deep Obsidian Black to rich Champagne Gold. This is achieved by animating the body background color via GSAP ScrollTrigger based on the section's entry. This color transition creates a striking, physical change that draws focus directly to the final "Get in Touch" buttons and links.
