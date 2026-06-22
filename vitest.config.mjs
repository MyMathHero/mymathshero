import { defineConfig } from 'vitest/config'

// Unit tests only — pure logic libs, node environment, no DB / no DOM.
// Scoped to tests/unit so Vitest never picks up app code or the marketing project.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{js,mjs}'],
    // Keep it fast and isolated; these tests import lib/* directly.
    globals: false,
  },
})
