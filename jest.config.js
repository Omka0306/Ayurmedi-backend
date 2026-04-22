export default {
  globalSetup: "./tests/e2e/setup.js",
  globalTeardown: "./tests/e2e/teardown.js",
  testTimeout: 30000,
  testEnvironment: "node",
  testMatch: [
    "**/?(*.)+(spec|test|e2e).[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {},
};
