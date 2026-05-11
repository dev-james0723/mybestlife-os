"use client";

import { motion } from "framer-motion";

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } };

export function Grass({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Soil */}
      <ellipse cx="100" cy="180" rx="60" ry="12" fill="#8B6F47" />
      <ellipse cx="100" cy="178" rx="56" ry="10" fill="#A0845C" />

      {stage >= 1 && (
        <motion.g {...fade}>
          {/* Seed bump */}
          <ellipse cx="100" cy="172" rx="8" ry="4" fill="#6B8E23" />
        </motion.g>
      )}

      {stage >= 2 && (
        <motion.g {...fade}>
          {/* First shoot */}
          <motion.path
            d="M100 172 Q98 155 100 140"
            stroke="#4CAF50"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.path
            d="M100 155 Q108 148 112 150"
            stroke="#66BB6A"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
        </motion.g>
      )}

      {stage >= 3 && (
        <motion.g {...fade}>
          {/* More blades */}
          <path d="M100 160 Q90 140 85 130" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M100 160 Q110 140 115 130" stroke="#66BB6A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M100 150 Q88 130 82 120" stroke="#43A047" strokeWidth="2" fill="none" strokeLinecap="round" />
        </motion.g>
      )}

      {stage >= 4 && (
        <motion.g {...fade}>
          {/* Full grass cluster */}
          <path d="M95 165 Q82 130 78 105" stroke="#4CAF50" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M105 165 Q118 130 122 105" stroke="#66BB6A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M100 168 Q100 130 100 100" stroke="#43A047" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M92 165 Q75 125 70 95" stroke="#81C784" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M108 165 Q125 125 130 95" stroke="#81C784" strokeWidth="2" fill="none" strokeLinecap="round" />
        </motion.g>
      )}

      {stage >= 5 && (
        <motion.g {...fade}>
          {/* Flowering tips with gentle sway */}
          <motion.circle
            cx="78" cy="103" r="4" fill="#C8E6C9"
            animate={{ cy: [103, 100, 103] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <motion.circle
            cx="122" cy="103" r="4" fill="#C8E6C9"
            animate={{ cy: [103, 100, 103] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />
          <motion.circle
            cx="100" cy="98" r="5" fill="#A5D6A7"
            animate={{ cy: [98, 95, 98] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          />
          <motion.circle
            cx="70" cy="93" r="3" fill="#E8F5E9"
            animate={{ cy: [93, 90, 93] }}
            transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
          />
          <motion.circle
            cx="130" cy="93" r="3" fill="#E8F5E9"
            animate={{ cy: [93, 90, 93] }}
            transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
          />
        </motion.g>
      )}
    </svg>
  );
}
