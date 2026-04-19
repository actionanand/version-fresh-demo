# Version Fresh Demo

This Angular standalone demo shows one way to keep a browser app aligned with the latest deployed version, similar to how mobile apps force users onto the newest bundle after an update.

## Concept

Angular bundles can be cached by the browser, a CDN, or a service worker. `ng build --output-hashing=all` makes JS and CSS filenames unique for each build, but `index.html` and a long-running open tab can still point at an older compiled application.

This demo keeps two version sources:

- `package.json` contains the source version.
- `src/version.ts` is generated before build and compiled into the Angular app.
- `public/version.json` is generated before build and served with no-cache headers.

At runtime, the app compares its compiled `APP_VERSION` with `/version.json`. If the server reports a newer version, the app clears Cache Storage, unregisters service workers, and reloads the page once. A session guard prevents an infinite reload loop when the server is intentionally simulating a mismatch.

## Version Modes

Change the flags in `src/environments/environment.ts`.

```ts
versioning: {
  manual: false,
  automatic: true,
}
```

Manual mode:

- Set `manual: true`.
- Run `npm run set-version`.
- The script copies the existing `package.json` version into `src/version.ts` and `public/version.json`.

Automatic mode:

- Set `manual: false` and keep `automatic: true`.
- Run `npm run set-version`.
- The script increments the patch version from `package.json`, then writes the same version into `src/version.ts` and `public/version.json`.

## Scripts

```bash
npm install
npm run set-version
npm run build
npm run server
```

`npm run build` runs:

```bash
node set-version.js && ng build --output-hashing=all
```

The output hashing is important because unchanged filenames are a common reason browsers keep loading stale JS and CSS.

## Simulate A Version Mismatch

Build the app, then start the local server in mismatch mode:

```bash
npm run build
npm run server:mismatch
```

`server/version-server.js` serves the built Angular app and reports a higher version from `/version.json`. The browser sees that the compiled app version is older than the server version, clears browser-controlled caches, and reloads.

You can also force a specific server version:

```bash
node server/version-server.js --version=9.9.9
```

## Files To Notice

- `set-version.js` reads the environment flags and writes version files.
- `src/version.ts` is the compiled version used by Angular.
- `src/app/services/version.service.ts` performs the no-cache runtime check.
- `server/version-server.js` serves hashed assets, no-cache HTML, and the version endpoint.
- `angular.json` and `package.json` both include `outputHashing` for production builds.
