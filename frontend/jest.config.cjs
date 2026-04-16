/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jest-environment-jsdom",
  // ESM nativo via --experimental-vm-modules (package.json tem "type": "module")
  testMatch: ["**/src/**/__tests__/**/*.test.js"],
  // Expõe jest globalmente (describe, it, expect, jest, etc.)
  injectGlobals: true,
};
