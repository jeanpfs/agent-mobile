# mobile-agent

AI agent skill for automating mobile apps on iOS simulators and Android emulators via [Maestro](https://maestro.mobile.dev/).

Works with any framework: native iOS/Android, React Native, Flutter, etc.

## Requirements

- **Node.js** >= 18
- **Maestro CLI** — mobile UI automation framework
- **iOS Simulator** or **Android Emulator** with a running app

### Install Maestro

Maestro requires **Java** (JDK 8+).

```bash
curl -Ls install.maestro.dev | bash
```

The installer adds Maestro to `~/.maestro/bin`. You need to add it to your PATH:

**Fish:**
```fish
fish_add_path $HOME/.maestro/bin
```
Add to `~/.config/fish/config.fish` to persist.

**Bash:**
```bash
export PATH="$PATH:$HOME/.maestro/bin"
```
Add to `~/.bashrc` or `~/.bash_profile` to persist.

**Zsh:**
```bash
export PATH="$PATH:$HOME/.maestro/bin"
```
Add to `~/.zshrc` to persist.

After configuring, verify:

```bash
maestro --version
```

### Install skill dependencies

```bash
pnpm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npx tsx scripts/setup.ts` | Check environment (Maestro, devices) |
| `npx tsx scripts/snapshot.ts` | Capture accessibility tree with refs |
| `npx tsx scripts/tap.ts <ref>` | Tap element by ref (e.g., `m3`) |
| `npx tsx scripts/type.ts <ref> "<text>"` | Type text into field by ref |
| `npx tsx scripts/scroll.ts <direction>` | Scroll: `up`, `down`, `left`, `right` |
| `npx tsx scripts/screenshot.ts` | Save screenshot as PNG |
| `npx tsx scripts/assert.ts "<text>"` | Verify text exists on screen |

## Quick Start

### 1. Start a simulator with your app running

**iOS:**
```bash
open -a Simulator
```

**Android:**
```bash
emulator -avd <your_avd_name>
```

### 2. Verify environment

```bash
npx tsx scripts/setup.ts
```

Expected output:
```
Maestro: x.x.x
Platform: ios
Devices: iPhone 16
Status: READY
```

### 3. Take a snapshot

```bash
npx tsx scripts/snapshot.ts
```

Output:
```
Screen: (7 elements)

- header "Welcome" [ref=m1]
- textbox "Email" [ref=m2]
- textbox "Password" [ref=m3]
- button "Sign In" [ref=m4]
- link "Forgot password?" [ref=m5]
```

### 4. Interact with elements

```bash
npx tsx scripts/type.ts m2 "user@example.com"
npx tsx scripts/type.ts m3 "password123"
npx tsx scripts/tap.ts m4
```

### 5. Validate result

```bash
npx tsx scripts/snapshot.ts
npx tsx scripts/assert.ts "Welcome"
```

## How It Works

1. **`snapshot`** runs `maestro hierarchy` to get the accessibility tree as JSON
2. Parses the tree, normalizes roles (button, textbox, link, etc.)
3. Assigns sequential refs (`m1`, `m2`, `m3`...) to interactive elements
4. **`tap`/`type`** resolve the ref back to the element, generate a temporary Maestro YAML flow, and execute it
5. **`assert`** scans all visible text in the tree for a match

Refs are **ephemeral** — valid only for the snapshot that generated them. Always re-snapshot after any action.

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `NO_MAESTRO` | Maestro not installed | `curl -Ls install.maestro.dev \| bash` |
| `NO_DEVICE` | No simulator/emulator running | Start one with your app |
| `INVALID_REF` | Ref not in current UI | Run snapshot again |
| `TIMEOUT` | Action timed out | Retry or check app state |
| `TAP_FAILED` | Tap failed | Element may need scroll |
| `TYPE_FAILED` | Type failed | Check ref is a text input |

## Publishing to skills.sh

```bash
npx skills add <your-github-user>/mobile-agent
```

## License

MIT
