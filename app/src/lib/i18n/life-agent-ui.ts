import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { LifeAgentActionType } from "@/lib/life-agent/action-types";
import type { OpenLoopCategory } from "@/lib/life-agent/workflow-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentAccessLevel } from "@/types/life-agent";

export type LifeAgentWorkflowId =
  | "lifeBrief"
  | "planMyDay"
  | "whatAmIMissing"
  | "clearOpenLoops"
  | "weeklyReview"
  | "openLoopRadar"
  | "talkThroughThis"
  | "prepareMeeting"
  | "draftFollowUp"
  | "reflectDirection";

export type LifeAgentEnergyLevelId =
  | "low"
  | "normal"
  | "high_focus"
  | "scattered"
  | "emotionally_tired";

export type LifeAgentDispositionId =
  | "do_now"
  | "schedule"
  | "delegate"
  | "clarify"
  | "waiting"
  | "drop";

export type LifeAgentUploadIntentId =
  | "extract_tasks"
  | "save_as_note"
  | "update_relationship"
  | "create_asset"
  | "summarize"
  | "draft_message"
  | "create_project"
  | "create_document_record"
  | "analyze_image_memory";

export type LifeAgentUploadDetectedTypeId =
  | "receipt"
  | "business_card"
  | "relationship_photo"
  | "asset_photo"
  | "document"
  | "screenshot"
  | "text"
  | "unknown";

export type LifeAgentUiCopy = {
  pageTitle: string;
  pageDescription: string;
  heroWelcome: string;
  heroWelcomeNamed: (name: string) => string;
  heroBody: string;
  heroPhaseNote: string;
  disclaimerShort: string;
  characterSectionTitle: string;
  characterSectionSubtitle: string;
  selectedCharacterLabel: string;
  modeSectionTitle: string;
  modes: Record<
    LifeAgentMode,
    { label: string; description: string }
  >;
  toneTraitLabels: {
    warmth: string;
    directness: string;
    creativity: string;
    strategicDepth: string;
    executionEnergy: string;
    emotionalGentleness: string;
  };
  conversationTitle: string;
  conversationSubtitle: string;
  conversationEmptyTitle: string;
  conversationEmptyBody: string;
  conversationPhaseBadge: string;
  commandBarPlaceholder: string;
  commandBarSend: string;
  commandBarAttach: string;
  commandBarAttachSoon: string;
  commandBarAiSoon: string;
  commandBarPrefillHint: string;
  permissionPanelTitle: string;
  permissionPanelSubtitle: string;
  permissionPanelPhaseNote: string;
  permissionDomainLabel: string;
  permissionLevelReadOnly: string;
  permissionComingSoon: string;
  permissionOpenSettingsSoon: string;
  workflowsTitle: string;
  workflowsSubtitle: string;
  workflows: Record<LifeAgentWorkflowId, { title: string; description: string; prefill: string }>;
  mobilePermissionsButton: string;
  sheetPermissionsTitle: string;
  sheetClose: string;
  accessLevelLabels: Record<LifeAgentAccessLevel, string>;
  toastProfileSaved: string;
  toastProfileSaveFailed: string;
  toastPermissionSaved: string;
  toastPermissionSaveFailed: string;
  toastMessageSaved: string;
  toastMessageSaveFailed: string;
  toastMemorySaved: string;
  toastMemorySaveFailed: string;
  toastMemoryDeleted: string;
  toastMemoryDeleteFailed: string;
  commandBarSaveMessage: string;
  commandBarSaveHint: string;
  messageListYou: string;
  messageListSavedNote: string;
  permissionsLoading: string;
  profileLoading: string;
  chatSending: string;
  chatThinking: string;
  chatError: string;
  chatErrorRetry: string;
  toastChatFailed: string;
  memoryUsedTitle: string;
  memoryUsedMore: (count: number) => string;
  suggestedActionsTitle: string;
  suggestedActionsPhaseBadge: string;
  suggestedActionsDisabledHint: string;
  suggestedActionTypes: Record<string, string>;
  actionReviewTitle: string;
  actionReviewSubtitle: string;
  actionReviewDisclaimer: string;
  actionCreateAll: string;
  actionEditFirst: string;
  actionCancelAll: string;
  actionConfirm: string;
  actionCancel: string;
  actionConfirming: string;
  actionCancelling: string;
  actionExecuted: string;
  actionCancelled: string;
  toastActionConfirmed: string;
  toastActionConfirmFailed: string;
  toastActionCancelled: string;
  toastActionCancelFailed: string;
  messagesLoading: string;
  loadOlderMessages: string;
  actionTypeLabels: Record<LifeAgentActionType, string>;
  actionDomainLabels: Record<LifeAgentPermissionDomain, string>;
  actionRiskLabels: Record<"low" | "medium" | "high", string>;
  orchestrationTitle: string;
  orchestrationSubtitle: string;
  workflowRun: string;
  workflowLoading: string;
  workflowError: string;
  lifeBriefTitle: string;
  openLoopRadarTitle: string;
  planMyDayTitle: string;
  weeklyReviewTitle: string;
  clearOpenLoopsTitle: string;
  clearOpenLoopsSubtitle: string;
  whatAmIMissingDescription: string;
  energyPrompt: string;
  energyLabels: Record<LifeAgentEnergyLevelId, string>;
  dispositionLabels: Record<LifeAgentDispositionId, string>;
  loopGroupLine: (count: number, label: string) => string;
  createPreviewsFromLoops: string;
  noOpenLoops: string;
  morningLabel: string;
  afternoonLabel: string;
  eveningLabel: string;
  minimumViableDayLabel: string;
  optionalStretchLabel: string;
  weeklyWinsLabel: string;
  weeklyPatternsLabel: string;
  weeklyFocusLabel: string;
  peopleFollowUpLabel: string;
  projectBottlenecksLabel: string;
  focusSuggestionsLabel: string;
  flagshipWorkflows: Record<
    "lifeBrief" | "whatAmIMissing" | "openLoopRadar" | "planMyDay" | "clearOpenLoops" | "weeklyReview",
    { title: string; description: string }
  >;
  openLoopCategoryLabels: Record<OpenLoopCategory, string>;
  uploadDropzoneTitle: string;
  uploadDropzoneHint: string;
  uploadChooseFile: string;
  uploadAnalyzing: string;
  uploadAnalyzeFailed: string;
  uploadIntentPrompt: string;
  uploadIntentLabels: Record<LifeAgentUploadIntentId, string>;
  uploadIntentDescriptions: Record<LifeAgentUploadIntentId, string>;
  uploadDetectedTypeLabels: Record<LifeAgentUploadDetectedTypeId, string>;
  uploadConfidenceLabel: (percent: number) => string;
  uploadDismiss: string;
  uploadExtractedTasks: string;
  uploadReviewDisclaimer: string;
  uploadCreatePreviews: string;
  uploadCreatingPreviews: string;
  intelligenceTitle: string;
  intelligenceSubtitle: string;
  intelligenceDisclaimer: string;
  intelligenceEmpty: string;
  intelligenceFeatures: Record<
    | "lifeCoherence"
    | "innerConflicts"
    | "lifeChapterMap"
    | "memoryTimeline"
    | "futureSelf",
    { title: string; description: string }
  >;
  coherenceAlignedLabel: string;
  coherenceFrictionLabel: string;
  coherenceAdjustmentsLabel: string;
  gentleAccountabilityTitle: string;
  gentleAccountabilityMentions: (count: number) => string;
  emotionalPatternsLabel: string;
  lifeChapterMapTitle: string;
  chapterProjectsLabel: string;
  chapterPeopleLabel: string;
  chapterLoopsLabel: string;
  chapterNextActionLabel: string;
  futureSelfDisclaimer: string;
  futureSelfThemesLabel: string;
  futureSelfQuestionsLabel: string;
  timelineSourceLabel: (sourceType: string) => string;
  characterCustomizeTitle: string;
  characterCustomizeSubtitle: string;
  characterCustomNameLabel: string;
  characterCustomNamePlaceholder: string;
  characterVisualStyleLabel: string;
  visualStyleOptions: Record<"soft" | "minimal" | "vivid", string>;
  characterSaveTraits: string;
  characterSavingTraits: string;
  checkInTitle: string;
  checkInSubtitle: string;
  checkInSafetyNote: string;
  arrivalLabels: Record<
    | "focused"
    | "tired"
    | "anxious"
    | "creative"
    | "scattered"
    | "quiet"
    | "heavy"
    | "motivated",
    string
  >;
  continuityTitle: string;
  continuityContinue: string;
  continuityDismiss: string;
  celebrationTitle: string;
  calmNextStepTitle: string;
  calmNextStepBody: string;
  calmNextStepAction: string;
  avatarStateListening: (name: string) => string;
  avatarStateThinking: (name: string) => string;
  avatarStatePlanning: (name: string) => string;
  avatarStateReflecting: (name: string) => string;
  avatarStateProtecting: (name: string) => string;
  avatarStateCelebrating: (name: string) => string;
  avatarStateFocused: (name: string) => string;
  avatarStateConcerned: (name: string) => string;
  avatarStateSagePatterns: (name: string) => string;
  avatarStateNovaAction: (name: string) => string;
  avatarStateGuardianBoundaries: (name: string) => string;
  avatarStateAtlasOrganizing: (name: string) => string;
};

