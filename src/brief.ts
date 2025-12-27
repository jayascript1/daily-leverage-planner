export function exportDailyBrief(
  rankedActions: string[],
  rationale: string,
  date: string
) {
  return `
Daily Leverage Brief — ${date}

FOCUS
${rankedActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

RATIONALE
${rationale}

IGNORE
Everything else not listed above.
`.trim();
}
