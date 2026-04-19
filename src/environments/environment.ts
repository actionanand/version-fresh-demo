export const environment = {
  production: true,

  // The app compares its compiled APP_VERSION against this no-cache JSON endpoint.
  versionCheckUrl: '/version.json',

  // Polling keeps a long-running browser tab aligned with the latest deployed build.
  versionCheckIntervalMs: 30000,

  versioning: {
    // Manual mode copies package.json version into src/version.ts without changing package.json.
    manual: false,

    // Automatic mode increments the package.json patch number before updating src/version.ts.
    automatic: true,
  },
};
