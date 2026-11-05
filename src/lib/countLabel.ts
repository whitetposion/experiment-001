/** A count with its noun, such as "1 member" or "2 members". */
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${String(count)} ${count === 1 ? singular : plural}`
}
