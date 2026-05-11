export type InspirationVideo = {
  id: string;
  title: string;
  channel: string;
  tag: string;
  description: string;
};

/** Curated list aligned with captured reference content order and shuffle pool. */
export const INSPIRATION_VIDEOS: InspirationVideo[] = [
  {
    id: "q13xr9KBABE",
    title: "Deliberate Practice in Music: Lessons From Anders Ericsson",
    channel: "Deliberate Musician",
    tag: "Elite Practice Mindset",
    description:
      "One of the most important things you can do to improve your musical skills is to understand the difference between deliberate practice and regular practice.",
  },
  {
    id: "arj7oStGLkU",
    title: "Inside the mind of a master procrastinator",
    channel: "TED",
    tag: "Focus & habits",
    description:
      "Tim Urban takes you inside the procrastinator’s brain and explains why we wait until the last minute — and what to do about it.",
  },
  {
    id: "iG9CE55wbtY",
    title: "The surprising habits of original thinkers",
    channel: "TED",
    tag: "Creative thinking",
    description:
      "Organizational psychologist Adam Grant explores how originals balance risk, doubt, and volume of ideas to move faster than their peers.",
  },
  {
    id: "Ks-_Mh1QhMc",
    title: "Your body language may shape who you are",
    channel: "TED",
    tag: "Presence",
    description:
      "Amy Cuddy explains how tiny tweaks in posture can influence confidence and how we show up in high-stakes moments.",
  },
  {
    id: "qp0HIF3SfI4",
    title: "How to speak so that people want to listen",
    channel: "TED",
    tag: "Communication",
    description:
      "Julian Treasure shares practical vocal habits and listening filters that make everyday conversations more compelling.",
  },
];

export function inspirationById(id: string): InspirationVideo | undefined {
  return INSPIRATION_VIDEOS.find((v) => v.id === id);
}
