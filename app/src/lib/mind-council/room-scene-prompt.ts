import { seatAnchors, type CouncilAdvisor, type SceneTemplate } from "./room-contract";
const settings: Record<SceneTemplate, string> = {
  "sunset-library": "A warm, cinematic executive lounge at sunset. Ivory boucle armchairs, arched windows overlooking distant hills, walnut shelves, soft amber architectural lighting and an oval woven rug.",
  "garden-room": "A quiet contemporary Japanese-inspired garden lounge. Oak armchairs with cream cushions, warm timber, large windows facing a green courtyard, diffused morning daylight and an oval neutral rug.",
  "city-loft": "A refined city penthouse lounge in the early evening. Cream armchairs, tall windows with a softly blurred skyline, walnut details, indirect warm lighting and a soft oval rug.",
  "coastal-retreat": "A calm coastal villa lounge in late afternoon. Cream armchairs, pale plaster arches, windows overlooking the sea, light oak accents, warm natural light and a soft oval rug.",
};
export function buildCouncilScenePrompt(advisors: CouncilAdvisor[], template: SceneTemplate): string {
  const anchors = seatAnchors(advisors.length);
  return `Create a photorealistic, clearly fictional AI advisory-room illustration, landscape 4:3. ${settings[template]}\n` +
    `Exactly ${advisors.length} selected advisors sit in individual chairs in a shallow semicircle, facing a participant in the foreground. ` +
    `From LEFT TO RIGHT: ${advisors.map((a, i) => `${i + 1}. ${JSON.stringify(a.name)} (seat centered at ${Math.round(anchors[i].x * 100)}% of image width)`).join("; ")}.\n` +
    "For publicly known figures, depict their recognizable public appearance; this is an imagined gathering, not documentary evidence or an endorsement. For an unknown name, use a fictional adult representative, never pretend to have a reference photograph. " +
    "All advisors' faces must be distinct, unobstructed, in the upper half of the image, with natural hands, visible seated bodies and space between their chairs. Keep the outer chairs inside the frame.\n" +
    "IMPORTANT FOREGROUND: pull the camera back enough to clearly show a foreground participant SITTING in the central front chair, viewed strictly from BEHIND. Show the back of the head, shoulders, upper back and chair back in the lower center. " +
    "This is an anonymous generic adult in a simple dark sweater, not a depiction of the account owner. No visible face, no likeness reference. Their head must not obscure any advisor's face. The front chair MUST NOT be empty. " +
    "Use the lower 30% for this back-view participant. Do not add anyone else. No table or desk anywhere. " +
    "Premium architectural photography, realistic skin and fabric, warm restrained colors, calm attentive expressions. No cartoon, no SVG/vector people, no text, no labels, no logos, no UI or glowing rings. This is only the base image for an interactive interface.";
}
