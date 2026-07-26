# scrcpy-gui

Fork of [Tomotoes/scrcpy-gui](https://github.com/Tomotoes/scrcpy-gui), rebuilt in v2.0 on Electron
43 + Vue 3 + electron-vite. Published from `genkio/scrcpy-gui`, installed through
`genkio/homebrew-tap`. macOS is the only platform actually tested; Windows/Linux build config is
carried over from upstream but unverified.

## Commands

```sh
npm start            # electron-vite dev, hot reload
npm run build        # compile main/preload/renderer into out/
./bin/scrcpy-gui     # build if sources changed, then launch from the checkout
npm run pack:mac     # release/mac-<arch>/ScrcpyGui.app, runnable in place
npm run dist:mac:all # zip + dmg for arm64 and x64 (release artifacts)
npm run fetch:server # refresh resources/scrcpy-server (see version pinning below)
```

There is no linter or test suite. Verification is done by running the app against a real device.

## Layout

```
src/
├── main/       index.js (windows, IPC), adb.js, scrcpy.js, mirror.js, menu.js, paths.js
├── preload/    contextBridge -> window.api; the renderer has no Node access
├── renderer/   index.html (device list) + mirror.html (embedded mirror), Vue 3 + Element Plus
└── shared/     i18n catalogues, imported by both main and renderer via the @shared alias
```

Code style: tabs, no semicolons, single quotes, Options API in Vue components.

## Two mirroring paths

Both are reachable from the Management tab and both are supported; don't collapse them.

1. **"Open the selected mirror"** spawns the system `scrcpy` binary (`src/main/scrcpy.js`) with the
   options from the Configuration tab. This is the path with recording, crop, bit rate, etc.
2. **"Open in app"** is the embedded mirror (`src/main/mirror.js` + `src/renderer/src/mirror/`).
   It pushes `resources/scrcpy-server` to the device over adb using the Tango libraries
   (`@yume-chan/adb-scrcpy`), forwards H.264 packets to the renderer over IPC, and decodes them
   with WebCodecs into a canvas. The `scrcpy` binary is not involved. Control (touch, keys,
   clipboard, screen power) goes renderer -> IPC -> `MirrorSession` -> scrcpy control socket.

## Gotchas

These cost real debugging time; don't rediscover them.

- **Reactive proxies cannot cross IPC.** Passing anything from Vue `data()` into
  `ipcRenderer.invoke` fails with "An object could not be cloned". Keep IPC payloads plain (see
  `menuItems` being a computed rather than data in `MirrorApp.vue`).
- **Mirror windows need their own menu.** Electron's `viewMenu` role binds ⌘R/⇧⌘R to reload and
  `windowMenu` binds ⌘M; menu accelerators win before the page sees the key, so the mockup's ⇧⌘R
  would reload the window. `mirrorMenu()` in `src/main/menu.js` replaces the whole menu on focus.
- **Tango packages are ESM-only.** They must stay in the `TANGO` exclude list in
  `electron.vite.config.mjs` so Vite bundles them; externalized they would be `require()`d and fail.
- **scrcpy-server version is pinned.** `resources/scrcpy-server` must match the protocol version
  `@yume-chan/scrcpy` speaks (currently 3.3.3, set in `SERVER_VERSION` in `src/main/mirror.js`).
  Bump both together via `npm run fetch:server`. The locally installed scrcpy (4.x) is irrelevant
  to this path.
- **Control writes must be serialised.** The scrcpy control stream has a single writer; a drag is a
  burst of events. `MirrorSession#serialize` chains them.
- **Media play/pause is not reliable through scrcpy key injection.** On the Pixel 8a/Android 16
  setup, injecting Android keycode 85 through the scrcpy control socket returns success but PipePipe
  does not react. `MirrorSession#mediaPlayPause` deliberately uses `adb shell input keyevent 85`,
  which reaches the active media session.
- **Argent's committable local install includes generated files hidden by global ignores.**
  `.agents/`, `.claude/`, and `.codex/` are globally ignored on the primary development machine,
  while `.argent/` is ignored by this repo. When refreshing Argent, force-add new generated
  skills/rules/agent files and `.argent/install.json`; keep runtime-only `.argent/environment.json`
  ignored.
- **PATH repair.** A GUI process launched from Finder inherits a bare PATH, so `adb`/`scrcpy` are
  invisible. `src/main/paths.js` re-adds both Homebrew prefixes; keep it working on Intel too.
- **Resources path differs when packaged.** `resourcesPath()` returns `process.resourcesPath` in a
  bundle and a relative path in dev. Always test packaged builds before releasing.
- **scrcpy flag names.** The spawn path targets scrcpy 2.x-4.x: `--video-bit-rate`, `--no-playback`,
  `--orientation`, and `--crop=width:height:x:y` (upstream had width/height swapped).

## Verifying against a device

A Pixel 8a is usually connected over USB. Useful tricks:

- `screencapture -x -R<x>,<y>,<w>,<h> /tmp/shot.png` after querying window geometry with
  `osascript ... get {position, size} of window 1`. Screenshots are 2x; divide by 2 for points.
- AppleScript `click at {x, y}` uses AXPress, which does **not** produce real mouse events: it will
  not toggle Element Plus checkboxes and does nothing on a `<canvas>`. Real keystrokes
  (`keystroke "n" using command down`, `key code 48`/`49` for Tab/Space) do work, so drive the UI
  by keyboard when automating.
- Renderer errors are forwarded to the terminal in dev by `forwardConsole()` in `src/main/index.js`.
- A black mirror usually means the phone is asleep, not a decode failure. Check with
  `adb shell dumpsys power | grep mWakefulness`.

## Release process

1. Bump `version` in `package.json`, `npm install --package-lock-only`.
2. Commit, `git tag -a vX.Y.Z`, push master and the tag.
3. `npm run dist:mac:all`, then `shasum -a 256 release/ScrcpyGui-X.Y.Z-{arm64,x64}.zip`.
4. `gh release create vX.Y.Z <the four artifacts> --title ... --notes ...`.
5. In `../homebrew-tap`, update `Formula/scrcpy-gui.rb` (version + both URLs and hashes),
   `brew style` it, commit as `scrcpy-gui X.Y.Z`, push.
6. Verify with `brew update && brew upgrade genkio/tap/scrcpy-gui && brew test genkio/tap/scrcpy-gui`.

Formula notes: builds are ad-hoc signed (`identity: null`), which is fine because Homebrew
curl-downloads and so nothing gets a quarantine flag. Homebrew stages a zip whose only entry is a
directory *from inside* that directory, so the formula handles the bundle arriving either as
`ScrcpyGui.app` or as its contents. `adb` comes from a cask, which a formula cannot depend on, so it
is mentioned in caveats instead.

## Local dev install

`~/.local/bin/scrcpy-gui` is a symlink to `bin/scrcpy-gui` in this checkout. `~/.local/bin` precedes
`/opt/homebrew/bin` on PATH, so the command runs the working copy (rebuilding when sources changed)
and shadows the released build. `rm` the symlink to fall back to the Homebrew version.

## Known gaps

- Embedded mirror: clipboard paste and screen-off are implemented but never observed end to end;
  wireless devices untested on that path; sidebar shortcut labels are hardcoded mac glyphs.
- `.travis.yml` and `appveyor.yml` are dead 2019 CI configs.
- No linter since the ESLint 4 setup was dropped in the v2 rewrite.
