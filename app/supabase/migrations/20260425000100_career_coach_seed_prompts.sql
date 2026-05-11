-- Seed: 8 curated system prompt templates.
-- Idempotent: uses ON CONFLICT (slug) DO UPDATE so re-runs update existing rows.
-- Prompt bodies are English-first. i18n for titles/descriptions covers all 9 locales
-- where translations were available; the compiler falls back to 'en' otherwise.

INSERT INTO public.system_prompt_templates
  (slug, category, icon, title_i18n, description_i18n, prompt_i18n,
   required_variables, optional_variables, attachment_categories, sort_order)
VALUES
-- -----------------------------------------------------------------------------
(
  'resume-critique',
  'resume',
  '📄',
  '{"en":"Critique My Resume","zh-TW":"批改我的履歷","zh-CN":"批改我的简历","ja":"履歴書を添削","ko":"이력서 비평","fr":"Critiquer mon CV","it":"Critica il mio CV","es":"Critica mi CV","vi":"Phê bình CV của tôi"}'::jsonb,
  '{"en":"Get brutally honest recruiter feedback on your resume.","zh-TW":"獲得招募者毫不留情的履歷回饋。","zh-CN":"获得招聘者毫不留情的简历反馈。","ja":"採用担当者から率直なフィードバックを受け取ります。","ko":"채용 담당자의 솔직한 이력서 피드백을 받으세요.","fr":"Obtenez des retours francs d''un recruteur sur votre CV.","it":"Ricevi un feedback sincero da un recruiter sul tuo CV.","es":"Obtén comentarios brutalmente honestos sobre tu CV.","vi":"Nhận phản hồi thẳng thắn từ nhà tuyển dụng về CV của bạn."}'::jsonb,
  jsonb_build_object('en',
'You are a senior recruiter with 15+ years of experience in [INDUSTRY].
Critique the resume I will paste below for a [TARGET_ROLE] position.

Focus on:
1. First-impression impact (does it pass the 6-second scan?)
2. Quantifiable achievements vs. generic descriptions
3. Keywords alignment with [TARGET_ROLE]
4. Red flags or gaps I should address
5. Specific rewrite suggestions for the weakest sections

Be brutally honest. Don''t sugar-coat. End with a score /10 and top 3 priority fixes.'),
  ARRAY['TARGET_ROLE'], ARRAY['INDUSTRY'], ARRAY['resume'], 10
),
-- -----------------------------------------------------------------------------
(
  'resume-tailor-to-jd',
  'resume',
  '🎯',
  '{"en":"Tailor Resume to Job Description","zh-TW":"依職缺描述調整履歷","zh-CN":"按职位描述定制简历","ja":"求人票に合わせて履歴書を調整","ko":"채용 공고에 맞춰 이력서 조정","fr":"Adapter le CV à l''offre","it":"Adatta il CV alla descrizione","es":"Adaptar el CV a la oferta","vi":"Điều chỉnh CV theo JD"}'::jsonb,
  '{"en":"Rewrite your resume bullets to align with a specific job description.","zh-TW":"依特定職缺描述重寫履歷條目。","zh-CN":"按特定职位描述重写简历条目。","ja":"特定の求人票に合わせて履歴書の各項目を書き直します。","ko":"특정 채용 공고에 맞춰 이력서 항목을 다시 작성합니다.","fr":"Réécrire les puces du CV pour correspondre à l''offre.","it":"Riscrivi i punti del CV in base all''annuncio.","es":"Reescribe los puntos del CV según la oferta.","vi":"Viết lại các gạch đầu dòng trong CV theo JD."}'::jsonb,
  jsonb_build_object('en',
'Act as an elite resume strategist. I will paste my current resume and a target job description below.

Job description:
[JOB_DESCRIPTION]

Your task:
1. Extract the 8-12 most important keywords and competencies from the JD (weighted by frequency + placement).
2. Map each of my existing resume bullets to those keywords; mark unmapped bullets as low-value.
3. Rewrite the top 5 weakest bullets using the STAR format, incorporating the JD''s language without stuffing.
4. Suggest 2-3 net-new bullets I may have forgotten to include.
5. Flag any skills gap that is a deal-breaker and how to address it honestly.

Output format: table for keyword mapping, then rewritten bullets side-by-side (before ↔ after).'),
  ARRAY['JOB_DESCRIPTION'], ARRAY[]::text[], ARRAY['resume'], 20
),
-- -----------------------------------------------------------------------------
(
  'career-clarity',
  'discovery',
  '🧭',
  '{"en":"Find My Career Clarity","zh-TW":"找出我的職涯定位","zh-CN":"找到我的职业方向","ja":"キャリアの軸を発見","ko":"나의 커리어 방향 찾기","fr":"Trouver ma clarté de carrière","it":"Trova la mia chiarezza di carriera","es":"Encuentra tu claridad profesional","vi":"Tìm rõ định hướng nghề nghiệp"}'::jsonb,
  '{"en":"Use a structured framework to identify your core professional identity.","zh-TW":"用結構化框架找出你的核心專業身份。","zh-CN":"用结构化框架找到你的核心职业身份。","ja":"構造化フレームワークで核となる専門性を特定。","ko":"구조화된 프레임워크로 핵심 전문성을 찾아보세요.","fr":"Cadre structuré pour identifier votre identité pro.","it":"Quadro strutturato per identificare la tua identità pro.","es":"Identifica tu identidad profesional central.","vi":"Xác định bản sắc nghề nghiệp cốt lõi."}'::jsonb,
  jsonb_build_object('en',
'Act as an executive career coach. Use the CRISPY framework (Craft, Relationships, Impact, Skills, Purpose, Yearning) to help me identify my core professional identity.

Walk me through CRISPY one dimension at a time. For each dimension:
1. Ask me 2-3 probing questions (wait for my answers before moving on).
2. Reflect back what you heard in one sharp sentence.
3. Note themes you observe across dimensions.

After all six dimensions, produce:
- A one-sentence "career thesis" that ties my strengths to my aspirations.
- Three role archetypes that fit this thesis.
- One uncomfortable truth I should sit with.

Ready when I am.'),
  ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 30
),
-- -----------------------------------------------------------------------------
(
  'career-pivot-analysis',
  'transition',
  '🔄',
  '{"en":"Career Pivot Analysis","zh-TW":"職涯轉換分析","zh-CN":"职业转型分析","ja":"キャリアピボット分析","ko":"커리어 전환 분석","fr":"Analyse de reconversion","it":"Analisi di cambio carriera","es":"Análisis de cambio de carrera","vi":"Phân tích chuyển ngành"}'::jsonb,
  '{"en":"Map transferable skills from your current field to a target field.","zh-TW":"盤點可轉移技能，從現有領域轉向目標領域。","zh-CN":"梳理可迁移技能，从当前领域转向目标领域。","ja":"現職から目標分野への転用スキルを整理。","ko":"현재 분야에서 목표 분야로 이전 가능한 역량 정리.","fr":"Cartographier les compétences transférables.","it":"Mappa le competenze trasferibili.","es":"Mapea habilidades transferibles.","vi":"Liệt kê kỹ năng có thể chuyển đổi."}'::jsonb,
  jsonb_build_object('en',
'I''m considering a pivot from [CURRENT_FIELD] to [TARGET_FIELD]. Act as a career transition strategist.

Deliver:
1. A transferable-skills matrix: for each of my top 5 skills, explain (concretely) how it maps into [TARGET_FIELD], and how a hiring manager in [TARGET_FIELD] would interpret it.
2. Gaps: the 3 biggest skill/credential/network gaps I should expect, ranked by blocker severity.
3. A 90-day bridge plan — quick-win signals (side-projects, certs, content) that would make a hiring manager take me seriously.
4. The realistic salary delta and seniority reset I should budget for.
5. Two unconventional entry paths most people overlook.

Be specific. No platitudes.'),
  ARRAY['CURRENT_FIELD', 'TARGET_FIELD'], ARRAY[]::text[], ARRAY[]::text[], 40
),
-- -----------------------------------------------------------------------------
(
  'three-month-learning-plan',
  'growth',
  '📚',
  '{"en":"3-Month Learning Plan","zh-TW":"三個月學習計畫","zh-CN":"三个月学习计划","ja":"3ヶ月学習プラン","ko":"3개월 학습 계획","fr":"Plan d''apprentissage 3 mois","it":"Piano di studio 3 mesi","es":"Plan de aprendizaje 3 meses","vi":"Kế hoạch học 3 tháng"}'::jsonb,
  '{"en":"Build a focused 12-week plan to master a new skill.","zh-TW":"規劃 12 週精進新技能的學習路徑。","zh-CN":"规划 12 周掌握新技能的学习路径。","ja":"12週間で新スキルを習得する学習プランを作成。","ko":"12주간 새 기술을 익히는 학습 계획 수립.","fr":"Planifier 12 semaines pour maîtriser une nouvelle compétence.","it":"Pianifica 12 settimane per padroneggiare una nuova competenza.","es":"Planifica 12 semanas para dominar una nueva habilidad.","vi":"Lập kế hoạch 12 tuần để thành thạo kỹ năng mới."}'::jsonb,
  jsonb_build_object('en',
'Design a 12-week learning roadmap for me to reach working proficiency in [TARGET_SKILL]. I can commit [HOURS_PER_DAY] hours per weekday plus weekends.

Deliver week-by-week:
- Core concept to master (single sentence)
- 1-2 specific resources (book / course / doc — be concrete, name them)
- A deliverable I can publish or put on my resume
- A self-assessment question I should be able to answer at week''s end

Then add:
- The 3 most common pitfalls beginners hit with [TARGET_SKILL] and how to avoid them.
- Checkpoints at week 4, 8, and 12 with "red flags" that mean I''m off-track.
- One stretch challenge for week 13+ if I''m ahead of schedule.'),
  ARRAY['TARGET_SKILL', 'HOURS_PER_DAY'], ARRAY[]::text[], ARRAY[]::text[], 50
),
-- -----------------------------------------------------------------------------
(
  'mock-behavioral-interview',
  'interview',
  '🎤',
  '{"en":"Mock Behavioral Interview","zh-TW":"行為面試模擬","zh-CN":"行为面试模拟","ja":"行動面接シミュレーション","ko":"행동 면접 모의","fr":"Entretien comportemental simulé","it":"Colloquio comportamentale simulato","es":"Entrevista conductual simulada","vi":"Phỏng vấn hành vi mô phỏng"}'::jsonb,
  '{"en":"Run a realistic behavioral interview and get STAR-method feedback.","zh-TW":"模擬真實行為面試並取得 STAR 法則回饋。","zh-CN":"模拟真实行为面试并获得 STAR 方法反馈。","ja":"本番さながらの行動面接と STAR メソッドのフィードバック。","ko":"실전 같은 행동 면접과 STAR 기법 피드백.","fr":"Entretien comportemental réaliste avec retour STAR.","it":"Colloquio comportamentale realistico con feedback STAR.","es":"Entrevista conductual realista con retroalimentación STAR.","vi":"Phỏng vấn hành vi sát thực tế với phản hồi STAR."}'::jsonb,
  jsonb_build_object('en',
'Act as a senior hiring manager at [COMPANY] interviewing me for a [ROLE] position.

Run a realistic 30-minute behavioral interview. Rules:
1. Ask ONE question at a time. Wait for my answer before the next.
2. Ask 5 questions total, covering: ownership, conflict, ambiguity, impact, failure.
3. Probe my answer with a genuine follow-up before moving on ("tell me more about X", "how did the stakeholder react?").
4. Don''t break character. Do not reveal the evaluation rubric during the interview.

After the 5th question:
- Score each answer on a STAR rubric (Situation, Task, Action, Result) from 1-5, with one-line justification.
- Identify the 2 weakest answers and give me the exact rephrase I should use next time.
- Tell me what a strong candidate for this role would have said that I didn''t.

Start with question 1 now.'),
  ARRAY['COMPANY', 'ROLE'], ARRAY[]::text[], ARRAY['resume'], 60
),
-- -----------------------------------------------------------------------------
(
  'bio-rewrite',
  'branding',
  '✍️',
  '{"en":"Rewrite My Bio","zh-TW":"改寫我的個人簡介","zh-CN":"改写我的个人简介","ja":"プロフィールを書き直す","ko":"소개 글 다시 쓰기","fr":"Réécrire ma bio","it":"Riscrivi la mia bio","es":"Reescribir mi biografía","vi":"Viết lại tiểu sử"}'::jsonb,
  '{"en":"Polish your bio for a specific tone, length, and context.","zh-TW":"針對語氣、字數與情境優化個人簡介。","zh-CN":"针对语气、字数与情境优化个人简介。","ja":"トーン・文字数・文脈に合わせて磨き上げ。","ko":"톤, 길이, 맥락에 맞춰 프로필을 다듬기.","fr":"Polissez votre bio pour un ton et contexte donnés.","it":"Perfeziona la bio per tono, lunghezza e contesto.","es":"Pule tu biografía para un tono y contexto dados.","vi":"Chỉnh bio theo giọng điệu và ngữ cảnh."}'::jsonb,
  jsonb_build_object('en',
'Rewrite the bio I will paste below. Constraints:
- Tone: [TARGET_TONE]
- Length: [TARGET_LENGTH]
- Context where it will appear: [CONTEXT]

Deliver 3 distinct versions, each with a different angle (e.g., accomplishment-led, story-led, values-led). For each version include:
- The rewritten bio (respecting the length exactly).
- A one-line explanation of the angle.
- A suggested accompanying LinkedIn headline.

Then pick the version you think is strongest for the context and explain why in one paragraph.'),
  ARRAY['TARGET_TONE', 'TARGET_LENGTH', 'CONTEXT'], ARRAY[]::text[], ARRAY['bio'], 70
),
-- -----------------------------------------------------------------------------
(
  'hidden-strengths',
  'discovery',
  '🕵️',
  '{"en":"Unearth My Hidden Strengths","zh-TW":"挖掘我被低估的優勢","zh-CN":"挖掘被低估的优势","ja":"埋もれた強みを発掘","ko":"숨은 강점 발굴","fr":"Découvrir mes forces cachées","it":"Scopri i miei punti di forza nascosti","es":"Descubre tus fortalezas ocultas","vi":"Khám phá thế mạnh bị ẩn"}'::jsonb,
  '{"en":"Find the strengths in your work history you consistently undervalue.","zh-TW":"找出你自己總是低估的工作經歷亮點。","zh-CN":"找出你自己总是低估的工作经历亮点。","ja":"自分では過小評価してきた強みを見つけます。","ko":"스스로 과소평가해온 강점을 찾아냅니다.","fr":"Identifiez les forces de votre parcours que vous sous-estimez.","it":"Identifica i punti di forza che sottovaluti.","es":"Identifica las fortalezas que subestimas de tu historial.","vi":"Tìm điểm mạnh bạn luôn đánh giá thấp."}'::jsonb,
  jsonb_build_object('en',
'Act as a career strengths-finder coach who specializes in spotting undervalued talent.

Based on the resume and portfolio material I will share, look for patterns I''m probably not celebrating:
1. Cross-functional moves that show adaptability I''m treating as "job hopping".
2. Lateral outputs (docs written, systems designed, mentorship, hiring) that I''m burying under title changes.
3. Implicit leadership (influence without authority, stakeholder navigation, conflict defusal).
4. Unusual combinations — skills that, combined, are rarer than either skill alone.

Deliver:
- The top 3 hidden strengths, each paired with the specific evidence from my material.
- Three positioning statements I could use on LinkedIn or in interviews that make these strengths legible.
- One blind spot: something I seem proud of that the market probably doesn''t value as highly as I think.'),
  ARRAY[]::text[], ARRAY[]::text[], ARRAY['resume','portfolio'], 80
)
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  title_i18n = EXCLUDED.title_i18n,
  description_i18n = EXCLUDED.description_i18n,
  prompt_i18n = EXCLUDED.prompt_i18n,
  required_variables = EXCLUDED.required_variables,
  optional_variables = EXCLUDED.optional_variables,
  attachment_categories = EXCLUDED.attachment_categories,
  sort_order = EXCLUDED.sort_order;
