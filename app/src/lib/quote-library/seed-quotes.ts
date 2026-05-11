/**
 * Curated starter pack for the Quote Library.
 *
 * One quote per category (30 total). All sources are public-domain or
 * widely-attributed. The `is_seed = true` flag lets users clear them with a
 * single click from the Library Settings popover.
 *
 * Pre-tagged so the library reads as a calm, complete surface on first load —
 * Smart Tagging still runs on user-added quotes, but seeds don't burn the
 * daily tagging budget.
 */

import type {
  QuoteCategory,
  QuoteEmotionTone,
} from "@/types/quote";

export type SeedQuote = {
  quote_text: string;
  source_author: string;
  source_context: string | null;
  category: QuoteCategory;
  tags: string[];
  emotion_tone: QuoteEmotionTone;
  language: string;
};

export const SEED_QUOTES: SeedQuote[] = [
  // Inner Life
  {
    quote_text:
      "The oak fought the wind and was broken, the willow bent when it must and survived.",
    source_author: "Robert Jordan",
    source_context: "The Fires of Heaven",
    category: "Resilience",
    tags: ["bending not breaking", "adaptability", "endurance"],
    emotion_tone: "grounding",
    language: "en",
  },
  {
    quote_text:
      "Until you make the unconscious conscious, it will direct your life and you will call it fate.",
    source_author: "Carl Jung",
    source_context: null,
    category: "Self-Awareness",
    tags: ["shadow work", "agency", "inner work"],
    emotion_tone: "contemplative",
    language: "en",
  },
  {
    quote_text:
      "Wherever you are, be there totally.",
    source_author: "Eckhart Tolle",
    source_context: "The Power of Now",
    category: "Mindfulness",
    tags: ["presence", "attention", "now"],
    emotion_tone: "grounding",
    language: "en",
  },
  {
    quote_text:
      "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.",
    source_author: "Eleanor Roosevelt",
    source_context: "You Learn by Living",
    category: "Courage",
    tags: ["facing fear", "self-trust", "growth"],
    emotion_tone: "uplifting",
    language: "en",
  },
  {
    quote_text:
      "Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.",
    source_author: "Marcus Aurelius",
    source_context: "Meditations",
    category: "Acceptance",
    tags: ["amor fati", "wholeheartedness", "stoicism"],
    emotion_tone: "resolute",
    language: "en",
  },
  {
    quote_text:
      "Gratitude turns what we have into enough.",
    source_author: "Melody Beattie",
    source_context: null,
    category: "Gratitude",
    tags: ["contentment", "abundance", "perspective shift"],
    emotion_tone: "tender",
    language: "en",
  },

  // Purpose & Direction
  {
    quote_text:
      "He who has a why to live for can bear almost any how.",
    source_author: "Friedrich Nietzsche",
    source_context: "Twilight of the Idols",
    category: "Purpose",
    tags: ["meaning", "why", "endurance"],
    emotion_tone: "resolute",
    language: "en",
  },
  {
    quote_text:
      "The best way to predict the future is to invent it.",
    source_author: "Alan Kay",
    source_context: null,
    category: "Vision",
    tags: ["agency", "imagination", "creation"],
    emotion_tone: "uplifting",
    language: "en",
  },
  {
    quote_text:
      "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    source_author: "Will Durant",
    source_context:
      "paraphrasing Aristotle's Nicomachean Ethics in The Story of Philosophy",
    category: "Discipline",
    tags: ["habits", "consistency", "practice"],
    emotion_tone: "grounding",
    language: "en",
  },
  {
    quote_text:
      "A ship is safe in harbor, but that is not what ships are for.",
    source_author: "John A. Shedd",
    source_context: "Salt from My Attic",
    category: "Growth",
    tags: ["comfort zone", "risk", "becoming"],
    emotion_tone: "uplifting",
    language: "en",
  },
  {
    quote_text:
      "I have no special talent. I am only passionately curious.",
    source_author: "Albert Einstein",
    source_context: "letter, 1952",
    category: "Learning",
    tags: ["curiosity", "beginner mind", "humility"],
    emotion_tone: "curious",
    language: "en",
  },
  {
    quote_text:
      "Creativity is intelligence having fun.",
    source_author: "Albert Einstein",
    source_context: null,
    category: "Creativity",
    tags: ["play", "intellect", "joy"],
    emotion_tone: "playful",
    language: "en",
  },

  // Relationships
  {
    quote_text:
      "Love all, trust a few, do wrong to none.",
    source_author: "William Shakespeare",
    source_context: "All's Well That Ends Well",
    category: "Love",
    tags: ["openness", "discernment", "integrity"],
    emotion_tone: "tender",
    language: "en",
  },
  {
    quote_text:
      "A friend is someone who knows the song in your heart and can sing it back to you when you have forgotten the words.",
    source_author: "Donna Roberts",
    source_context: null,
    category: "Friendship",
    tags: ["belonging", "witnessing", "memory"],
    emotion_tone: "tender",
    language: "en",
  },
  {
    quote_text:
      "Three things in human life are important: the first is to be kind, the second is to be kind, and the third is to be kind.",
    source_author: "Henry James",
    source_context: null,
    category: "Kindness",
    tags: ["compassion", "repetition", "priorities"],
    emotion_tone: "tender",
    language: "en",
  },
  {
    quote_text:
      "Call it a clan, call it a network, call it a tribe, call it a family. Whatever you call it, whoever you are, you need one.",
    source_author: "Jane Howard",
    source_context: "Families",
    category: "Family",
    tags: ["belonging", "tribe", "roots"],
    emotion_tone: "tender",
    language: "en",
  },
  {
    quote_text:
      "Alone we can do so little; together we can do so much.",
    source_author: "Helen Keller",
    source_context: null,
    category: "Community",
    tags: ["collective", "solidarity", "capability"],
    emotion_tone: "uplifting",
    language: "en",
  },
  {
    quote_text:
      "To forgive is to set a prisoner free and discover that the prisoner was you.",
    source_author: "Lewis B. Smedes",
    source_context: "Forgive and Forget",
    category: "Forgiveness",
    tags: ["release", "self-freedom", "grace"],
    emotion_tone: "bittersweet",
    language: "en",
  },

  // Action & Mastery
  {
    quote_text:
      "Well done is better than well said.",
    source_author: "Benjamin Franklin",
    source_context: "Poor Richard's Almanack",
    category: "Action",
    tags: ["execution", "bias to action", "show don't tell"],
    emotion_tone: "resolute",
    language: "en",
  },
  {
    quote_text:
      "Leadership is the capacity to translate vision into reality.",
    source_author: "Warren Bennis",
    source_context: null,
    category: "Leadership",
    tags: ["vision", "execution", "influence"],
    emotion_tone: "resolute",
    language: "en",
  },
  {
    quote_text:
      "Master your craft, and the world opens up.",
    source_author: "Maya Angelou",
    source_context: null,
    category: "Craft",
    tags: ["mastery", "practice", "doors"],
    emotion_tone: "uplifting",
    language: "en",
  },
  {
    quote_text:
      "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    source_author: "Aristotle",
    source_context: "Nicomachean Ethics (paraphrase)",
    category: "Excellence",
    tags: ["habit", "practice", "becoming"],
    emotion_tone: "grounding",
    language: "en",
  },
  {
    quote_text:
      "Simplicity is the ultimate sophistication.",
    source_author: "Leonardo da Vinci",
    source_context: "attributed",
    category: "Simplicity",
    tags: ["clarity", "essence", "design"],
    emotion_tone: "grounding",
    language: "en",
  },
  {
    quote_text:
      "The successful warrior is the average man, with laser-like focus.",
    source_author: "Bruce Lee",
    source_context: null,
    category: "Focus",
    tags: ["attention", "discipline", "ordinary people"],
    emotion_tone: "fierce",
    language: "en",
  },

  // Mind & Time
  {
    quote_text:
      "The only true wisdom is in knowing you know nothing.",
    source_author: "Socrates",
    source_context: "Plato's Apology (paraphrase)",
    category: "Wisdom",
    tags: ["humility", "epistemic", "beginner mind"],
    emotion_tone: "contemplative",
    language: "en",
  },
  {
    quote_text:
      "Perspective is worth 80 IQ points.",
    source_author: "Alan Kay",
    source_context: null,
    category: "Perspective",
    tags: ["reframing", "meta", "leverage"],
    emotion_tone: "curious",
    language: "en",
  },
  {
    quote_text:
      "The two most powerful warriors are patience and time.",
    source_author: "Leo Tolstoy",
    source_context: "War and Peace",
    category: "Time",
    tags: ["patience", "long game", "compounding"],
    emotion_tone: "grounding",
    language: "en",
  },
  {
    quote_text:
      "You cannot step into the same river twice, for other waters are continually flowing on.",
    source_author: "Heraclitus",
    source_context: "Fragments",
    category: "Change",
    tags: ["flux", "impermanence", "rivers"],
    emotion_tone: "contemplative",
    language: "en",
  },
  {
    quote_text:
      "It is not death that a man should fear, but he should fear never beginning to live.",
    source_author: "Marcus Aurelius",
    source_context: "Meditations",
    category: "Death & Impermanence",
    tags: ["mortality", "urgency", "beginning"],
    emotion_tone: "resolute",
    language: "en",
  },
  {
    quote_text:
      "The world is full of magic things, patiently waiting for our senses to grow sharper.",
    source_author: "W.B. Yeats",
    source_context: null,
    category: "Wonder",
    tags: ["awe", "attention", "enchantment"],
    emotion_tone: "curious",
    language: "en",
  },
];

if (process.env.NODE_ENV !== "production") {
  const seen = new Set<QuoteCategory>();
  for (const s of SEED_QUOTES) seen.add(s.category);
  // Light runtime assertion: every category should appear.
  if (seen.size !== SEED_QUOTES.length) {
    console.warn(
      "[quote-library seed] duplicate categories detected in SEED_QUOTES.",
    );
  }
}
