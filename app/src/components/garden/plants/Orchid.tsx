"use client";

import { motion } from "framer-motion";

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } };

export function Orchid({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Pot */}
      <path d="M72 170 L78 190 H122 L128 170" fill="#D7CCC8" stroke="#BCAAA4" strokeWidth="1.5" />
      <rect x="70" y="165" width="60" height="8" rx="2" fill="#BCAAA4" />
      <ellipse cx="100" cy="170" rx="28" ry="4" fill="#A1887F" opacity="0.4" />

      {stage >= 1 && (
        <motion.g {...fade}>
          <ellipse cx="100" cy="164" rx="6" ry="3" fill="#795548" />
        </motion.g>
      )}

      {stage >= 2 && (
        <motion.g {...fade}>
          <motion.path
            d="M100 164 Q99 152 100 140"
            stroke="#66BB6A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          {/* Thick orchid leaf */}
          <path d="M100 158 Q85 150 80 158 Q88 156 100 158" fill="#4CAF50" />
          <path d="M100 158 Q115 150 120 158 Q112 156 100 158" fill="#388E3C" />
        </motion.g>
      )}

      {stage >= 3 && (
        <motion.g {...fade}>
          <path d="M100 164 Q99 135 100 110" stroke="#388E3C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* Wide orchid leaves */}
          <path d="M100 160 Q75 148 68 160 Q80 155 100 160" fill="#4CAF50" />
          <path d="M100 160 Q125 148 132 160 Q120 155 100 160" fill="#388E3C" />
          <path d="M100 140 Q78 128 72 138 Q82 134 100 140" fill="#66BB6A" />
          <path d="M100 140 Q122 128 128 138 Q118 134 100 140" fill="#4CAF50" />
          {/* Aerial root */}
          <path d="M92 162 Q82 165 78 175" stroke="#A5D6A7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </motion.g>
      )}

      {stage >= 4 && (
        <motion.g {...fade}>
          <path d="M100 164 Q99 125 100 90" stroke="#2E7D32" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Stem branching for flowers */}
          <path d="M100 100 Q110 85 120 80" stroke="#388E3C" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M100 110 Q88 95 80 90" stroke="#388E3C" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M100 158 Q70 142 62 158 Q78 150 100 158" fill="#4CAF50" />
          <path d="M100 158 Q130 142 138 158 Q122 150 100 158" fill="#388E3C" />
          <path d="M100 135 Q72 118 65 132 Q78 125 100 135" fill="#66BB6A" />
          <path d="M100 135 Q128 118 135 132 Q122 125 100 135" fill="#4CAF50" />
          {/* Buds */}
          <circle cx="120" cy="78" r="6" fill="#CE93D8" opacity="0.6" />
          <circle cx="80" cy="88" r="5" fill="#BA68C8" opacity="0.5" />
        </motion.g>
      )}

      {stage >= 5 && (
        <motion.g {...fade}>
          <path d="M100 164 Q99 125 100 85" stroke="#1B5E20" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M100 95 Q115 75 125 68" stroke="#2E7D32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M100 105 Q85 85 75 78" stroke="#2E7D32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M100 85 Q105 65 108 55" stroke="#2E7D32" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Leaves */}
          <path d="M100 155 Q65 138 58 155 Q75 148 100 155" fill="#4CAF50" />
          <path d="M100 155 Q135 138 142 155 Q125 148 100 155" fill="#388E3C" />
          <path d="M100 130 Q68 112 60 128 Q75 120 100 130" fill="#66BB6A" />
          <path d="M100 130 Q132 112 140 128 Q125 120 100 130" fill="#4CAF50" />

          {/* Orchid blooms */}
          <motion.g
            animate={{ rotate: [0, 1, -1, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            style={{ transformOrigin: "125px 65px" }}
          >
            <ellipse cx="125" cy="58" rx="8" ry="12" fill="#CE93D8" transform="rotate(-15 125 58)" />
            <ellipse cx="125" cy="58" rx="12" ry="6" fill="#E1BEE7" transform="rotate(-15 125 58)" />
            <circle cx="125" cy="58" r="4" fill="#FFE082" />
            <circle cx="125" cy="58" r="2" fill="#F57F17" />
          </motion.g>
          <motion.g
            animate={{ rotate: [0, -1, 1, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
            style={{ transformOrigin: "75px 75px" }}
          >
            <ellipse cx="75" cy="70" rx="7" ry="11" fill="#BA68C8" transform="rotate(10 75 70)" />
            <ellipse cx="75" cy="70" rx="11" ry="5" fill="#CE93D8" transform="rotate(10 75 70)" />
            <circle cx="75" cy="70" r="3.5" fill="#FFE082" />
            <circle cx="75" cy="70" r="1.8" fill="#F57F17" />
          </motion.g>
          <motion.g
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            style={{ transformOrigin: "108px 50px" }}
          >
            <ellipse cx="108" cy="45" rx="7" ry="10" fill="#E1BEE7" transform="rotate(-5 108 45)" />
            <ellipse cx="108" cy="45" rx="10" ry="5" fill="#F3E5F5" transform="rotate(-5 108 45)" />
            <circle cx="108" cy="45" r="3" fill="#FFE082" />
            <circle cx="108" cy="45" r="1.5" fill="#F57F17" />
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}
