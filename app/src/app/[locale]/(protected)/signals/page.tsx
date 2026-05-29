import { SignalsView } from "@/components/signals/SignalsView";

/**
 * Signals — the daily awareness layer. Sits under Command Center between
 * Weather and Analytics. All logic lives in the client `SignalsView`
 * (preferences, onboarding gate, deterministic ranking, sections); this
 * route is a thin shell so the protected layout supplies the chrome.
 */
export default function SignalsPage() {
  return <SignalsView />;
}
