<div align="center">
	<h1>Scrcpy GUI</h1>
	<sub>
		A maintained fork of <a href="https://github.com/Tomotoes/scrcpy-gui">Tomotoes/scrcpy-gui</a>,
		rebuilt on Electron 43 + Vue 3
	</sub>
</div>

<hr/>

<p align="center">✨ <strong>A simple &amp; beautiful GUI for <a href="https://github.com/Genymobile/scrcpy">scrcpy</a></strong></p>

<div align="center"><img src="./screenshot.gif"/></div>

Mirror and control an Android device from your Mac: pick a device, tweak the mirroring options,
hit open. Everything the GUI does is a `scrcpy` invocation, so nothing is installed on the phone
and there is no root requirement.

## Why this fork

The upstream project stopped at scrcpy 1.10 and Electron 2 (2019). On a current machine it
no longer installs, let alone builds: `node-sass@4` has no binary for modern Node and Electron 2
has no Apple Silicon build. The flags it passed to scrcpy have also been renamed or removed
several times since.

This fork rebuilds the app on a current stack, keeps the original UI, and adds a terminal-first
install that never touches `/Applications`.

## Embedded mirror

**Open in app** mirrors the device inside the app itself. It pushes `scrcpy-server` to the phone
over adb and decodes the H.264 stream in the renderer with WebCodecs, so the screen is a `<canvas>`
and the phone frame, title bar and control sidebar are ordinary DOM. The `scrcpy` binary is not
involved on this path.

Mouse clicks, drags and the scroll wheel are forwarded as touch events, and typing goes to the
device. The sidebar carries battery level, screen-off mirroring, clipboard paste and the three
navigation buttons; a mirror window gets its own **Device** menu:

| Shortcut | Action |
| --- | --- |
| `Esc` | Back |
| `⇧⌘H` | Home |
| `⇧⌘R` | App switcher |
| `⌘N` | Notification shade |
| `⌘O` | Use with screen off |
| `⌘V` | Paste the computer clipboard into the device |
| `⌘P` | Power |
| `⌘↑` / `⌘↓` | Volume up / down |
| `⌘M` | Menu |
| `⌘R` | Rotate |

Copying on the device puts the text on the computer clipboard automatically.

**Open the selected mirror** still launches a real `scrcpy` window with everything from the
Configuration tab (recording, crop, bit rate, and so on).

## Install

```sh
brew install genkio/tap/scrcpy-gui
brew install --cask android-platform-tools   # adb, if you don't have it
scrcpy-gui
```

`scrcpy` itself comes in as a formula dependency. The app is installed into the Homebrew Cellar
and launched by the `scrcpy-gui` command, so it stays out of `/Applications` and out of your Dock's
app list. Apple Silicon and Intel are both published; macOS 11+.

The command runs in the foreground so you can watch scrcpy's log output. Append `&` to detach it.

### From a checkout

Requires Node.js 20.19+, plus `adb` and `scrcpy` on your `PATH`.

```sh
git clone https://github.com/genkio/scrcpy-gui.git
cd scrcpy-gui
npm install
./bin/scrcpy-gui                                      # builds if stale, then runs
ln -s "$PWD/bin/scrcpy-gui" ~/.local/bin/scrcpy-gui   # optional: put it on your PATH
```

### Build installers

```sh
npm run pack:mac       # release/mac-<arch>/ScrcpyGui.app, runnable in place
npm run dist:mac:all   # zip + dmg for arm64 and x64
npm run dist:win
npm run dist:linux
```

## What changed from upstream

| | upstream 1.5.1 | this fork |
| --- | --- | --- |
| Runtime | Electron 2, Chromium 61 | Electron 43 |
| UI | Vue 2 + element-ui | Vue 3 + Element Plus |
| Build | webpack 4 + babel + node-sass | electron-vite (Vite 7) + dart-sass |
| Renderer privileges | `nodeIntegration`, `remote` | `contextIsolation` + preload bridge |
| Device discovery | `adbkit` | the `adb` CLI |
| Title bar | `custom-electron-titlebar` | native menus + tray |
| Launch | DMG → `/Applications` | `brew install`, or run from a checkout |

Behaviour fixes that came with it:

- **scrcpy 2.x–4.x compatibility.** `--bit-rate` → `--video-bit-rate`, `--no-display` →
  `--no-playback`, `--rotation` → `--orientation`, and the removed `--render-expired-frames`
  toggle is gone.
- **`--crop` was building `height:width:x:y`** where scrcpy expects `width:height:x:y`, so any
  non-square crop was wrong.
- **Audio forwarding toggle.** scrcpy forwards device audio by default since 2.0; the old GUI had
  no way to turn it off.
- **Binaries are found when launched from Finder.** A GUI process inherits a bare `PATH`, so
  Homebrew's `adb`/`scrcpy` used to be invisible outside a terminal launch.
- **Language switching no longer reloads the window**, and saved settings survive version bumps.

## Usage

The device workflow is unchanged from upstream, and its README covers it in more detail:
[original README](https://github.com/Tomotoes/scrcpy-gui/blob/master/README.md) ·
[中文文档](https://github.com/Tomotoes/scrcpy-gui/blob/master/README.zh_CN.md).

- **Wired:** enable USB debugging, plug the phone in, wait for it to appear, select it and open the
  mirror.
- **Wireless:** connect the phone by cable once, enter its LAN IP, and hit *Turn on wireless
  connection*; afterwards the address is remembered and the cable is optional.
- Devices can be renamed inline, and *Automatically turn on connected devices* opens a mirror as
  soon as a phone is plugged in.

Keyboard and mouse shortcuts belong to scrcpy itself and are listed in
[its documentation](https://github.com/Genymobile/scrcpy#shortcuts). The modifier is `Ctrl`.

## Development

```sh
npm start          # dev mode with hot reload
npm run build      # compile main, preload and renderer into out/
./bin/scrcpy-gui   # build, then launch from the checkout
```

```
src/
├── main/       Electron main process: windows, tray, menus, adb, scrcpy, mirror sessions
├── preload/    contextBridge API exposed to the renderer as window.api
├── renderer/   Vue 3 apps: index.html (device list) and mirror.html (embedded mirror)
└── shared/     i18n catalogues used by both the main and renderer processes
```

`resources/scrcpy-server` is the device-side server used by the embedded mirror. It has to match
the protocol version supported by `@yume-chan/scrcpy`; refresh both with `npm run fetch:server`.

The renderer has no Node access; every privileged call goes through the preload bridge. Device
discovery polls `adb devices`, and mirroring spawns the `scrcpy` binary directly.

## Credits

Original application by [Simon Ma](https://tomotoes.com)
([Tomotoes/scrcpy-gui](https://github.com/Tomotoes/scrcpy-gui)), Apache-2.0. Built on
[scrcpy](https://github.com/Genymobile/scrcpy) by Genymobile.
