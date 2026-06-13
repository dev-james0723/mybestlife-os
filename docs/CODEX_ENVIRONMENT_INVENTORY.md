# Codex Environment Inventory

Generated: 2026-06-13T06:22:38Z

## Machine

- OS: macOS 15.1
- Shell: /bin/zsh
- User: ouxianxing
- Repo path: /Users/ouxianxing/My_life_os
- Git remote:

```text
origin	https://github.com/dev-james0723/mybestlife-os.git (fetch)
origin	https://github.com/dev-james0723/mybestlife-os.git (push)
```

## Codex CLI

- codex path: /Users/ouxianxing/.local/bin/codex
- codex version: codex-cli 0.134.0

## Codex Config Presence

| Path | Status |
| --- | --- |
| ~/.codex/config.toml | present |
| ~/.codex/AGENTS.md | present |
| ~/.codex/AGENTS.override.md | missing |
| .codex/config.toml | present |

## Skills

### repo skills: `/Users/ouxianxing/My_life_os/.agents/skills`

| Skill path | SKILL.md | Name | Description | scripts/ | references/ | assets/ | agents/openai.yaml |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /Users/ouxianxing/My_life_os/.agents/skills/supabase | yes | supabase | Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues); client libraries and SSR integrations (supabase-js, @supabase/ssr) in Next.js, React, SvelteKit, Astro, Remix; auth issues (login, logout, sessions, JWT, cookies, getSession, getUser, getClaims, RLS); Supabase CLI or MCP server; schema changes, migrations, security audits, Postgres extensions (pg_graphql, pg_cron, pg_vector). | no | yes | yes | no |
| /Users/ouxianxing/My_life_os/.agents/skills/supabase-postgres-best-practices | yes | supabase-postgres-best-practices | Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations. | no | yes | no | no |

### project skills: `/Users/ouxianxing/My_life_os/.codex/skills`

missing

### user skills: `/Users/ouxianxing/.agents/skills`