const en: LifeAgentUiCopy = {
  pageTitle: "Life Companion",
  pageDescription:
    "Your warm AI orchestrator for everything in your Life OS.",
  heroWelcome: "Welcome back.",
  heroWelcomeNamed: (name) => `Welcome back, ${name}.`,
  heroBody:
    "I can help you think, remember, plan, and act across your Life OS. Choose how you want me to be with you today.",
  heroPhaseNote:
    "Chat uses only the Life OS areas you allow. Suggested actions are previews until you confirm them.",
  disclaimerShort: "AI companion · not professional advice",
  characterSectionTitle: "Choose your companion",
  characterSectionSubtitle:
    "Each character changes tone and pacing — not safety rules. Your choice is saved to your account.",
  selectedCharacterLabel: "Active companion",
  modeSectionTitle: "How should I show up?",
  modes: {
    companion: {
      label: "Companion",
      description: "Emotional clarity and reflection",
    },
    orchestrator: {
      label: "Orchestrator",
      description: "Life planning and coordination",
    },
    operator: {
      label: "Operator",
      description: "Action drafting and task breakdown",
    },
    mirror: {
      label: "Mirror",
      description: "Pattern recognition and self-understanding",
    },
  },
  toneTraitLabels: {
    warmth: "Warmth",
    directness: "Directness",
    creativity: "Creativity",
    strategicDepth: "Strategy",
    executionEnergy: "Execution",
    emotionalGentleness: "Gentleness",
  },
  conversationTitle: "Conversation",
  conversationSubtitle: "Your companion replies using permission-scoped context from your Life OS.",
  conversationEmptyTitle: "Your space is ready",
  conversationEmptyBody:
    "Say hello — your companion will respond with warmth and context from the Life OS areas you allow.",
  conversationPhaseBadge: "Live chat",
  commandBarPlaceholder: "Share what's on your mind, or pick a workflow below…",
  commandBarSend: "Send",
  commandBarAttach: "Upload file",
  commandBarAttachSoon: "Upload a screenshot, PDF, receipt, or note",
  commandBarAiSoon: "Powered by your Life OS context",
  commandBarSaveMessage: "Send message",
  commandBarSaveHint: "Enter to send · Shift+Enter for a new line",
  commandBarPrefillHint: "Prefilled from workflow — edit freely",
  permissionPanelTitle: "Permissions & memory",
  permissionPanelSubtitle:
    "Control which Life OS areas your companion can access. Changes save immediately.",
  permissionPanelPhaseNote:
    "Permissions apply to every chat turn. Domains set to “Ask every time” stay hidden until you grant access.",
  permissionDomainLabel: "Life OS domains",
  permissionLevelReadOnly: "Read only",
  permissionComingSoon: "Loading…",
  permissionOpenSettingsSoon: "Memory library — coming soon",
  accessLevelLabels: {
    off: "Off",
    ask_every_time: "Ask every time",
    read_only: "Read only",
    suggest_actions: "Suggest actions",
    act_with_confirmation: "Act with confirmation",
  },
  toastProfileSaved: "Companion preferences saved",
  toastProfileSaveFailed: "Could not save companion preferences",
  toastPermissionSaved: "Permission updated",
  toastPermissionSaveFailed: "Could not update permission",
  toastMessageSaved: "Message saved",
  toastMessageSaveFailed: "Could not save message",
  toastMemorySaved: "Memory saved",
  toastMemorySaveFailed: "Could not save memory",
  toastMemoryDeleted: "Memory deleted",
  toastMemoryDeleteFailed: "Could not delete memory",
  messageListYou: "You",
  messageListSavedNote: "End-to-end encrypted in spirit — your data stays in your Life OS account.",
  permissionsLoading: "Loading permissions…",
  profileLoading: "Loading companion…",
  chatSending: "Sending…",
  chatThinking: "Thinking…",
  chatError: "Something went wrong. Your message was saved — try again.",
  chatErrorRetry: "Try again",
  toastChatFailed: "Could not get a reply from your companion",
  memoryUsedTitle: "I used",
  memoryUsedMore: (count) => `+${count} more`,
  suggestedActionsTitle: "Suggested actions",
  suggestedActionsPhaseBadge: "Review required",
  suggestedActionsDisabledHint: "Nothing runs until you confirm.",
  suggestedActionTypes: {},
  actionReviewTitle: "I can help with these actions",
  actionReviewSubtitle: "Review what will change. Nothing runs until you confirm.",
  actionReviewDisclaimer:
    "Draft messages are saved as notes — not sent. Destructive actions are not available in this phase.",
  actionCreateAll: "Create all",
  actionEditFirst: "Edit first",
  actionCancelAll: "Cancel all",
  actionConfirm: "Confirm",
  actionCancel: "Cancel",
  actionConfirming: "Confirming…",
  actionCancelling: "Cancelling…",
  actionExecuted: "Done",
  actionCancelled: "Cancelled",
  toastActionConfirmed: "Action completed",
  toastActionConfirmFailed: "Could not complete action",
  toastActionCancelled: "Action cancelled",
  toastActionCancelFailed: "Could not cancel action",
  messagesLoading: "Loading messages…",
  loadOlderMessages: "Load older messages",
  actionTypeLabels: {
    create_task: "Create task",
    create_note: "Create note",
    create_project: "Create project",
    update_relationship_next_action: "Update relationship",
    save_journal_entry: "Journal entry",
    create_life_agent_memory: "Save memory",
    draft_message: "Draft message (not sent)",
  },
  actionDomainLabels: {
    about_me: "About Me",
    projects: "Projects",
    tasks: "Tasks",
    goals: "Goals",
    habits: "Habits",
    relationships: "Relationships",
    role_models: "Role models",
    assets: "Assets",
    documents: "Documents",
    notes: "Notes",
    journal: "Journal",
    bucket_list: "Bucket list",
    knowledge: "Knowledge",
    finance: "Finance",
    health: "Health",
    brain_graph: "Brain",
  },
  actionRiskLabels: {
    low: "Low risk",
    medium: "Medium risk",
    high: "High risk",
  },
  orchestrationTitle: "Orchestration",
  orchestrationSubtitle: "Real snapshots from your Life OS — nothing runs until you confirm.",
  workflowRun: "Run",
  workflowLoading: "Reading your Life OS…",
  workflowError: "Could not load this workflow. Check permissions and try again.",
  lifeBriefTitle: "Life Brief",
  openLoopRadarTitle: "Open Loop Radar",
  planMyDayTitle: "Plan My Day",
  weeklyReviewTitle: "Weekly Review",
  clearOpenLoopsTitle: "Clear Open Loops",
  clearOpenLoopsSubtitle: "Sort each loop — previews only, no auto-execution.",
  whatAmIMissingDescription: "A gentle scan for quiet loops you might not be seeing.",
  energyPrompt: "How is your energy today?",
  energyLabels: {
    low: "Low energy",
    normal: "Normal",
    high_focus: "High focus",
    scattered: "Scattered",
    emotionally_tired: "Emotionally tired",
  },
  dispositionLabels: {
    do_now: "Do now",
    schedule: "Schedule",
    delegate: "Delegate",
    clarify: "Clarify",
    waiting: "Waiting",
    drop: "Drop",
  },
  loopGroupLine: (count, label) => `${count} ${label.toLowerCase()} loop${count === 1 ? "" : "s"}`,
  createPreviewsFromLoops: "Create action previews",
  noOpenLoops: "No open loops found in your permitted data.",
  morningLabel: "Morning",
  afternoonLabel: "Afternoon",
  eveningLabel: "Evening",
  minimumViableDayLabel: "Minimum viable day",
  optionalStretchLabel: "Optional stretch",
  weeklyWinsLabel: "Wins",
  weeklyPatternsLabel: "Patterns",
  weeklyFocusLabel: "Focus for next week",
  peopleFollowUpLabel: "People to follow up",
  projectBottlenecksLabel: "Project bottlenecks",
  focusSuggestionsLabel: "May deserve attention",
  flagshipWorkflows: {
    lifeBrief: { title: "Life Brief", description: "Warm snapshot of your day" },
    whatAmIMissing: { title: "What Am I Missing?", description: "Quiet loops, not emergencies" },
    openLoopRadar: { title: "Open Loop Radar", description: "Grouped unfinished threads" },
    planMyDay: { title: "Plan My Day", description: "Realistic daily plan" },
    clearOpenLoops: { title: "Clear Open Loops", description: "Sort → action previews" },
    weeklyReview: { title: "Weekly Review", description: "Week at a glance" },
  },
  openLoopCategoryLabels: {
    urgent: "Urgent",
    important: "Important",
    waiting: "Waiting",
    unclear: "Unclear",
    emotional: "Emotional",
    admin: "Admin",
    relationship: "Relationship",
    creative: "Creative",
    finance: "Finance",
    document: "Document",
  },
  uploadDropzoneTitle: "Drop anything here",
  uploadDropzoneHint: "Screenshots, PDFs, receipts, business cards, notes — reviewed before saving.",
  uploadChooseFile: "Choose file",
  uploadAnalyzing: "Analyzing upload…",
  uploadAnalyzeFailed: "Could not analyze this file. Try a smaller image or PDF.",
  uploadIntentPrompt: "What should I do with this?",
  uploadIntentLabels: {
    extract_tasks: "Extract tasks",
    save_as_note: "Save as note",
    update_relationship: "Update relationship",
    create_asset: "Create asset",
    summarize: "Summarize",
    draft_message: "Draft message",
    create_project: "Create project",
    create_document_record: "Document record",
    analyze_image_memory: "Image memory",
  },
  uploadIntentDescriptions: {
    extract_tasks: "Turn visible to-dos into task previews",
    save_as_note: "Store content as a note preview",
    update_relationship: "Follow-up context (you confirm)",
    create_asset: "Capture purchase or item details",
    summarize: "Short summary note only",
    draft_message: "Draft saved as note — not sent",
    create_project: "Start a project from this content",
    create_document_record: "Document metadata as note preview",
    analyze_image_memory: "Save a memory after you confirm",
  },
  uploadDetectedTypeLabels: {
    receipt: "Receipt",
    business_card: "Business card",
    relationship_photo: "Relationship photo",
    asset_photo: "Product / asset photo",
    document: "Document",
    screenshot: "Screenshot",
    text: "Text",
    unknown: "Unknown",
  },
  uploadConfidenceLabel: (percent) => `${percent}% confidence`,
  uploadDismiss: "Dismiss",
  uploadExtractedTasks: "Possible tasks",
  uploadReviewDisclaimer: "Nothing is saved until you review and confirm action previews below.",
  uploadCreatePreviews: "Create action previews",
  uploadCreatingPreviews: "Creating previews…",
  intelligenceTitle: "Personal intelligence",
  intelligenceSubtitle:
    "Pattern snapshots from your permitted Life OS data — gentle hypotheses, not facts or diagnoses.",
  intelligenceDisclaimer:
    "These are possible interpretations based on what you have stored. You may disagree with any of them.",
  intelligenceEmpty: "Not enough permitted data to show this view yet.",
  intelligenceFeatures: {
    lifeCoherence: {
      title: "Life Coherence",
      description: "Are goals, tasks, and values aligned?",
    },
    innerConflicts: {
      title: "Inner tensions",
      description: "Possible patterns, gently framed",
    },
    lifeChapterMap: {
      title: "Life chapter map",
      description: "Visual map of active chapters",
    },
    memoryTimeline: {
      title: "Memory timeline",
      description: "Themes from stored records only",
    },
    futureSelf: {
      title: "Future self",
      description: "Reflective projection, not prediction",
    },
  },
  coherenceAlignedLabel: "Aligned areas",
  coherenceFrictionLabel: "Possible friction",
  coherenceAdjustmentsLabel: "Gentle adjustments",
  gentleAccountabilityTitle: "Gentle accountability",
  gentleAccountabilityMentions: (count) =>
    `Mentioned ${count} time${count === 1 ? "" : "s"} in your Life OS`,
  emotionalPatternsLabel: "Emotional patterns (from journal & notes)",
  lifeChapterMapTitle: "Life chapter map",
  chapterProjectsLabel: "Active projects",
  chapterPeopleLabel: "People",
  chapterLoopsLabel: "Open loops",
  chapterNextActionLabel: "Next action",
  futureSelfDisclaimer: "A thought experiment — not supernatural advice.",
  futureSelfThemesLabel: "Themes in your Life OS",
  futureSelfQuestionsLabel: "Questions for your future self",
  timelineSourceLabel: (sourceType) => sourceType.replace(/_/g, " "),
  characterCustomizeTitle: "Personalize your companion",
  characterCustomizeSubtitle:
    "Tune tone traits and name. I am an AI assistant — here to help you think, not to replace human connection.",
  characterCustomNameLabel: "Custom name",
  characterCustomNamePlaceholder: "Optional display name",
  characterVisualStyleLabel: "Visual style",
  visualStyleOptions: { soft: "Soft", minimal: "Minimal", vivid: "Vivid" },
  characterSaveTraits: "Save personality",
  characterSavingTraits: "Saving…",
  checkInTitle: "How are you arriving today?",
  checkInSubtitle: "This helps me adjust pacing and the interface — you stay in charge.",
  checkInSafetyNote:
    "I am here to help you think through this. You are the one choosing; I can help make the options clearer.",
  arrivalLabels: {
    focused: "Focused",
    tired: "Tired",
    anxious: "Anxious",
    creative: "Creative",
    scattered: "Scattered",
    quiet: "Quiet",
    heavy: "Heavy",
    motivated: "Motivated",
  },
  continuityTitle: "Picking up the thread",
  continuityContinue: "Continue",
  continuityDismiss: "Not now",
  celebrationTitle: "Nice work",
  calmNextStepTitle: "One gentle next step",
  calmNextStepBody: "We can keep things simple today — one conversation, one small move.",
  calmNextStepAction: "Open a calm chat",
  avatarStateListening: (name) => `${name} is listening…`,
  avatarStateThinking: (name) => `${name} is thinking…`,
  avatarStatePlanning: (name) => `${name} is planning…`,
  avatarStateReflecting: (name) => `${name} is reflecting…`,
  avatarStateProtecting: (name) => `${name} is holding space…`,
  avatarStateCelebrating: (name) => `${name} notices your progress…`,
  avatarStateFocused: (name) => `${name} is focused with you…`,
  avatarStateConcerned: (name) => `${name} is here, gently attentive…`,
  avatarStateSagePatterns: (name) => `${name} is connecting patterns…`,
  avatarStateNovaAction: (name) => `${name} is turning this into action…`,
  avatarStateGuardianBoundaries: (name) => `${name} is checking boundaries…`,
  avatarStateAtlasOrganizing: (name) => `${name} is organizing the open loops…`,
  workflowsTitle: "Suggested workflows",
  workflowsSubtitle: "Tap to prefill your message — no actions run automatically.",
  workflows: {
    lifeBrief: {
      title: "Life Brief",
      description: "Warm snapshot of your day",
      prefill: "Give me a gentle life brief for today based on my Life OS.",
    },
    openLoopRadar: {
      title: "Open Loop Radar",
      description: "Grouped unfinished threads",
      prefill: "Scan my open loops and group what may need attention — no alarm, just clarity.",
    },
    weeklyReview: {
      title: "Weekly Review",
      description: "Week at a glance",
      prefill: "Help me review this week — wins, patterns, and a kind focus for next week.",
    },
    planMyDay: {
      title: "Plan My Day",
      description: "Shape a calm, realistic day",
      prefill:
        "Help me plan my day across tasks, calendar, and energy — what's a kind, realistic shape for today?",
    },
    whatAmIMissing: {
      title: "What Am I Missing?",
      description: "Surface blind spots gently",
      prefill:
        "Looking at my Life OS, what might I be overlooking this week — without making me feel behind?",
    },
    clearOpenLoops: {
      title: "Clear My Open Loops",
      description: "Name what's still hanging",
      prefill:
        "Help me list open loops across tasks and projects, and suggest a gentle order to address them.",
    },
    talkThroughThis: {
      title: "Talk Through This",
      description: "Process something on your mind",
      prefill:
        "I need to talk something through. I'll share context — please listen first, then help me clarify.",
    },
    prepareMeeting: {
      title: "Prepare for a Meeting",
      description: "Intent, questions, boundaries",
      prefill:
        "I'm preparing for a meeting. Help me clarify my intent, key questions, and what I want to walk away with.",
    },
    draftFollowUp: {
      title: "Draft a Follow-Up",
      description: "Outline a message — you send it",
      prefill:
        "Help me draft a follow-up message. I'll paste context — please outline options; I will send it myself.",
    },
    reflectDirection: {
      title: "Reflect on My Direction",
      description: "Goals, values, alignment",
      prefill:
        "I want to reflect on direction — how do my current goals and projects align with what matters to me?",
    },
  },
  mobilePermissionsButton: "Permissions",
  sheetPermissionsTitle: "Permissions & memory",
  sheetClose: "Close",
};

