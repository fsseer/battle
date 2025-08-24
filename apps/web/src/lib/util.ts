export function debounce<T extends (...args: unknown[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}
