import { expect, test } from "@playwright/test";

const faqs = [
  {
    question: "Do you only recruit chefs and front-of-house staff?",
    answer: "No. Alongside kitchen and front-of-house teams, we recruit the people who run hospitality businesses behind the scenes: events and sales managers, HR, finance and administration, and senior leadership. That means one agency can cover your Saturday night service and your next head of operations, and both come from consultants who understand how a hospitality business really works.",
  },
  {
    question: "What kind of businesses do you work with?",
    answer: "Everyone from neighbourhood restaurants to some of the biggest names in hospitality. Our clients include five-star hotels like Four Seasons, contract caterers like BaxterStorey, cultural venues like Tate, event spaces like Tobacco Dock, and corporate dining at companies like Royal Bank of Canada. We also staff stadiums, theatres, festivals and street food events. Whatever the size of your business, you get the same consultant-led service.",
  },
  {
    question: "Do you supply hospitality staff outside London?",
    answer: "Yes. As well as our London head office, we have local teams in Greater Manchester, Hampshire and Isle of Wight, covering towns including Southampton, Portsmouth and Winchester. Because our consultants live and work in those areas, they know the local venues, the local talent and what pay rates it takes to hire there.",
  },
  {
    question: "How do you make sure staff are the right fit for my venue?",
    answer: "We match people to your venue, not just to a job title. Our consultants have worked in hospitality themselves, so they look beyond the CV at things like pace, polish and personality. We follow up after placements to check things are going well. Additionally, all Change Temporary Team members have Level 2 Food Safety, Health and Safety, Alcohol Licensing and Food Allergens training depending on their role.",
  },
  {
    question: "Should I use temporary staff or make a permanent hire?",
    answer: "It depends on what you need. Temporary staff are best for covering busy periods, events, sickness or staff shortages, often at short notice. Permanent recruitment suits roles where you need someone to grow with your team long term. For senior and leadership roles, we run a more targeted search. If you\u2019re not sure which is right, tell us what\u2019s happening in your business and we\u2019ll recommend the best option.",
  },
];