const zhTW: DeepPartial<LifeAgentUiCopy> = {
  pageTitle: "人生夥伴",
  pageDescription: "溫暖的 AI  orchestrator，串連你整個 Life OS。",
  heroWelcome: "歡迎回來。",
  heroWelcomeNamed: (name) => `歡迎回來，${name}。`,
  heroBody:
    "我可以陪你思考、記住、規劃與行動，串連你的 Life OS。選擇今天希望我如何陪伴你。",
  heroPhaseNote: "對話僅使用你允許的 Life OS 領域。建議動作為預覽，需你確認後才會執行。",
  disclaimerShort: "AI 夥伴 · 非專業建議",
  characterSectionTitle: "選擇你的夥伴",
  characterSectionSubtitle:
    "每位角色改變語氣與節奏，不會改變安全規則。選擇會暫存在此裝置，帳號同步將於之後提供。",
  selectedCharacterLabel: "目前夥伴",
  modeSectionTitle: "希望我如何陪伴？",
  modes: {
    companion: { label: "夥伴", description: "情緒釐清與反思" },
    orchestrator: { label: "編排者", description: "生活規劃與協調" },
    operator: { label: "執行者", description: "行動草擬與任務拆解" },
    mirror: { label: "鏡像", description: "模式辨識與自我理解" },
  },
  toneTraitLabels: {
    warmth: "溫暖",
    directness: "直接",
    creativity: "創意",
    strategicDepth: "策略",
    executionEnergy: "執行",
    emotionalGentleness: "柔和",
  },
  conversationTitle: "對話",
  conversationSubtitle: "夥伴會依你允許的 Life OS 範圍回覆。",
  conversationEmptyTitle: "你的空間已就緒",
  conversationEmptyBody: "打個招呼 — 夥伴會在你允許的範圍內溫暖地回應。",
  conversationPhaseBadge: "即時對話",
  commandBarPlaceholder: "說說你的想法，或從下方工作流程開始…",
  commandBarSend: "傳送",
  commandBarAttachSoon: "上傳截圖、PDF、收據或筆記",
  commandBarAiSoon: "AI 回覆",
  commandBarPrefillHint: "已從工作流程填入 — 可自由編輯",
  permissionPanelTitle: "權限與記憶",
  permissionPanelSubtitle: "你可控制夥伴能看見哪些 Life OS 區域。預設會較保守。",
  permissionPanelPhaseNote: "領域開關與記憶編輯將隨資料庫持久化（第二～三階段）推出。",
  permissionDomainLabel: "Life OS 領域",
  permissionLevelReadOnly: "唯讀（規劃中的預設）",
  permissionComingSoon: "即將推出",
  permissionOpenSettingsSoon: "完整設定 — 第二階段",
  orchestrationTitle: "編排",
  orchestrationSubtitle: "來自你 Life OS 的真實快照 — 確認前不會執行任何動作。",
  workflowRun: "執行",
  workflowLoading: "正在讀取你的 Life OS…",
  workflowError: "無法載入此工作流程。請檢查權限後再試。",
  lifeBriefTitle: "人生簡報",
  openLoopRadarTitle: "未完成雷達",
  planMyDayTitle: "規劃我的一天",
  weeklyReviewTitle: "每週回顧",
  clearOpenLoopsTitle: "理清未完成",
  clearOpenLoopsSubtitle: "為每個 loop 分類 — 僅產生預覽，不會自動執行。",
  whatAmIMissingDescription: "溫和掃描你可能沒注意到的安靜 loops。",
  energyPrompt: "今天的精力如何？",
  energyLabels: {
    low: "低精力",
    normal: "一般",
    high_focus: "高度專注",
    scattered: "分心",
    emotionally_tired: "情緒疲憊",
  },
  dispositionLabels: {
    do_now: "現在就做",
    schedule: "排程",
    delegate: "委派",
    clarify: "釐清",
    waiting: "等待",
    drop: "放下",
  },
  loopGroupLine: (count, label) => `${count} 個${label} loop`,
  createPreviewsFromLoops: "建立動作預覽",
  noOpenLoops: "在允許的資料中未找到 open loops。",
  morningLabel: "上午",
  afternoonLabel: "下午",
  eveningLabel: "晚上",
  minimumViableDayLabel: "最低可行的一天",
  optionalStretchLabel: "可選的加碼",
  weeklyWinsLabel: "本週亮點",
  weeklyPatternsLabel: "模式",
  weeklyFocusLabel: "下週焦點",
  peopleFollowUpLabel: "值得跟進的人",
  projectBottlenecksLabel: "專案瓶頸",
  focusSuggestionsLabel: "可能值得關注",
  flagshipWorkflows: {
    lifeBrief: { title: "人生簡報", description: "溫暖的一天快照" },
    whatAmIMissing: { title: "我漏了什麼？", description: "安靜的 loops，不是緊急事" },
    openLoopRadar: { title: "未完成雷達", description: "分組的懸而未決" },
    planMyDay: { title: "規劃我的一天", description: "可行的每日計畫" },
    clearOpenLoops: { title: "理清未完成", description: "分類 → 動作預覽" },
    weeklyReview: { title: "每週回顧", description: "一週概覽" },
  },
  openLoopCategoryLabels: {
    urgent: "緊急",
    important: "重要",
    waiting: "等待",
    unclear: "不明",
    emotional: "情緒",
    admin: "行政",
    relationship: "關係",
    creative: "創意",
    finance: "財務",
    document: "文件",
  },
  commandBarAttach: "上傳檔案",
  uploadDropzoneTitle: "把任何東西拖放到這裡",
  uploadDropzoneHint: "截圖、PDF、收據、名片、筆記 — 儲存前會先讓你檢視。",
  uploadChooseFile: "選擇檔案",
  uploadAnalyzing: "正在分析上傳…",
  uploadAnalyzeFailed: "無法分析此檔案。請試較小的圖片或 PDF。",
  uploadIntentPrompt: "你想怎麼處理這個檔案？",
  uploadIntentLabels: {
    extract_tasks: "擷取任務",
    save_as_note: "存成筆記",
    update_relationship: "更新關係",
    create_asset: "建立資產",
    summarize: "摘要",
    draft_message: "草擬訊息",
    create_project: "建立專案",
    create_document_record: "文件紀錄",
    analyze_image_memory: "圖片記憶",
  },
  uploadIntentDescriptions: {
    extract_tasks: "將可見待辦轉為任務預覽",
    save_as_note: "內容存成筆記預覽",
    update_relationship: "跟進脈絡（需你確認）",
    create_asset: "記錄購買或物品細節",
    summarize: "僅產生摘要筆記",
    draft_message: "草稿存成筆記 — 不會寄出",
    create_project: "從內容建立專案",
    create_document_record: "文件中繼資料存成筆記預覽",
    analyze_image_memory: "確認後才儲存記憶",
  },
  uploadDetectedTypeLabels: {
    receipt: "收據",
    business_card: "名片",
    relationship_photo: "關係照片",
    asset_photo: "產品／資產照片",
    document: "文件",
    screenshot: "截圖",
    text: "文字",
    unknown: "未知",
  },
  uploadConfidenceLabel: (percent) => `信心 ${percent}%`,
  uploadDismiss: "關閉",
  uploadExtractedTasks: "可能的任務",
  uploadReviewDisclaimer: "在你檢視並確認下方的動作預覽前，不會儲存任何資料。",
  uploadCreatePreviews: "建立動作預覽",
  uploadCreatingPreviews: "正在建立預覽…",
  intelligenceTitle: "個人智慧",
  intelligenceSubtitle: "來自你允許的 Life OS 資料的模式快照 — 溫和的假設，不是事實或診斷。",
  intelligenceDisclaimer: "這些是根據你已儲存內容的可能詮釋。你可以不同意其中任何一項。",
  intelligenceEmpty: "允許的資料尚不足以顯示此檢視。",
  intelligenceFeatures: {
    lifeCoherence: { title: "人生一致性", description: "目標、任務與價值是否對齊？" },
    innerConflicts: { title: "內在張力", description: "可能模式，溫和表述" },
    lifeChapterMap: { title: "人生章節地圖", description: "活躍章節的視覺地圖" },
    memoryTimeline: { title: "記憶時間軸", description: "僅來自已儲存紀錄" },
    futureSelf: { title: "未來的自己", description: "反思性投射，非預言" },
  },
  coherenceAlignedLabel: "對齊的領域",
  coherenceFrictionLabel: "可能的摩擦",
  coherenceAdjustmentsLabel: "溫和的調整",
  gentleAccountabilityTitle: "溫和的問責",
  gentleAccountabilityMentions: (count) => `在你的 Life OS 中被提及 ${count} 次`,
  emotionalPatternsLabel: "情緒模式（來自日記與筆記）",
  lifeChapterMapTitle: "人生章節地圖",
  chapterProjectsLabel: "活躍專案",
  chapterPeopleLabel: "相關的人",
  chapterLoopsLabel: "Open loops",
  chapterNextActionLabel: "下一步",
  futureSelfDisclaimer: "這是一種思想實驗 — 不是超自然建議。",
  futureSelfThemesLabel: "Life OS 中的主題",
  futureSelfQuestionsLabel: "問問未來的自己",
  timelineSourceLabel: (sourceType) => sourceType.replace(/_/g, " "),
  characterCustomizeTitle: "個性化你的夥伴",
  characterCustomizeSubtitle:
    "調整語氣特質與稱呼。我是 AI 助手 — 協助你思考，不能取代真實的人際連結。",
  characterCustomNameLabel: "自訂稱呼",
  characterCustomNamePlaceholder: "選填顯示名稱",
  characterVisualStyleLabel: "視覺風格",
  visualStyleOptions: { soft: "柔和", minimal: "簡約", vivid: "鮮明" },
  characterSaveTraits: "儲存個性設定",
  characterSavingTraits: "儲存中…",
  checkInTitle: "你今天是以什麼狀態到來？",
  checkInSubtitle: "這會幫我調整節奏與介面 — 選擇權在你。",
  checkInSafetyNote: "我在這裡協助你思考。由你做選擇；我可以幫你把選項說清楚。",
  arrivalLabels: {
    focused: "專注",
    tired: "疲倦",
    anxious: "焦慮",
    creative: "有創意",
    scattered: "分心",
    quiet: "安靜",
    heavy: "沉重",
    motivated: "有動力",
  },
  continuityTitle: "延續上次的脈絡",
  continuityContinue: "繼續",
  continuityDismiss: "暫時不要",
  celebrationTitle: "很好的進展",
  calmNextStepTitle: "一個溫和的下一步",
  calmNextStepBody: "今天可以簡單一點 — 一場對話，一個小行動。",
  calmNextStepAction: "開始溫和對話",
  avatarStateListening: (name) => `${name} 正在傾聽…`,
  avatarStateThinking: (name) => `${name} 正在思考…`,
  avatarStatePlanning: (name) => `${name} 正在規劃…`,
  avatarStateReflecting: (name) => `${name} 正在反思…`,
  avatarStateProtecting: (name) => `${name} 正在溫柔陪伴…`,
  avatarStateCelebrating: (name) => `${name} 看見你的進展…`,
  avatarStateFocused: (name) => `${name} 與你專注在一起…`,
  avatarStateConcerned: (name) => `${name} 溫柔地關注著…`,
  avatarStateSagePatterns: (name) => `${name} 正在連結模式…`,
  avatarStateNovaAction: (name) => `${name} 正在轉成行動…`,
  avatarStateGuardianBoundaries: (name) => `${name} 正在檢視界線…`,
  avatarStateAtlasOrganizing: (name) => `${name} 正在整理 open loops…`,
  workflowsTitle: "建議工作流程",
  workflowsSubtitle: "點擊以填入訊息 — 不會自動執行任何動作。",
  workflows: {
    planMyDay: {
      title: "規劃我的一天",
      description: "溫和、可行的一天",
      prefill: "幫我規劃今天 — 結合任務、行事曆與精力，什麼樣的節奏對我比較友善、可行？",
    },
    whatAmIMissing: {
      title: "我漏了什麼？",
      description: "溫和指出盲點",
      prefill: "從我的 Life OS 來看，這週我可能忽略了什麼？請不要讓我有落後的壓力。",
    },
    clearOpenLoops: {
      title: "理清未完成",
      description: "列出仍懸而未決的事",
      prefill: "幫我整理任務與專案中的 open loops，並建議一個溫和的處理順序。",
    },
    talkThroughThis: {
      title: "陪我聊聊",
      description: "整理心裡的事",
      prefill: "我需要把一件事說清楚。我會提供背景 — 請先傾聽，再幫我釐清。",
    },
    prepareMeeting: {
      title: "準備會議",
      description: "意圖、問題、界線",
      prefill: "我要準備一場會議。幫我釐清意圖、關鍵問題，以及我希望帶走的結果。",
    },
    draftFollowUp: {
      title: "草擬跟進",
      description: "大綱由你寄出",
      prefill: "幫我草擬跟進訊息。我會貼上背景 — 請給選項大綱；我會自己寄出。",
    },
    reflectDirection: {
      title: "反思方向",
      description: "目標、價值、對齊",
      prefill: "我想反思方向 — 目前的目標與專案，如何與我在乎的事對齊？",
    },
  },
  mobilePermissionsButton: "權限",
  sheetPermissionsTitle: "權限與記憶",
  sheetClose: "關閉",
  chatSending: "傳送中…",
  chatThinking: "思考中…",
  chatError: "發生錯誤。你的訊息已儲存 — 請再試一次。",
  chatErrorRetry: "重試",
  toastChatFailed: "無法取得夥伴回覆",
  memoryUsedTitle: "我使用了",
  memoryUsedMore: (count) => `另有 ${count} 項`,
  suggestedActionsTitle: "建議動作",
  suggestedActionsPhaseBadge: "僅預覽",
  suggestedActionsDisabledHint: "確認後才會執行。",
  actionReviewTitle: "我可以協助這些動作",
  actionReviewSubtitle: "請先檢視將會變更的內容。確認前不會執行任何操作。",
  actionReviewDisclaimer: "訊息草稿會存成筆記，不會寄出。此階段不提供刪除或對外發送。",
  actionCreateAll: "全部建立",
  actionEditFirst: "先編輯第一項",
  actionCancelAll: "全部取消",
  actionConfirm: "確認",
  actionCancel: "取消",
  actionConfirming: "確認中…",
  actionCancelling: "取消中…",
  actionExecuted: "已完成",
  actionCancelled: "已取消",
  toastActionConfirmed: "動作已完成",
  toastActionConfirmFailed: "無法完成動作",
  toastActionCancelled: "已取消動作",
  toastActionCancelFailed: "無法取消動作",
  messagesLoading: "載入訊息中…",
  loadOlderMessages: "載入更早的訊息",
  actionTypeLabels: {
    create_task: "建立任務",
    create_note: "建立筆記",
    create_project: "建立專案",
    update_relationship_next_action: "更新關係",
    save_journal_entry: "日記",
    create_life_agent_memory: "儲存記憶",
    draft_message: "草擬訊息（不會寄出）",
  },
  actionDomainLabels: {
    about_me: "關於我",
    projects: "專案",
    tasks: "任務",
    goals: "目標",
    habits: "習慣",
    relationships: "關係",
    role_models: "榜樣",
    assets: "資產",
    documents: "文件",
    notes: "筆記",
    journal: "日記",
    bucket_list: "願望清單",
    knowledge: "知識庫",
    finance: "財務",
    health: "健康",
    brain_graph: "大腦圖譜",
  },
  actionRiskLabels: {
    low: "低風險",
    medium: "中風險",
    high: "高風險",
  },
};

