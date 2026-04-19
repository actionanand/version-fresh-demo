export const environment = {
  production: false,

  // Angular dev server serves public/version.json from the public folder.
  versionCheckUrl: '/version.json',

  // A shorter interval makes the mismatch flow easier to observe during local testing.
  versionCheckIntervalMs: 10000,

  versioning: {
    manual: false,
    automatic: true,
  },
};
