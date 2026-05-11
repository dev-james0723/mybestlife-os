/**
 * Brain taxonomy public surface.
 *
 * Single import point for adapters and the relationship engine:
 *
 *   import { classifyBrainNode, matchTopic, LIFE_AREAS } from
 *     "@/lib/brain/taxonomy";
 */

export * from "./life-areas";
export * from "./topics";
export * from "./values";
export * from "./normalizers";
export * from "./classify-node";
