"use client";

import { motion } from "framer-motion";

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } };

export function Sunflower({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Soil */}
      <ellipse cx="100" cy="180" rx="60" ry="12" fill="#8B6F47" />
      <ellipse cx="100" cy="178" rx="56" ry="10" fill="#A0845C" />

      {stage >= 1 && (
        <motion.g {...fade}>
          <ellipse cx="100" cy="172" rx="8" ry="4" fill="#8D6E63" />
          <ellipse cx="100" cy="171" rx="5" ry="3" fill="#A1887F" />
        </motion.g>
      )}

      {stage >= 2 && (
        <motion.g {...fade}>
          <motion.path
            d="M100 172 Q99 158 100 145"
            stroke="#4CAF50"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          <path d="M100 158 Q92 152 88 155" stroke="#66BB6A" strokeWidth="2" fill="none" />
          <path d="M100 158 Q108 152 112 155" stroke="#66BB6A" strokeWidth="2" fill="none" />
        </motion.g>
      )}

      {stage >= 3 && (
        <motion.g {...fade}>
          <path d="M100 172 Q99 140 100 115" stroke="#388E3C" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M100 150 Q85 140 78 145 Q85 148 100 150" fill="#66BB6A" />
          <path d="M100 150 Q115 140 122 145 Q115 148 100 150" fill="#4CAF50" />
          <path d="M100 130 Q82 120 75 125 Q82 128 100 130" fill="#81C784" />
          <path d="M100 130 Q118 120 125 125 Q118 128 100 130" fill="#66BB6A" />
        </motion.g>
      )}

      {stage >= 4 && (
        <motion.g {...fade}>
          <path d="M100 172 Q99 120 100 75" stroke="#2E7D32" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Large leaves */}
          <path d="M100 145 Q75 130 68 138 Q78 140 100 145" fill="#66BB6A" />
          <path d="M100 145 Q125 130 132 138 Q122 140 100 145" fill="#4CAF50" />
          <path d="M100 120 Q72 105 65 112 Q75 116 100 120" fill="#81C784" />
          <path d="M100 120 Q128 105 135 112 Q125 116 100 120" fill="#66BB6A" />
          {/* Bud */}
          <circle cx="100" cy="72" r="12" fill="#FDD835" opacity="0.6" />
          <circle cx="100" cy="72" r="8" fill="#795548" />
        </motion.g>
      )}

      {stage >= 5 && (
        <motion.g {...fade}>
          <path d="M100 172 Q99 120 100 68" stroke="#1B5E20" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M100 145 Q70 125 62 135 Q75 138 100 145" fill="#66BB6A" />
          <path d="M100 145 Q130 125 138 135 Q125 138 100 145" fill="#4CAF50" />
          <path d="M100 115 Q68 98 60 108 Q72 112 100 115" fill="#81C784" />
          <path d="M100 115 Q132 98 140 108 Q128 112 100 115" fill="#66BB6A" />

          {/* Full sunflower head - petals with gentle rotation */}
          <motion.g
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            style={{ transformOrigin: "100px 60px" }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.ellipse
                key={i}
                cx="100"
                cy="42"
                rx="6"
                ry="14"
                fill={i % 2 === 0 ? "#FDD835" : "#FFB300"}
                transform={`rotate(${i * 30} 100 60)`}
                animate={{ ry: [14, 15, 14] }}
                transition={{ repeat: Infinity, duration: 3, delay: i * 0.1 }}
              />
            ))}
            <circle cx="100" cy="60" r="14" fill="#5D4037" />
            <circle cx="100" cy="60" r="11" fill="#795548" />
            {/* Seed pattern */}
            <circle cx="97" cy="57" r="1.5" fill="#4E342E" />
            <circle cx="103" cy="57" r="1.5" fill="#4E342E" />
            <circle cx="100" cy="63" r="1.5" fill="#4E342E" />
            <circle cx="95" cy="62" r="1.5" fill="#4E342E" />
            <circle cx="105" cy="62" r="1.5" fill="#4E342E" />
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}
