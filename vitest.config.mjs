import { fileURLToPath, URL } from "node:url";

export default {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
};