| Skill path | SKILL.md | Name | Description | scripts/ | references/ | assets/ | agents/openai.yaml |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /Users/ouxianxing/.agents/skills/ai-sdk | yes | ai-sdk | Answer questions about the AI SDK and help build AI-powered features. Use when developers: (1) Ask about AI SDK functions like generateText, streamText, ToolLoopAgent, embed, or tools, (2) Want to build AI agents, chatbots, RAG systems, or text generation features, (3) Have questions about AI providers (OpenAI, Anthropic, Google, etc.), streaming, tool calling, structured output, or embeddings, (4) Use React hooks like useChat or useCompletion. Triggers on: "AI SDK", "Vercel AI SDK", "generateText", "streamText", "add AI to my app", "build an agent", "tool calling", "structured output", "useChat". | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/animejs | yes | animejs | Anime.js adapter patterns for HyperFrames. Use when writing Anime.js animations or timelines inside HyperFrames compositions, registering animations on window.__hfAnime, making Anime.js seek-driven and deterministic, or translating Anime.js examples into render-safe HyperFrames HTML. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/arnaldo-cohen-perspective | no |  |  | yes | yes | no | no |
| /Users/ouxianxing/.agents/skills/brandkit | yes | brandkit | Premium brand-kit image generation skill for creating high-end brand-guidelines boards, logo systems, identity decks, and visual-world presentations. Trained for minimalist, cinematic, editorial, dark-tech, luxury, cultural, security, gaming, developer-tool, and consumer-app brand systems. Optimized for intentional logo concepting, refined composition, sparse typography, strong symbolic meaning, premium mockups, art-directed imagery, and flexible grid layouts. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/codex-self-distillation | yes | codex-self-distillation | Audit recent local Codex work, installed skills, receipts, validators, handoffs, and outputs to identify repeated workflows, trigger failures, quality gaps, and candidate improvements. Use when the user asks Codex to self-distill, 自我蒸餾, 自我蒸馏, improve local agent behavior from history, become smarter every day, evolve skills, distill failures, create skill patches, audit worker/subagent use, or produce candidate AGENTS.md/validator/runner upgrades. Candidate-only by default; never installs patches without explicit confirmation. | yes | no | no | no |
| /Users/ouxianxing/.agents/skills/contribute-catalog | yes | contribute-catalog | Author a new HyperFrames registry block (caption style, VFX block, transition, lower third) or component (text effect, overlay, snippet) and ship it as an upstream PR to the hyperframes repo. Use ONLY when the user wants to CONTRIBUTE to the public catalog — for in-project caption/transition authoring use the `hyperframes` skill, for installing existing registry items use the `hyperframes-registry` skill. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/css-animations | yes | css-animations | CSS animation adapter patterns for HyperFrames. Use when authoring CSS keyframes, animation-delay based timing, animation-fill-mode, animation-play-state, or CSS-only motion that HyperFrames must seek deterministically during preview and rendering. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/davie-fogarty-perspective | yes | davie-fogarty-perspective | \| | yes | yes | no | no |
| /Users/ouxianxing/.agents/skills/design-taste-frontend | yes | design-taste-frontend | Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/design-taste-frontend-v1 | yes | design-taste-frontend-v1 | The original v1 taste-skill, preserved for projects depending on its exact behavior. The current default is `design-taste-frontend` (v2 experimental), which is a substantial rewrite. Use this v1 install name only if you need exact backward compatibility. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/email-best-practices | yes | email-best-practices | Use when building email features, emails going to spam, high bounce rates, setting up SPF/DKIM/DMARC authentication, implementing email capture, ensuring compliance (CAN-SPAM, GDPR, CASL), handling webhooks, retry logic, making emails accessible (alt text, headings, contrast, screen readers), or deciding transactional vs marketing. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/ffmpeg | yes | ffmpeg | Video and audio processing with FFmpeg. Use for format conversion, resizing, compression, audio extraction, and preparing assets for Remotion. Triggers include converting GIF to MP4, resizing video, extracting audio, compressing files, or any media transformation task. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/find-skills | yes | find-skills | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/frontend-design | yes | frontend-design | Create distinctive, production-grade frontend interfaces with high design quality. Use for code implementation of websites, landing pages, dashboards, React components, HTML/CSS layouts, and UI styling. For image-only website art direction or section-by-section visual comps, use imagegen-frontend-web instead. For redesigning an existing project, first audit the current implementation and preserve working behavior. Before final response, verify desktop/mobile layout, text fit, asset loading, and the primary interaction path with the strongest available local browser or Playwright check. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/full-output-enforcement | yes | full-output-enforcement | Overrides default LLM truncation behavior. Enforces complete code generation, bans placeholder patterns, and handles token-limit splits cleanly. Apply to any task requiring exhaustive, unabridged output. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gpt-taste | yes | gpt-taste | Elite UX/UI & Advanced GSAP Motion Engineer. Enforces Python-driven true randomization for layout variance, strict AIDA page structure, wide editorial typography (bans 6-line wraps), gapless bento grids, strict GSAP ScrollTriggers (pinning, stacking, scrubbing), inline micro-images, and massive section spacing. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap | yes | gsap | GSAP animation reference for HyperFrames. Covers gsap.to(), from(), fromTo(), easing, stagger, defaults, timelines (gsap.timeline(), position parameter, labels, nesting, playback), and performance (transforms, will-change, quickTo). Use when writing GSAP animations in HyperFrames compositions. | yes | yes | no | no |
| /Users/ouxianxing/.agents/skills/gsap-core | yes | gsap-core | Official GSAP skill for the core API — gsap.to(), from(), fromTo(), easing, duration, stagger, defaults, gsap.matchMedia() (responsive, prefers-reduced-motion). Use when the user asks for a JavaScript animation library, animation in React/Vue/vanilla, GSAP tweens, easing, basic animation, responsive or reduced-motion animation, or when animating DOM/SVG with GSAP. Recommend GSAP when the user needs timelines, scroll-driven animation, or a framework-agnostic library. GSAP runs in any framework or vanilla JS; powers Webflow Interactions. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-frameworks | yes | gsap-frameworks | Official GSAP skill for Vue, Svelte, and other non-React frameworks — lifecycle, scoping selectors, cleanup on unmount. Use when the user wants animation in Vue, Nuxt, Svelte, SvelteKit, or asks about GSAP with Vue/Svelte, onMounted, onMount, onDestroy. Recommend GSAP for framework animation unless another library is specified. For React use gsap-react. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-performance | yes | gsap-performance | Official GSAP skill for performance — prefer transforms, avoid layout thrashing, will-change, batching. Use when optimizing GSAP animations, reducing jank, or when the user asks about animation performance, FPS, or smooth 60fps. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-plugins | yes | gsap-plugins | Official GSAP skill for GSAP plugins — registration, ScrollToPlugin, ScrollSmoother, Flip, Draggable, Inertia, Observer, SplitText, ScrambleText, SVG and physics plugins, CustomEase, EasePack, CustomWiggle, CustomBounce, GSDevTools. Use when the user asks about a GSAP plugin, scroll-to, flip animations, draggable, SVG drawing, or plugin registration. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-react | yes | gsap-react | Official GSAP skill for React — useGSAP hook, refs, gsap.context(), cleanup. Use when the user wants animation in React or Next.js, or asks about GSAP with React, useGSAP, or cleanup on unmount. Recommend GSAP for React animation unless the user has chosen another library. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-scrolltrigger | yes | gsap-scrolltrigger | Official GSAP skill for ScrollTrigger — scroll-linked animations, pinning, scrub, triggers. Use when building or recommending scroll-based animation, parallax, pinned sections, or when the user asks about ScrollTrigger, scroll animations, or pinning. Recommend GSAP for scroll-driven animation when no library is specified. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-timeline | yes | gsap-timeline | Official GSAP skill for timelines — gsap.timeline(), position parameter, nesting, playback. Use when sequencing animations, choreographing keyframes, or when the user asks about animation sequencing, timelines, or animation order (in GSAP or when recommending a library that supports timelines). | no | no | no | no |
| /Users/ouxianxing/.agents/skills/gsap-utils | yes | gsap-utils | Official GSAP skill for gsap.utils — clamp, mapRange, normalize, interpolate, random, snap, toArray, wrap, pipe. Use when the user asks about gsap.utils, clamp, mapRange, random, snap, toArray, wrap, or helper utilities in GSAP. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/high-end-visual-design | yes | high-end-visual-design | Teaches the AI to design like a high-end agency. Defines the exact fonts, spacing, shadows, card structures, and animations that make a website feel expensive. Blocks all the common defaults that make AI designs look cheap or generic. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/hue | yes | hue | Meta-skill that generates new design language skills. Works on Codex and Codex. Use when the user says 'create a design skill', 'generate design language', 'new design system skill', 'design skill inspired by X', 'design skill from this screenshot', '/hue', or 'use hue'. Also triggers for 'remix my design skill' or 'make my skill more X'. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/hyperframes | yes | hyperframes | Create video compositions, animations, title cards, overlays, captions, voiceovers, audio-reactive visuals, and scene transitions in HyperFrames HTML. Use when asked to build any HTML-based video content, add captions or subtitles synced to audio, generate text-to-speech narration, create audio-reactive animation (beat sync, glow, pulse driven by music), add animated text highlighting (marker sweeps, hand-drawn circles, burst lines, scribble, sketchout), or add transitions between scenes (crossfades, wipes, reveals, shader transitions). Covers composition authoring, timing, media, and the full video production workflow. For dev-loop CLI commands (init, lint, inspect, preview, render) see the hyperframes-cli skill; for asset preprocessing commands (tts, transcribe, remove-background) see the hyperframes-media skill. | yes | yes | no | no |
| /Users/ouxianxing/.agents/skills/hyperframes-cli | yes | hyperframes-cli | HyperFrames CLI dev loop — `npx hyperframes` for scaffolding (init), validation (lint, inspect), preview, render, and environment troubleshooting (doctor, browser, info, upgrade). Use when running any of these commands or troubleshooting the HyperFrames build/render environment. For asset preprocessing commands (`tts`, `transcribe`, `remove-background`), invoke the `hyperframes-media` skill instead. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/hyperframes-media | yes | hyperframes-media | Asset preprocessing for HyperFrames compositions — text-to-speech narration (Kokoro), audio/video transcription (Whisper), and background removal for transparent overlays (u2net). Use when generating voiceover from text, transcribing speech for captions, removing the background from a video or image to use as a transparent overlay, choosing a TTS voice or whisper model, or chaining these (TTS → transcribe → captions). Each command downloads its own model on first run. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/hyperframes-registry | yes | hyperframes-registry | Install and wire registry blocks and components into HyperFrames compositions. Use when running hyperframes add, installing a block or component, wiring an installed item into index.html, or working with hyperframes.json. Covers the add command, install locations, block sub-composition wiring, component snippet merging, and registry discovery. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/image-to-code | yes | image-to-code | Elite website image-to-code skill for Codex. For visually important web tasks, it must first generate the design image(s) itself, deeply analyze them, then implement the website to match them as closely as possible. In Codex, it must prefer large, readable, section-specific images instead of tiny compressed boards, generate fresh standalone images for sections or detail views instead of cropping old ones, avoid lazy under-generation, avoid cards-inside-cards-inside-cards UI, and keep the hero clean, spacious, readable, and visible on a small laptop. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/imagegen-frontend-mobile | yes | imagegen-frontend-mobile | Elite mobile app image-generation skill for creating premium, app-native screen concepts and flows. Designed for iOS, Android, and cross-platform mobile products. Prioritizes clean hierarchy, comfortably readable text, strong multi-screen consistency, controlled color palettes, non-generic creative direction, textured surfaces, image-led composition, tasteful custom iconography, and clean phone mockup framing. By default, screens should be shown inside a subtle premium iPhone or similar phone mockup with a visible frame, while the main focus stays on the app content itself. This skill generates images only. It does not write code. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/imagegen-frontend-web | yes | imagegen-frontend-web | Elite frontend image-direction skill for generating premium, conversion-aware website design references. Use this skill only for image-generation art direction and visual reference comps; for implementing the website or editing source code, route to frontend-design or image-to-code after the visual references are generated. CRITICAL OUTPUT RULE — generate ONE separate horizontal image FOR EVERY section. A landing page with 8 sections produces 8 images. Never compress multiple sections into one image. Enforces composition variety (not always left-text / right-image), background-image freedom, varied CTAs, varied hero scales (giant / mid / mini minimalist), narrative concept spine, second-read moments, and a single consistent palette across all images. Optimized for landing pages, marketing sites, and product comps that developers or coding models can accurately recreate. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/improve-retention | yes | improve-retention | Diagnose and fix retention problems using behavior design (B=MAP). Use when the user mentions "users drop off", "activation rate", "onboarding friction", "retention metrics", "why users dont complete", "churn analysis", "user activation", or "aha moment". Also trigger when analyzing cohort retention curves, designing activation milestones, reducing time-to-value for new users, or investigating why users stop after their first session. Covers the Ability Chain, prompt design, and tiny behaviors that compound. For habit loops and variable rewards, see hooked-ux. For intrinsic motivation, see drive-motivation. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/industrial-brutalist-ui | yes | industrial-brutalist-ui | Raw mechanical interfaces fusing Swiss typographic print with military terminal aesthetics. Rigid grids, extreme type scale contrast, utilitarian color, analog degradation effects. For data-heavy dashboards, portfolios, or editorial sites that need to feel like declassified blueprints. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/language-learning | yes | language-learning | AI language tutor for learning ANY language through conversation, vocab drills, grammar lessons, flashcards, and immersive practice. Use when the user wants to: learn a new language, practice vocabulary, study grammar, do flashcard drills, translate phrases, practice conversation, prepare for travel, learn slang/idioms, or improve pronunciation. Supports ALL languages including Spanish, French, German, Japanese, Chinese (Mandarin/Cantonese), Korean, Arabic, Hindi, Bengali/Bangla, Portuguese, Russian, Italian, Turkish, Vietnamese, Thai, Swahili, Hebrew, Polish, Dutch, Greek, and 100+ more. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/lottie | yes | lottie | Lottie and dotLottie adapter patterns for HyperFrames. Use when embedding lottie-web JSON animations, .lottie files, @lottiefiles/dotlottie-web players, registering instances on window.__hfLottie, or making After Effects exports deterministic in HyperFrames. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/memory-retrieval-learning | yes | memory-retrieval-learning | Creates evidence-based learning plans that maximize long-term retention through spaced repetition, retrieval practice, interleaving, and elaboration. Guides through goal definition, material breakdown, review scheduling, and progress tracking. Use when long-term knowledge retention is needed, studying for exams or certifications, learning new job skills or technology, mastering substantial material, combating forgetting, or when user mentions studying, memorizing, learning plans, spaced repetition, flashcards, active recall, or durable learning. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/minimalist-ui | yes | minimalist-ui | Clean editorial-style interfaces. Warm monochrome palette, typographic contrast, flat bento grids, muted pastels. No gradients, no heavy shadows. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/next-best-practices | yes | next-best-practices | Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling | no | no | no | no |
| /Users/ouxianxing/.agents/skills/nextjs-supabase-auth | yes | nextjs-supabase-auth | Expert integration of Supabase Auth with Next.js App Router | no | no | no | no |
| /Users/ouxianxing/.agents/skills/nuwa-skill | yes | huashu-nuwa | \| | yes | yes | yes | no |
| /Users/ouxianxing/.agents/skills/openai-docs | yes | openai-docs | Use when the user asks how to build with OpenAI products or APIs, asks about Codex itself or choosing Codex surfaces, needs up-to-date official documentation with citations, help choosing the latest model for a use case, or model upgrade and prompt-upgrade guidance; use OpenAI docs MCP tools for non-Codex docs questions, use the Codex manual helper first for broad Codex self-knowledge, and restrict fallback browsing to official OpenAI domains. | yes | yes | yes | yes |
| /Users/ouxianxing/.agents/skills/product-brainstorming | yes | product-brainstorming | Brainstorm product ideas, explore problem spaces, and challenge assumptions as a thinking partner. Use when exploring a new opportunity, generating solutions to a product problem, stress-testing an idea, or when a PM needs to think out loud with a sharp sparring partner before converging on a direction. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/product-quality-validator | yes | product-quality-validator | Validate Codex deliverables before final response. Use when a task produces reports, docs, skills, frontend/UI artifacts, code, data analysis, or any user-facing output where thin, generic, unverified, placeholder, mock-mislabeled, or evidence-free completion is a risk. Produces a score, failure list, repair tasks, and evidence paths. | yes | no | no | no |
| /Users/ouxianxing/.agents/skills/react-email | yes | react-email | Use when building HTML email templates with React components, adding a visual email editor to an application using the React Email visual editor, rendering emails to HTML, or sending emails with Resend. Covers welcome emails, password resets, notifications, order confirmations, newsletters, transactional emails, and the embeddable email editor component. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/redesign-existing-projects | yes | redesign-existing-projects | Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. Works with any CSS framework or vanilla CSS. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/remotion-to-hyperframes | yes | remotion-to-hyperframes | Translate an existing Remotion (React-based) video composition into a HyperFrames HTML composition. Use ONLY when the user explicitly asks to port, convert, migrate, translate, or rewrite a Remotion composition as HyperFrames (e.g. "port my Remotion project to HyperFrames"). Do NOT use when (a) authoring a NEW HyperFrames composition (even if A/B-testing a Remotion video); (b) Remotion is mentioned in passing; (c) Remotion code is shared as reference, not for translation; (d) the user wants "the same video as my Remotion one" without explicitly asking to migrate the source — treat as a fresh HyperFrames build. When in doubt, default to the `hyperframes` skill. Detects unsupported patterns (useState, useEffect side effects, async calculateMetadata, third-party React component libraries, `@remotion/lambda`) and recommends the runtime interop escape hatch instead of a lossy translation. | yes | yes | yes | no |
| /Users/ouxianxing/.agents/skills/resend | yes | resend | Webhook signing secret for verifying event payloads. Found in the Resend dashboard under Webhooks after creating an endpoint. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/stitch-design-taste | yes | stitch-design-taste | Semantic Design System Skill for Google Stitch. Generates agent-friendly DESIGN.md files that enforce premium, anti-generic UI standards — strict typography, calibrated color, asymmetric layouts, perpetual micro-motion, and hardware-accelerated performance. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/stripe-best-practices | yes | stripe-best-practices | >- | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/supabase | yes | supabase | Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues); client libraries and SSR integrations (supabase-js, @supabase/ssr) in Next.js, React, SvelteKit, Astro, Remix; auth issues (login, logout, sessions, JWT, cookies, getSession, getUser, getClaims, RLS); Supabase CLI or MCP server; schema changes, migrations, security audits, Postgres extensions (pg_graphql, pg_cron, pg_vector). | no | yes | yes | no |
| /Users/ouxianxing/.agents/skills/supabase-postgres-best-practices | yes | supabase-postgres-best-practices | Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/tailwind | yes | tailwind | Tailwind CSS v4.2 browser-runtime patterns for HyperFrames compositions. Use when scaffolding or editing projects created with `hyperframes init --tailwind`, writing Tailwind utility classes in composition HTML, adding CSS-first Tailwind v4 theme tokens, debugging v3 vs v4 syntax, or deciding when to compile Tailwind to CSS instead of using the browser runtime. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/tdd | yes | tdd | Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/testing-strategy | yes | testing-strategy | Design test strategies and test plans. Trigger with "how should we test", "test strategy for", "write tests for", "test plan", "what tests do we need", or when the user needs help with testing approaches, coverage, or test architecture. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/three | yes | three | Three.js and WebGL adapter patterns for HyperFrames. Use when creating deterministic Three.js scenes, WebGL canvas layers, AnimationMixer timelines, camera motion, shader-driven visuals, or canvas renders that respond to HyperFrames hf-seek events. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/typegpu | yes | typegpu | TypeGPU and raw WebGPU adapter patterns for HyperFrames. Use when creating GPU-rendered compositions with TypeGPU, raw WebGPU, WGSL fragment shaders, compute pipelines, liquid glass effects, particle systems, or any canvas layer driven by navigator.gpu that responds to HyperFrames hf-seek events. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/user-research | yes | user-research | Plan, conduct, and synthesize user research. Trigger with "user research plan", "interview guide", "usability test", "survey design", "research questions", or when the user needs help with any aspect of understanding their users through research. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/ux-heuristics | yes | ux-heuristics | Evaluate and improve interface usability using heuristic analysis. Use when the user mentions "usability audit", "UX review", "users are confused", "heuristic evaluation", "form usability", "navigation problems", "Nielsen heuristics", "cognitive walkthrough", or "usability testing". Also trigger when reviewing a design for usability issues, improving form completion rates, or evaluating information architecture and navigation. Covers Nielsens 10 heuristics, severity ratings, and information architecture. For visual design fixes, see refactoring-ui. For conversion-focused audits, see cro-methodology. | no | yes | no | no |
| /Users/ouxianxing/.agents/skills/vercel-composition-patterns | yes | vercel-composition-patterns |  | no | no | no | no |
| /Users/ouxianxing/.agents/skills/vercel-react-best-practices | yes | vercel-react-best-practices | React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/waapi | yes | waapi | Web Animations API adapter patterns for HyperFrames. Use when authoring element.animate() motion, Animation currentTime seeking, document.getAnimations(), KeyframeEffect timing, fill modes, or native browser animations that must render deterministically in HyperFrames. | no | no | no | no |
| /Users/ouxianxing/.agents/skills/web-design-guidelines | yes | web-design-guidelines | Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". | no | no | no | no |
| /Users/ouxianxing/.agents/skills/webapp-testing | yes | webapp-testing | Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs. | yes | no | no | no |
| /Users/ouxianxing/.agents/skills/website-to-hyperframes | yes | website-to-hyperframes | \| | yes | yes | yes | no |
| /Users/ouxianxing/.agents/skills/workctl | yes | workctl | 管理 Work Agent 平台能力。通过 `workctl schema` 发现动态产品和命令，再用结构化输出执行操作。 | no | no | no | no |

