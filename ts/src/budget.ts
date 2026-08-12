/** ~4 chars/token — a common rough heuristic, good enough for a budget
 * gate rather than exact accounting. Same heuristic used across the
 * sibling ActAuth/SkillGarden projects for consistency. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
