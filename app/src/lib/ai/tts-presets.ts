import type { AudioProviderInput } from "@/lib/ai/audio-summary";

export type TtsVoiceMode = "preset" | "reference_clone";

export type TtsPresetId =
  | "calm_hk_cantonese_female"
  | "calm_hk_cantonese_male"
  | "neutral_english_female"
  | "neutral_english_male"
  | "focused_life_os_narrator";

export type TtsPreset = {
  id: TtsPresetId;
  label: string;
  language: AudioProviderInput["language"];
  voiceGender: AudioProviderInput["voiceGender"];
  control: string;
};

export const TTS_PRESETS: TtsPreset[] = [
  {
    id: "calm_hk_cantonese_female",
    label: "Calm Hong Kong Cantonese · Female",
    language: "zh-Hant",
    voiceGender: "female",
    control:
      "Hong Kong Cantonese, calm adult female voice, warm but direct, steady pacing, clear pronunciation",
  },
  {
    id: "calm_hk_cantonese_male",
    label: "Calm Hong Kong Cantonese · Male",
    language: "zh-Hant",
    voiceGender: "male",
    control:
      "Hong Kong Cantonese, calm adult male voice, grounded and clear, steady pacing, low emotional intensity",
  },
  {
    id: "neutral_english_female",
    label: "Neutral English · Female",
    language: "en",
    voiceGender: "female",
    control:
      "Neutral English, adult female voice, calm narrator, clear diction, natural conversational rhythm",
  },
  {
    id: "neutral_english_male",
    label: "Neutral English · Male",
    language: "en",
    voiceGender: "male",
    control:
      "Neutral English, adult male voice, calm narrator, clear diction, natural conversational rhythm",
  },
  {
    id: "focused_life_os_narrator",
    label: "Focused Life OS Narrator",
    language: "auto",
    voiceGender: "female",
    control:
      "Calm personal operating system narrator, direct and emotionally aware, no hype, precise pacing",
  },
];

export const DEFAULT_TTS_PRESET_ID: TtsPresetId = "calm_hk_cantonese_female";

export function getTtsPreset(id: string | null | undefined): TtsPreset {
  return TTS_PRESETS.find((preset) => preset.id === id) ?? TTS_PRESETS[0]!;
}