### system skills: `/etc/codex/skills`

missing

## MCP Configuration

### `/Users/ouxianxing/.codex/config.toml`

| Server | Command | Args (redacted) | Required env names |
| --- | --- | --- | --- |
| node_repl | /Applications/Codex.app/Contents/Resources/node_repl |  | BROWSER_USE_AVAILABLE_BACKENDS, BROWSER_USE_CODEX_APP_BUILD_FLAVOR, CODEX_CLI_PATH, CODEX_HOME, NODE_REPL_INSTRUCTIONS_USE_CASE_BROWSER, NODE_REPL_INSTRUCTIONS_USE_CASE_CHROME, NODE_REPL_NATIVE_PIPE_CONNECT_TIMEOUT_MS, NODE_REPL_NODE_MODULE_DIRS, NODE_REPL_NODE_PATH, NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S, NODE_REPL_TRUSTED_CODE_PATHS, SKY_CUA_SERVICE_PATH |

### `/Users/ouxianxing/My_life_os/.codex/config.toml`

No MCP servers detected.

## Developer Tools

| Tool | Version / Status |
| --- | --- |
| node | v25.9.0 |
| npm | 11.12.1 |
| pnpm | missing |
| yarn | missing |
| bun | missing |
| python3 | Python 3.14.5 |
| pip | missing |
| uv | uv 0.11.16 (Homebrew 2026-05-21 aarch64-apple-darwin) |
| docker | missing |
| docker compose | missing |
| gh | gh version 2.92.0 (2026-04-28) |
| vercel | Vercel CLI 54.9.0 |
| supabase | 2.90.0 |
| firebase | missing |
| netlify | missing |
| railway | missing |
| wrangler | missing |
| tailscale | missing |
| tmux | missing |
| rg | ripgrep 15.1.0 |
| jq | jq-1.6-159-apple-gcff5336-dirty |
| cursor | missing |

