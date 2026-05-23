/** Public portrait assets for preset Mind Council advisors. */
export const ADVISOR_PORTRAIT_PATHS: Record<string, string> = {
  "lens-elon-musk": "/mind-council/portraits/lens-elon-musk.png",
  "lens-steve-jobs": "/mind-council/portraits/lens-steve-jobs.png",
  "lens-jeff-bezos": "/mind-council/portraits/lens-jeff-bezos.png",
  "lens-sam-altman": "/mind-council/portraits/lens-sam-altman.png",
  "lens-warren-buffett": "/mind-council/portraits/lens-warren-buffett.png",
  "lens-charlie-munger": "/mind-council/portraits/lens-charlie-munger.png",
  "lens-ray-dalio": "/mind-council/portraits/lens-ray-dalio.png",
  "lens-michael-jackson": "/mind-council/portraits/lens-michael-jackson.png",
  "lens-beyonce": "/mind-council/portraits/lens-beyonce.png",
  "lens-glenn-gould": "/mind-council/portraits/lens-glenn-gould.png",
  "lens-lang-lang": "/mind-council/portraits/lens-lang-lang.png",
  "lens-leonard-bernstein": "/mind-council/portraits/lens-leonard-bernstein.png",
  "lens-kobe-bryant": "/mind-council/portraits/lens-kobe-bryant.png",
  "lens-lebron-james": "/mind-council/portraits/lens-lebron-james.png",
  "lens-serena-williams": "/mind-council/portraits/lens-serena-williams.png",
  "lens-barack-obama": "/mind-council/portraits/lens-barack-obama.png",
  "lens-nelson-mandela": "/mind-council/portraits/lens-nelson-mandela.png",
  "lens-winston-churchill": "/mind-council/portraits/lens-winston-churchill.png",
  "lens-albert-einstein": "/mind-council/portraits/lens-albert-einstein.png",
  "lens-richard-feynman": "/mind-council/portraits/lens-richard-feynman.png",
  "lens-charles-darwin": "/mind-council/portraits/lens-charles-darwin.png",
  "lens-marcus-aurelius": "/mind-council/portraits/lens-marcus-aurelius.png",
  "lens-friedrich-nietzsche": "/mind-council/portraits/lens-friedrich-nietzsche.png",
  "lens-virginia-woolf": "/mind-council/portraits/lens-virginia-woolf.png",
  "lens-thich-nhat-hanh": "/mind-council/portraits/lens-thich-nhat-hanh.png",
};

export function getAdvisorPortraitPath(skillId: string): string | undefined {
  return ADVISOR_PORTRAIT_PATHS[skillId];
}
