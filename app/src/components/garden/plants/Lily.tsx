"use client";

import { motion } from "framer-motion";

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } };

export function Lily({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Soil */}
      <ellipse cx="100" cy="180" rx="60" ry="12" fill="#8B6F47" />
      <ellipse cx="100" cy="178" rx="56" ry="10" fill="#A0845C" />

      {stage >= 1 && (
        <motion.g {...fade}>
          <ellipse cx="100" cy="172" rx="7" ry="4" fill="#8D6E63" />
          <ellipse cx="100" cy="171" rx="4" ry="2.5" fill="#BCAAA4" />
        </motion.g>
      )}

      {stage >= 2 && (
        <motion.g {...fade}>
          <motion.path
            d="M100 172 Q99 160 100 148"
            stroke="#4CAF50"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          <path d="M100 160 Q93 155 90 158" stroke="#66BB6A" strokeWidth="1.5" fill="none" />
        </motion.g>
      )}

      {stage >= 3 && (
        <motion.g {...fade}>
          <path d="M100 172 Q99 145 100 120" stroke="#388E3C" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Long lily leaves */}
          <path d="M100 165 Q80 150 72 160 Q82 158 100 165" fill="#4CAF50" />
          <path d="M100 165 Q120 150 128 160 Q118 158 100 165" fill="#66BB6A" />
          <path d="M100 145 Q78 130 70 140 Q80 138 100 145" fill="#81C784" />
          <path d="M100 145 Q122 130 130 140 Q120 138 100 145" fill="#66BB6A" />
        </motion.g>
      )}

      {stage >= 4 && (
        <motion.g {...fade}>
          <path d="M100 172 Q99 125 100 85" stroke="#2E7D32" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M100 160 Q75 142 65 155 Q78 152 100 160" fill="#4CAF50" />
          <path d="M100 160 Q125 142 135 155 Q122 152 100 160" fill="#66BB6A" />
          <path d="M100 130 Q72 112 62 125 Q75 120 100 130" fill="#81C784" />
          <path d="M100 130 Q128 112 138 125 Q125 120 100 130" fill="#66BB6A" />
          {/* Closed bud */}
          <path d="M96 85 Q100 70 104 85" fill="#F8BBD0" />
          <path d="M93 87 Q100 72 107 87" fill="#F48FB1" opacity="0.7" />
        </motion.g>
      )}

      {stage >= 5 && (
        <motion.g {...fade}>
          <path d="M100 172 Q99 125 100 80" stroke="#1B5E20" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M100 158 Q70 138 60 152 Q75 148 100 158" fill="#4CAF50" />
          <path d="M100 158 Q130 138 140 152 Q125 148 100 158" fill="#66BB6A" />
          <path d="M100 125 Q68 105 58 120 Q72 115 100 125" fill="#81C784" />
          <path d="M100 125 Q132 105 142 120 Q128 115 100 125" fill="#66BB6A" />

          {/* Open lily petals */}
          <motion.g
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            style={{ transformOrigin: "100px 65px" }}
          >
            <motion.path
              d="M100 65 Q85 40 75 55 Q85 60 100 65"
              fill="#F8BBD0"
              animate={{ d: ["M100 65 Q85 40 75 55 Q85 60 100 65", "M100 65 Q83 38 73 53 Q83 58 100 65", "M100 65 Q85 40 75 55 Q85 60 100 65"] }}
              transition={{ repeat: Infinity, duration: 5 }}
            />
            <path d="M100 65 Q115 40 125 55 Q115 60 100 65" fill="#F48FB1" />
            <path d="M100 65 Q80 48 78 38 Q88 48 100 65" fill="#FCE4EC" />
            <path d="M100 65 Q120 48 122 38 Q112 48 100 65" fill="#F8BBD0" />
            <path d="M100 65 Q100 35 100 28 Q100 45 100 65" fill="#FCE4EC" opacity="0.8" />
            <path d="M100 65 Q88 50 82 42 Q90 52 100 65" fill="#F48FB1" opacity="0.6" />
            <path d="M100 65 Q112 50 118 42 Q110 52 100 65" fill="#F8BBD0" opacity="0.6" />
            {/* Center stamen */}
            <circle cx="100" cy="65" r="5" fill="#FFE082" />
            <circle cx="98" cy="63" r="1.5" fill="#FF8F00" />
            <circle cx="102" cy="63" r="1.5" fill="#FF8F00" />
            <circle cx="100" cy="67" r="1.5" fill="#FF8F00" />
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}
