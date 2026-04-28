const isDevelopment = import.meta.env.DEV

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },
}