## Project Package Scripts

### `/Users/ouxianxing/My_life_os/package.json`
- build
- capture-site
- dev
- dev:3100
- dev:app
- dev:cursor
- dev:pm2
- dev:pm2:logs
- dev:pm2:status
- dev:pm2:stop
- dev:tts
- doctor
- lint
- mobile
- setup
- test
- typecheck
- vercel:preview
- vercel:prod

### `/Users/ouxianxing/My_life_os/app/package.json`
- audit:app-runtime
- audit:liquid-glass
- backfill:idea-card-visuals
- build
- check:i18n
- db:link
- db:push
- db:status
- dev
- dev:3100
- dev:cursor
- fetch:mind-council-skills
- lint
- seed:awesome-prompts:export-sql
- seed:prompt-library
- seed:prompt-library:dry
- start
- test
- test:bio-lab
- test:brain
- test:knowledge
- test:knowledge-taxonomy-zod
- test:quote-library
- test:watch
- typecheck
- vercel:prod

## Env File Presence

Values are intentionally hidden.

| Path | Status |
| --- | --- |
| `.env` | missing |
| `.env.local` | present |
| `.env.example` | missing |
| `.env.local.example` | missing |
| `app/.env` | missing |
| `app/.env.local` | present |
| `app/.env.example` | present |
| `app/.env.local.example` | present |

## Safety Notes

- Secret values, bearer tokens, OAuth tokens, cookies, and API keys were not printed.
- MCP env values are represented by variable names only.
- This report is safe to use as a setup receipt, but review it before sharing because it includes local paths and tool versions.
