# OS Buddy Native Haptics Handoff

## Verdict

Quick Snap can only guarantee a real Mac Force Touch trackpad click through a native macOS layer.

The web app can emit the intent, but a browser page cannot directly drive the MacBook trackpad haptic actuator. The guaranteed path is:

1. OS Buddy activates Quick Snap in the web app.
2. The web app emits the `mblos:os-buddy-haptic` event and tries the native bridge.
3. A macOS native shell, most likely a small WKWebView wrapper, receives the bridge message.
4. Native AppKit calls `NSHapticFeedbackManager.defaultPerformer.perform(...)`.

## Current Web Contract

Implemented in:

- `app/src/lib/os-buddy/os-buddy-haptics.ts`
- `app/src/components/os-buddy/OSBuddyDock.tsx`

Payload:

```ts
type OSBuddyHapticSignal = {
  intent: "quick-snap-activate";
  style: "medium";
  pattern: VibratePattern;
};
```

Dispatch order:

1. `window.dispatchEvent(new CustomEvent("mblos:os-buddy-haptic", ...))`
2. `window.OSBuddyHaptics.impact(signal)` or `window.OSBuddyHaptics.trigger(signal)`
3. `window.webkit.messageHandlers.osBuddyHaptics.postMessage(signal)`
4. `navigator.vibrate(signal.pattern)`

The first three are for native shells. The last one is a mobile/browser fallback, not a Mac trackpad guarantee.

## Why Pure Web Is Not Enough

Safari/WebKit exposes non-standard Force Touch events, but they are detection events. Apple documents that `webkitmouseforcedown` and `webkitmouseforceup` are fired when the user applies/releases enough force, and the user receives haptic feedback for those force-click transitions. This does not expose a JavaScript method to programmatically trigger an arbitrary trackpad haptic click.

`navigator.vibrate()` targets device vibration hardware where available. It is not a Mac trackpad Taptic API.

Gamepad haptics target connected game controllers, not the internal Force Touch trackpad.

## Native macOS Primitive

Apple AppKit provides the required API:

```swift
import AppKit

NSHapticFeedbackManager.defaultPerformer.perform(
  .alignment,
  performanceTime: .now
)
```

Equivalent Objective-C:

```objc
#import <AppKit/AppKit.h>

[[NSHapticFeedbackManager defaultPerformer]
  performFeedbackPattern:NSHapticFeedbackPatternAlignment
         performanceTime:NSHapticFeedbackPerformanceTimeNow];
```

Local probe run:

```bash
clang -x objective-c -fobjc-arc -framework AppKit -o /tmp/mblos-haptic-probe - <<'EOF'
#import <AppKit/AppKit.h>

int main(void) {
  @autoreleasepool {
    [[NSHapticFeedbackManager defaultPerformer]
      performFeedbackPattern:NSHapticFeedbackPatternAlignment
             performanceTime:NSHapticFeedbackPerformanceTimeNow];
  }
  return 0;
}
EOF
/tmp/mblos-haptic-probe
```

On this machine, the Objective-C probe compiled and exited with code 0. A Swift one-liner was blocked by a local Swift SDK/compiler mismatch, not by the haptic API.

## Recommended Architecture

### Option A: WKWebView macOS wrapper

Best fit if the goal is a premium desktop feel on Mac.

Native shell:

```swift
import AppKit
import WebKit

final class OSBuddyHapticsBridge: NSObject, WKScriptMessageHandler {
  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage
  ) {
    guard message.name == "osBuddyHaptics" else { return }

    NSHapticFeedbackManager.defaultPerformer.perform(
      .alignment,
      performanceTime: .now
    )
  }
}

let userContentController = WKUserContentController()
userContentController.add(OSBuddyHapticsBridge(), name: "osBuddyHaptics")

let configuration = WKWebViewConfiguration()
configuration.userContentController = userContentController
let webView = WKWebView(frame: .zero, configuration: configuration)
```

The current web helper already calls:

```ts
window.webkit?.messageHandlers?.osBuddyHaptics?.postMessage(signal);
```

So no additional web code is required for this bridge name.

### Option B: Electron or Tauri

Viable, but heavier than WKWebView for this project because the repo currently has no Electron/Tauri shell. It would need a native module/plugin to call AppKit. This is a bigger packaging decision.

### Option C: Browser extension plus Native Messaging host

Technically possible, but high friction for a personal OS app: extension install, native host manifest, permissions, and browser-specific setup.

### Option D: Local haptics daemon

Possible: web app sends a localhost request to a small signed macOS helper that calls AppKit. This is less integrated and has browser/private-network/security friction. Useful for prototyping, not the best final UX.

## Guarantee Conditions

The native route can guarantee that the app requests a real AppKit Force Touch haptic. Physical perception still depends on:

- Mac hardware with a Force Touch trackpad or compatible input device.
- macOS trackpad setting "Force Click and haptic feedback" enabled.
- User accessibility/system preferences allowing haptic feedback.
- The app running inside the native shell or another approved native bridge.

## Recommended Next Step

Build a tiny macOS WKWebView shell that loads the local/production My Best Life OS URL and registers `osBuddyHaptics`. Keep the existing web fallback for browser/mobile. This gives the Mac app true trackpad Taptic feedback while preserving the Vercel/web deployment.

