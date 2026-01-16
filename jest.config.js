const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  testMatch: ["<rootDir>/test/**/*.{test,spec}.{js,jsx,ts,tsx}"],
  modulePaths: ["<rootDir>"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // CI-specific configurations
  maxWorkers: process.env.CI ? 2 : "50%",
  workerIdleMemoryLimit: process.env.CI ? "512MB" : "1GB",
  // Speed up tests in CI
  passWithNoTests: true,
  verbose: false,
  silent: process.env.CI === "true",
  
  // 📊 Coverage Configuration
  collectCoverage: process.env.COVERAGE === "true",
  collectCoverageFrom: [
    // Frontend coverage
    "app/**/*.{js,jsx,ts,tsx}",
    // Backend API coverage
    "app/api/**/*.{js,ts}",
    // Library utilities
    "app/lib/**/*.{js,ts}",
    // Types and providers
    "app/types/**/*.{ts}",
    "app/providers.tsx",
    // Middleware and configuration
    "middleware.ts",
    "lib/**/*.{js,ts}",
    // Exclude specific patterns
    "!app/**/*.d.ts",
    "!app/**/layout.tsx",
    "!app/**/page.tsx",
    "!app/**/loading.tsx",
    "!app/**/error.tsx",
    "!app/**/not-found.tsx",
    "!app/**/global-error.tsx",
    "!app/**/*.stories.{js,jsx,ts,tsx}",
    "!app/**/*.config.{js,ts}",
    "!app/globals.css",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/build/**",
    "!**/dist/**",
    "!**/coverage/**",
    "!database/**",
    "!public/**",
    "!next.config.js",
    "!tailwind.config.js",
    "!postcss.config.js",
    "!*.config.{js,ts}",
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "text-summary", 
    "lcov",
    "html",
    "json"
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50, 
      lines: 50,
      statements: 50
    }
  },
  // Coverage path mapping
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/coverage/",
    "/test/",
    "/database/",
    "/public/",
    ".d.ts$"
  ]
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