test.describe("Recruitment FAQs", () => {
  for (const javaScriptEnabled of [true, false]) {
    test.describe(`with JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, () => {
      test.use({ javaScriptEnabled });

      if (javaScriptEnabled) {
        test("smoothly animates card opening and closing", async ({ page }) => {
          await page.goto("/recruit-talent/");
          await page.evaluate(() => document.fonts.ready);
          const heights = await page.locator("#recruitment-faqs details").first().evaluate(async (item) => {
            const collapsed = item.getBoundingClientRect().height;
            const sampleTransition = () => new Promise((resolve) => {
              const frames = [];
              const start = performance.now();
              const sample = (now) => {
                frames.push(item.getBoundingClientRect().height);
                if (now - start >= 500) resolve(frames);
                else requestAnimationFrame(sample);
              };
              requestAnimationFrame(sample);
            });
            item.open = true;
            const opening = await sampleTransition();
            item.open = false;
            const closing = await sampleTransition();
            return { collapsed, opening, closing };
          });
          const expanded = heights.opening.at(-1);
          expect(expanded).toBeGreaterThan(heights.collapsed + 100);
          for (const frames of [heights.opening, heights.closing]) {
            expect(frames.some((height) => height > heights.collapsed + 1 && height < expanded - 1)).toBe(true);
          }
          expect(heights.closing.at(-1)).toBeCloseTo(heights.collapsed, 1);
        });
      }

      test("keeps all supplied copy as real HTML directly below the form", async ({ page }) => {
        const response = await page.goto("/recruit-talent/");
        const section = page.locator("#recruitment-faqs");
        await expect(section).toBeVisible();
        await expect(section).toHaveAccessibleName(/Good questions\.\s+Straight answers\./);
        await expect(section.locator("details")).toHaveCount(faqs.length);
        await expect(section.locator("astro-island, script")).toHaveCount(0);

        const serverCopy = await page.evaluate((html) => {
          const document = new DOMParser().parseFromString(html, "text/html");
          return [...document.querySelectorAll("#recruitment-faqs details")].map((item) => ({
            question: item.querySelector(".recruit-faq-question-text").textContent,
            answer: item.querySelector(".recruit-faq-answer p").textContent,
          }));
        }, await response.text());
        expect(serverCopy).toEqual(faqs);

        const placement = await section.evaluate((element) => {
          const wrapper = element.closest(".section-curve");
          return {
            afterForm: Boolean(wrapper.previousElementSibling.querySelector(".recruit-form-section #staffing-brief")),
            beforeStories: Boolean(wrapper.nextElementSibling.querySelector(".client-stories")),
          };
        });
        expect(placement).toEqual({ afterForm: true, beforeStories: true });

        for (const [index, { question, answer }] of faqs.entries()) {
          const item = section.locator("details").nth(index);
          await expect(item.locator("summary")).toHaveAccessibleName(question);
          await expect(item.locator(".recruit-faq-answer p")).toHaveText(answer);
          await expect(item).toHaveJSProperty("open", false);
          await expect(item.locator(".recruit-faq-answer")).toBeHidden();
        }
      });

      test("opens and closes every answer with pointer and keyboard controls", async ({ page }) => {
        await page.goto("/recruit-talent/");
        const items = page.locator("#recruitment-faqs details");
        for (const item of await items.all()) {
          await item.locator("summary").click();
          await expect(item).toHaveJSProperty("open", true);
          await expect(item.locator(".recruit-faq-answer")).toBeVisible();
          await item.locator("summary").click();
          await expect(item).toHaveJSProperty("open", false);
          await expect(item.locator(".recruit-faq-answer")).toBeHidden();
        }

        const first = items.nth(0).locator("summary");
        const second = items.nth(1).locator("summary");
        await first.focus();
        await first.press("Enter");
        await expect(items.nth(0)).toHaveJSProperty("open", true);
        await expect(first).toHaveCSS("outline-width", "3px");
        await first.press("Space");
        await expect(items.nth(0)).toHaveJSProperty("open", false);
        await first.press("Tab");
        await expect(second).toBeFocused();
        await second.press("Space");
        await expect(items.nth(1)).toHaveJSProperty("open", true);
        await second.press("Shift+Tab");
        await expect(first).toBeFocused();
        await first.press("Enter");
        await expect(items.nth(0)).toHaveJSProperty("open", true);
        await expect(items.nth(1)).toHaveJSProperty("open", true);
      });
    });
  }

  test("fits narrow and wide screens with readable contrast and reduced motion", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/recruit-talent/");
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator("#recruitment-faqs");
    for (const summary of await section.locator("summary").all()) {
      await summary.click();
    }

    const widths = testInfo.project.name === "mobile" ? [320, 390] : [768, 1024, 1440, 1920];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await section.evaluate((element) => {
        const targets = [...element.querySelectorAll("details, summary, p, h2, svg")];
        return targets.map((target) => {
          const bounds = target.getBoundingClientRect();
          return {
            left: bounds.left,
            right: bounds.right,
            overflow: target.scrollWidth - target.clientWidth,
          };
        });
      });
      for (const bounds of layout) {
        expect(bounds.left).toBeGreaterThanOrEqual(-1);
        expect(bounds.right).toBeLessThanOrEqual(width + 1);
        expect(bounds.overflow).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      )).toBe(0);
    }

    await expect(section.locator(".recruit-faq-toggle").first()).toHaveCSS("transition-property", "none");
    const contrastRatios = await section.evaluate((element) => {
      const luminance = (colour) => {
        const channels = colour.match(/[\d.]+/g).slice(0, 3).map((value) => {
          const channel = Number(value) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      return [...element.querySelectorAll("h2, p, .recruit-faq-question-text, .recruit-faq-number")].map((target) => {
        let surface = target;
        while (getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)") {
          surface = surface.parentElement;
        }
        const text = luminance(getComputedStyle(target).color);
        const background = luminance(getComputedStyle(surface).backgroundColor);
        return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      });
    });
    for (const contrast of contrastRatios) {
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });
});
