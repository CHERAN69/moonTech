import '@testing-library/jest-dom'

// Polyfill crypto.randomUUID in jsdom
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => Math.random().toString(36).slice(2) + Date.now().toString(36),
    },
    configurable: true,
  })
}
