# mobile-agent Technical Reference

## Maestro Hierarchy JSON Format

`maestro hierarchy` returns a nested JSON tree. Each node has:

```json
{
  "attributes": {
    "text": "Login",
    "accessibilityText": "",
    "hintText": "",
    "resource-id": "com.app:id/login_btn",
    "clickable": "true",
    "bounds": "[100,200][300,260]",
    "enabled": "true",
    "focused": "false",
    "checked": "false",
    "selected": "false",
    "className": "android.widget.Button",
    "visible": "true"
  },
  "children": []
}
```

## Role Normalization

The snapshot script maps raw attributes to normalized roles:

| Raw attribute / class | Normalized role |
|-----------------------|----------------|
| `clickable=true` + text | button |
| `EditText`, `TextInput`, `TextField` | textbox |
| `accessibilityRole=link` | link |
| `CheckBox` class | checkbox |
| `Switch` class | switch |
| `ImageView` or `accessibilityRole=image` | image |
| `accessibilityRole=header` | header |
| Has text, not clickable | text |

## Ref Assignment

Refs are assigned sequentially (m1, m2, m3...) by depth-first traversal. They are ephemeral — valid only for the snapshot in which they were assigned. Any UI change (navigation, animation, user input) invalidates all refs.

## Platform-Specific Notes

### iOS Simulator
- Device detection: `xcrun simctl list devices booted`
- Screenshots: `xcrun simctl io booted screenshot <path>`
- Hierarchy: `maestro hierarchy` (auto-detects booted simulator)

### Android Emulator
- Device detection: `adb devices`
- Screenshots: `adb exec-out screencap -p > <path>`
- Hierarchy: `maestro hierarchy` (auto-detects connected device)

## Troubleshooting

### No elements in snapshot
- App may lack accessibility labels
- For React Native: add `accessibilityLabel` props
- For Flutter: use `Semantics` widget
- For native: use `contentDescription` (Android) or `accessibilityLabel` (iOS)

### Refs not matching after action
- Expected behavior. Always re-snapshot after any action.
- Animations may cause transient states. Wait 1-2 seconds before snapshot.

### Maestro timeout
- Default timeout is 30 seconds
- Heavy apps may need more time on first launch
- Ensure the emulator has enough RAM allocated

### Multiple devices connected
- Maestro auto-selects the first available device
- To target specific device: run scripts with `--device <id>` flag support (future)
