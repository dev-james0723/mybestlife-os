"use client";

import { motion } from "framer-motion";

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } };

export function AppleTree({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-full">
      {/* Ground */}
      <ellipse cx="100" cy="200" rx="80" ry="14" fill="#8B6F47" />
      <ellipse cx="100" cy="198" rx="76" ry="11" fill="#A0845C" />

      {stage >= 1 && (
        <motion.g {...fade}>
          <ellipse cx="100" cy="192" rx="8" ry="4" fill="#795548" />
          <ellipse cx="100" cy="191" rx="5" ry="2.5" fill="#8D6E63" />
        </motion.g>
      )}

      {stage >= 2 && (
        <motion.g {...fade}>
          <motion.path
            d="M100 192 Q99 178 100 165"
            stroke="#6D4C41"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          <path d="M100 178 Q92 172 88 176" stroke="#66BB6A" strokeWidth="2" fill="none" />
          <path d="M100 178 Q108 172 112 176" stroke="#66BB6A" strokeWidth="2" fill="none" />
          <path d="M98 170 Q94 164 90 166" fill="#81C784" />
          <path d="M102 170 Q106 164 110 166" fill="#66BB6A" />
        </motion.g>
      )}

      {stage >= 3 && (
        <motion.g {...fade}>
          {/* Thicker trunk */}
          <path d="M97 192 Q96 160 97 130" stroke="#5D4037" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M103 192 Q104 160 103 130" stroke="#6D4C41" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Branches */}
          <path d="M100 150 Q82 138 75 142" stroke="#6D4C41" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M100 150 Q118 138 125 142" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Small leaf clusters */}
          <circle cx="75" cy="138" r="12" fill="#66BB6A" opacity="0.8" />
          <circle cx="125" cy="138" r="12" fill="#4CAF50" opacity="0.8" />
          <circle cx="100" cy="125" r="14" fill="#81C784" opacity="0.7" />
        </motion.g>
      )}

      {stage >= 4 && (
        <motion.g {...fade}>
          {/* Full trunk */}
          <path d="M95 195 Q93 150 95 100" stroke="#4E342E" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M105 195 Q107 150 105 100" stroke="#5D4037" strokeWidth="7" fill="none" strokeLinecap="round" />
          {/* Branches */}
          <path d="M100 140 Q72 118 62 125" stroke="#5D4037" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M100 140 Q128 118 138 125" stroke="#6D4C41" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M100 115 Q80 95 72 100" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M100 115 Q120 95 128 100" stroke="#6D4C41" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Large canopy */}
          <circle cx="62" cy="120" r="18" fill="#4CAF50" />
          <circle cx="138" cy="120" r="18" fill="#66BB6A" />
          <circle cx="100" cy="90" r="22" fill="#81C784" />
          <circle cx="80" cy="100" r="16" fill="#66BB6A" />
          <circle cx="120" cy="100" r="16" fill="#4CAF50" />
          <circle cx="72" cy="98" r="14" fill="#43A047" />
          <circle cx="128" cy="98" r="14" fill="#66BB6A" />
        </motion.g>
      )}

      {stage >= 5 && (
        <motion.g {...fade}>
          {/* Full trunk */}
          <path d="M93 198 Q90 150 93 95" stroke="#3E2723" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M107 198 Q110 150 107 95" stroke="#4E342E" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Branches */}
          <path d="M100 145 Q65 115 52 125" stroke="#4E342E" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M100 145 Q135 115 148 125" stroke="#5D4037" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M100 115 Q75 88 65 95" stroke="#4E342E" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M100 115 Q125 88 135 95" stroke="#5D4037" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Full canopy */}
          <circle cx="52" cy="118" r="20" fill="#388E3C" />
          <circle cx="148" cy="118" r="20" fill="#43A047" />
          <circle cx="100" cy="80" r="28" fill="#66BB6A" />
          <circle cx="75" cy="95" r="20" fill="#4CAF50" />
          <circle cx="125" cy="95" r="20" fill="#43A047" />
          <circle cx="65" cy="100" r="16" fill="#388E3C" />
          <circle cx="135" cy="100" r="16" fill="#4CAF50" />
          <circle cx="100" cy="65" r="18" fill="#81C784" />
          <circle cx="85" cy="75" r="14" fill="#66BB6A" />
          <circle cx="115" cy="75" r="14" fill="#4CAF50" />

          {/* Apples with gentle bounce */}
          <motion.g
            animate={{ y: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          >
            <circle cx="78" cy="105" r="6" fill="#F44336" />
            <circle cx="78" cy="102" r="1" fill="#FFCDD2" />
          </motion.g>
          <motion.g
            animate={{ y: [0, 1.5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
          >
            <circle cx="122" cy="100" r="6" fill="#E53935" />
            <circle cx="122" cy="97" r="1" fill="#FFCDD2" />
          </motion.g>
          <motion.g
            animate={{ y: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", delay: 1 }}
          >
            <circle cx="100" cy="78" r="5" fill="#F44336" />
            <circle cx="100" cy="76" r="1" fill="#FFCDD2" />
          </motion.g>
          <motion.g
            animate={{ y: [0, 1.2, 0] }}
            transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.3 }}
          >
            <circle cx="62" cy="115" r="5" fill="#EF5350" />
            <circle cx="62" cy="113" r="1" fill="#FFCDD2" />
          </motion.g>
          <motion.g
            animate={{ y: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut", delay: 0.8 }}
          >
            <circle cx="138" cy="112" r="5" fill="#F44336" />
            <circle cx="138" cy="110" r="1" fill="#FFCDD2" />
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}
