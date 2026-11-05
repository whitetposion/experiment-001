/** True on touch screens, where the on-screen keyboard changes how input should behave. */
export function isCoarsePointer() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}
