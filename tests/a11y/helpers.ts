import { expect, type Page } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Scans only color-contrast violations (targeted for theme work). */
export const CONTRAST_ONLY = { runOnly: { type: "rule", values: ["color-contrast"] } } satisfies Parameters<typeof getViolations>[2];

export async function expectNoA11yViolations(page: Page, options?: Parameters<typeof getViolations>[2]) {
  await injectAxe(page);
  const violations = await getViolations(page, undefined, {
    runOnly: { type: "tag", values: WCAG_TAGS },
    ...options,
  });

  const summary = violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `    ${n.target.join(" ")}`).join("\n");
      return `  [${v.impact ?? "unknown"}] ${v.id}: ${v.help}\n${nodes}`;
    })
    .join("\n");

  expect(violations, `a11y violations:\n${summary}`).toEqual([]);
}