const zhCN: DeepPartial<LifeAgentUiCopy> = {
  pageTitle: "人生伙伴",
  pageDescription: "温暖的 AI orchestrator，串联你整个 Life OS。",
  heroWelcome: "欢迎回来。",
  heroWelcomeNamed: (name) => `欢迎回来，${name}。`,
  heroBody:
    "我可以陪你思考、记住、规划与行动，串联你的 Life OS。选择今天希望我如何陪伴你。",
  heroPhaseNote: "对话仅使用你允许的 Life OS 领域。建议动作为预览，需你确认后才会执行。",
  characterSectionTitle: "选择你的伙伴",
  modeSectionTitle: "希望我如何陪伴？",
  modes: {
    companion: { label: "伙伴", description: "情绪厘清与反思" },
    orchestrator: { label: "编排者", description: "生活规划与协调" },
    operator: { label: "执行者", description: "行动草拟与任务拆解" },
    mirror: { label: "镜像", description: "模式识别与自我理解" },
  },
  workflowsTitle: "建议工作流",
  workflowsSubtitle: "点击以填入消息 — 不会自动执行任何操作。",
};

const COPY = createLocaleCopyMap(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getLifeAgentUiCopy(locale: AppLocale): LifeAgentUiCopy {
  return (COPY[locale] ?? COPY[DEFAULT_LOCALE]) as LifeAgentUiCopy;
}

/** Character display names stay in presets; archetypes/taglines can be localized later. */
export function getLifeAgentModeLabel(
  ui: LifeAgentUiCopy,
  mode: LifeAgentMode,
): string {
  return ui.modes[mode].label;
}
