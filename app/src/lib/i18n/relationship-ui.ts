import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

/**
 * UI copy for the Relationship container (sub-tabs + empty states) and the two
 * inner views (Relationships, Role Models). English is the source of truth;
 * any locale that omits a key transparently falls back to the English value.
 *
 * Keys without per-locale overrides below are intentionally English fallbacks
 * pending a translation pass (no marker is needed at runtime — the i18n system
 * resolves them automatically via createLocaleCopyMap).
 */
export type RelationshipUiCopy = {
  /** Container shell */
  containerTitle: string;
  containerDescription: string;
  tabsAriaLabel: string;
  tabRelationship: string;
  tabRoleModel: string;

  /** Shared primitives */
  cancel: string;
  save: string;
  saving: string;
  create: string;
  delete: string;
  edit: string;
  search: string;

  /** Relationships view */
  relPageTitle: string;
  relPageDescription: string;
  relNew: string;
  relSearchPlaceholder: string;
  relTypeFilter: string;
  relTypePersonal: string;
  relTypeProfessional: string;
  relSortName: string;
  relSortRecentlyAdded: string;
  relEmptyTitle: string;
  relEmptyDescNoResults: string;
  relEmptyDescNoEntries: string;
  relEmptyAction: string;
  relMetaProjectsOne: string;
  relMetaProjectsOther: string;
  relCreateTitle: string;
  relEditTitle: string;
  relLabelName: string;
  relLabelType: string;
  relLabelDescription: string;
  relLabelEmail: string;
  relLabelPhone: string;
  relLabelOtherContact: string;
  relLabelLinkedProjects: string;
  relSectionDescription: string;
  relSectionContact: string;
  relSectionLinkedProjects: string;
  relUpdated: string;
  relDeleteTitle: string;
  relDeleteDescription: string;

  /** Role Models view */
  rmPageTitle: string;
  rmPageDescription: string;
  rmAdd: string;
  rmSearchPlaceholder: string;
  rmSortName: string;
  rmSortRecentlyAdded: string;
  rmEmptyTitle: string;
  rmEmptyDescNoResults: string;
  rmEmptyDescNoEntries: string;
  rmEmptyAction: string;
  rmMetaLinks: string;
  rmCreateTitle: string;
  rmEditTitle: string;
  rmLabelName: string;
  rmLabelImageUrl: string;
  rmLabelDescription: string;
  rmLabelProjects: string;
  rmLabelGoals: string;
  rmLabelNotes: string;
  rmSectionDescription: string;
  rmSectionProjects: string;
  rmSectionGoals: string;
  rmSectionNotes: string;
  rmUpdated: string;
  rmDeleteTitle: string;
  rmDeleteDescription: string;

  // ---- Phase 2: richer profile + AI auto-fill ----
  /** Heading above the AI hero button */
  rmAutoFillSectionTitle: string;
  /** Subtitle/copy under the AI hero button */
  rmAutoFillSectionHelp: string;
  /** Primary CTA for the AI hero button (idle state) */
  rmAutoFillCta: string;
  /** Secondary CTA when fields already populated */
  rmAutoFillCtaRefresh: string;
  /** Status label while web research is in progress */
  rmAutoFillResearching: string;
  /** Status label while structured extraction is in progress */
  rmAutoFillExtracting: string;
  /** Status label after success */
  rmAutoFillSuccess: string;
  /** Generic error label */
  rmAutoFillError: string;
  /** Toast on AI success */
  rmAutoFillToastSuccess: string;
  /** Error message: name field empty */
  rmAutoFillErrorMissingName: string;
  /** Error message: AI failed for any other reason */
  rmAutoFillErrorGeneric: string;
  /** "AI-generated — review before saving" review banner */
  rmAutoFillReviewBanner: string;
  /** Show the user the model that produced the data */
  rmAutoFillMetaModel: string;
  /** "Switch to manual entry" link */
  rmAutoFillSwitchToManual: string;

  /** Form section labels */
  rmFormSectionEssentials: string;
  rmFormSectionProfile: string;
  rmFormSectionWisdom: string;
  rmFormSectionLinks: string;
  rmFormSectionPersonal: string;

  /** New field labels */
  rmLabelPhoto: string;
  rmLabelPhotoUrlPlaceholder: string;
  rmLabelCategory: string;
  rmLabelCategoryPlaceholder: string;
  rmLabelAdmirationBlurb: string;
  rmLabelAdmirationBlurbPlaceholder: string;
  rmLabelBio: string;
  rmLabelBioPlaceholder: string;
  rmLabelQuotes: string;
  rmLabelQuotesEmpty: string;
  rmLabelQuoteText: string;
  rmLabelQuoteSource: string;
  rmLabelKeyLessons: string;
  rmLabelKeyLessonsEmpty: string;
  rmLabelLessonTitle: string;
  rmLabelLessonDetail: string;
  rmLabelTags: string;
  rmLabelTagsPlaceholder: string;
  rmLabelTagsHelp: string;
  rmLabelLinks: string;
  rmLabelLinksEmpty: string;
  rmLabelLinkLabel: string;
  rmLabelLinkUrl: string;
  rmLabelLinkKind: string;
  rmLabelNotesPersonal: string;
  rmLabelNotesPersonalPlaceholder: string;
  rmLabelFavorite: string;

  /** "+ Add" / "Remove" actions for sub-editors */
  rmAddQuote: string;
  rmAddLesson: string;
  rmAddLink: string;
  rmRemove: string;

  /** Detail panel new sections */
  rmSectionAdmirationBlurb: string;
  rmSectionBio: string;
  rmSectionQuotes: string;
  rmSectionKeyLessons: string;
  rmSectionTags: string;
  rmSectionLinks: string;
  rmSectionPersonalNotes: string;

  /** Filter chips */
  rmFilterAllCategories: string;
  rmFilterFavoritesOnly: string;
  rmFilterClear: string;

  /** Suggested category labels (lowercase keys; map to the 15-value enum) */
  rmCategoryPhilosopher: string;
  rmCategoryScientist: string;
  rmCategoryEntrepreneur: string;
  rmCategoryArtist: string;
  rmCategoryWriter: string;
  rmCategoryAthlete: string;
  rmCategoryLeader: string;
  rmCategoryEngineer: string;
  rmCategoryDesigner: string;
  rmCategoryMusician: string;
  rmCategoryActivist: string;
  rmCategoryTeacher: string;
  rmCategoryExplorer: string;
  rmCategorySpiritual: string;
  rmCategoryOther: string;

  /** Link kind labels */
  rmLinkKindWikipedia: string;
  rmLinkKindOfficial: string;
  rmLinkKindBook: string;
  rmLinkKindArticle: string;
  rmLinkKindVideo: string;
  rmLinkKindPodcast: string;
  rmLinkKindSocial: string;
  rmLinkKindOther: string;

  /** Favorite toggle a11y */
  rmFavoriteAddAria: string;
  rmFavoriteRemoveAria: string;

  // ---- Phase 3: photo upload + microinteractions ----
  /** Tab labels above the photo editor */
  rmPhotoTabUpload: string;
  rmPhotoTabUrl: string;
  /** Empty drop-zone instruction */
  rmPhotoDropzoneIdle: string;
  /** Drop-zone state while a file is being dragged over */
  rmPhotoDropzoneActive: string;
  /** Hint shown under the dropzone (file types + size) */
  rmPhotoDropzoneHint: string;
  /** Button-like CTA inside the dropzone for clicking to choose */
  rmPhotoDropzoneBrowse: string;
  /** Status while uploading */
  rmPhotoUploading: string;
  /** Error: wrong MIME type */
  rmPhotoErrorWrongType: string;
  /** Error: file too large */
  rmPhotoErrorTooLarge: string;
  /** Error: empty / 0-byte file */
  rmPhotoErrorEmpty: string;
  /** Error: not signed in */
  rmPhotoErrorAuth: string;
  /** Error: anything else */
  rmPhotoErrorUnknown: string;
  /** Toast on successful upload */
  rmPhotoUploadSuccessToast: string;
  /** Aria label for the file input */
  rmPhotoFileInputAria: string;
  /** Aria-live announcement when AI auto-fill completes (screen-readers) */
  rmAutoFillAriaAnnounce: string;

  // ---- Phase 4: Gallery polish ----
  /** Title of the favorites rail above the main gallery grid. */
  rmFavoritesRailTitle: string;
  /** Section title in the detail panel for the rotating spotlight quote. */
  rmSectionSpotlight: string;
  /** Aria-label for the "next quote" cycle button in the spotlight. */
  rmSpotlightNextAria: string;
  /** Sort label for "Favorites first, then most recent". */
  rmSortFavoritesFirst: string;
  /** Aria-label fragment used when navigating from a linked-entity badge.
   *  Example: "Open in Projects" — `{area}` is replaced with the section. */
  rmLinkedOpenInAria: string;
  /** Empty-state nudge shown above the CTA: try a few popular names. */
  rmEmptyTrySampleHint: string;
  /** "Try with AI" button label on the empty state. */
  rmEmptyTrySampleAction: string;

  // ---- Phase 5: Polish & QA ----
  /** Title of the discard-changes alert dialog. */
  rmDiscardChangesTitle: string;
  /** Body of the discard-changes alert dialog. */
  rmDiscardChangesDescription: string;
  /** Cancel/keep-editing label in the discard alert. */
  rmDiscardKeepEditing: string;
  /** Destructive confirm label in the discard alert. */
  rmDiscardConfirm: string;
  /** Aria-label for a favorites-rail item. `{name}` is replaced. */
  rmFavoritesRailItemAria: string;

  // ============================================================
  // 2026-04-19: Relationship sub-tab redesign (personal-CRM)
  //
  // The legacy Relationships view (relPage*, relLabel*, etc.) is being
  // replaced by a richer card-grid layout with photos, categories,
  // strength, last-contact tracking, next-action, and tags. The keys
  // below are scoped to the new view; legacy keys remain in place to
  // keep the temporary "coming soon" stub compiling.
  // ============================================================

  /** Stub copy shown until Phase 2 ships the new gallery. */
  relStubTitle: string;
  relStubDescription: string;

  /** Filter bar */
  relFilterCategory: string;
  relFilterStrength: string;
  relFilterFavoritesOnly: string;
  relFilterAllCategories: string;
  relFilterAllStrengths: string;
  relFilterClear: string;

  /** Category labels (slug → display) */
  relCatProfessor: string;
  relCatClassmate: string;
  relCatCollaborator: string;
  relCatFriend: string;
  relCatFamily: string;
  relCatMentor: string;
  relCatProfessionalContact: string;
  relCatOther: string;

  /** Strength labels (slug → display) */
  relStrStrong: string;
  relStrModerate: string;
  relStrWeak: string;
  relStrNew: string;

  /** Sort options for the gallery */
  relSortNameAZ: string;
  relSortLastContact: string;
  relSortFavoritesFirst: string;

  /** Card UI */
  relCardNeverContacted: string;
  relCardNextAction: string;
  /** "Due: {date}" */
  relCardDueOn: string;
  /** Aria-label: "Add {name} to favorites" */
  relCardFavoriteAddAria: string;
  /** Aria-label: "Remove {name} from favorites" */
  relCardFavoriteRemoveAria: string;

  /** Form section labels */
  relFormSectionEssentials: string;
  relFormSectionContact: string;
  relFormSectionInteraction: string;
  relFormSectionLongForm: string;
  relFormSectionMeta: string;

  /** Form field labels */
  relFieldPhoto: string;
  relFieldPhotoHint: string;
  relFieldName: string;
  relFieldNamePlaceholder: string;
  relFieldCategory: string;
  relFieldCategoryPlaceholder: string;
  relFieldEmail: string;
  relFieldEmailPlaceholder: string;
  relFieldPhone: string;
  relFieldPhonePlaceholder: string;
  relFieldStrength: string;
  relFieldLastContact: string;
  relFieldLastInteractionNotes: string;
  relFieldLastInteractionPlaceholder: string;
  relFieldNextAction: string;
  relFieldNextActionPlaceholder: string;
  relFieldNextActionDate: string;
  relFieldCommitments: string;
  relFieldCommitmentsPlaceholder: string;
  relFieldPreferences: string;
  relFieldPreferencesPlaceholder: string;
  relFieldGeneralNotes: string;
  relFieldGeneralNotesPlaceholder: string;
  relFieldTags: string;
  relFieldTagsPlaceholder: string;
  relFieldTagsHint: string;
  relFieldLinkedProject: string;
  relFieldLinkedProjectPlaceholder: string;
  relFieldLinkedProjectNone: string;
  relFieldFavorite: string;

  /** Modal CTAs */
  relSaveRelationship: string;

  /** Detail panel section headers */
  relDetailSectionContact: string;
  relDetailSectionLastContact: string;
  relDetailSectionLastInteraction: string;
  relDetailSectionNextAction: string;
  relDetailSectionCommitments: string;
  relDetailSectionPreferences: string;
  relDetailSectionGeneralNotes: string;
  relDetailSectionTags: string;
  relDetailSectionLinkedProject: string;

  /** Empty / no-results states */
  relNoResultsTitle: string;
  relNoResultsDescription: string;

  /** Photo picker (sub-tab) */
  relPhotoUploading: string;
  relPhotoRemoveAria: string;
  relPhotoErrorWrongType: string;
  relPhotoErrorTooLarge: string;
  relPhotoErrorEmpty: string;
  relPhotoErrorAuth: string;
  relPhotoErrorUnknown: string;

  /** Detail panel actions */
  relDetailEdit: string;
  relDetailDelete: string;
  relDetailDeleteConfirmTitle: string;
  relDetailDeleteConfirmDescription: string;

  /** Page-level loading + error */
  relLoading: string;
  relLoadError: string;
  relLoadErrorRetry: string;

  // ---- Relationship Intelligence Hub (AI-first redesign) ----
  /** Page-level CTAs + intro copy */
  hubAddWithAi: string;
  hubLogInteraction: string;
  hubAddManually: string;
  hubIntro: string;
  hubEmptyTitle: string;
  hubEmptyDescription: string;

  /** AI Creation Wizard */
  wizardTitle: string;
  wizardStepInput: string;
  wizardStepReview: string;
  wizardChooseMethod: string;
  wizardMethodPaste: string;
  wizardMethodDescribe: string;
  wizardMethodName: string;
  wizardInputPlaceholder: string;
  wizardNamePlaceholder: string;
  wizardExtract: string;
  wizardExtracting: string;
  wizardReviewBanner: string;
  wizardConfidenceHigh: string;
  wizardConfidenceMedium: string;
  wizardConfidenceLow: string;
  wizardConfidenceMissing: string;
  wizardSave: string;
  wizardBack: string;
  wizardError: string;
  wizardSuggestedActions: string;

  /** Progress steps shown during extraction */
  wizardProgressReading: string;
  wizardProgressIdentifying: string;
  wizardProgressContact: string;
  wizardProgressCommitments: string;
  wizardProgressNextAction: string;
  wizardProgressPreparing: string;

  /** Quick Interaction Logger */
  loggerTitle: string;
  loggerSelectPerson: string;
  loggerNotePlaceholder: string;
  loggerExtract: string;
  loggerExtracting: string;
  loggerReviewTitle: string;
  loggerWillUpdate: string;
  loggerApply: string;
  loggerCancel: string;
  loggerNoChanges: string;
  loggerSaved: string;
  loggerError: string;
  loggerAlsoCreatePromises: string;

  /** Intelligence modal */
  modalRefreshInsight: string;
  modalGenerating: string;
  modalWhyMatters: string;
  modalMemoryCapsule: string;
  modalNextTouchpoint: string;
  modalPromiseKeeper: string;
  modalContextHealth: string;
  modalWeather: string;
  modalCareWithout: string;
  modalDontForget: string;
  modalHiddenConnections: string;
  modalWhatToRemember: string;
  modalOpenLoops: string;
  modalWhatNotToSay: string;
  modalSharedMemories: string;
  modalNoInsightYet: string;
  modalGenerateInsight: string;
  modalDraftFollowUp: string;
  modalTiming: string;
  modalChannel: string;

  /** Promise keeper */
  promiseOpen: string;
  promiseDone: string;
  promiseOverdue: string;
  promiseCancelled: string;
  promiseMarkDone: string;
  promiseReopen: string;
  promiseAdd: string;
  promiseAddPlaceholder: string;
  promiseNone: string;
  promiseDueOn: string;

  /** Context health factor labels */
  healthContactInfo: string;
  healthLastContact: string;
  healthNextAction: string;
  healthNextActionDate: string;
  healthPreferences: string;
  healthCommitments: string;
  healthLinkedProject: string;
  healthTags: string;
  healthProfilePhoto: string;
  healthMemoryImage: string;
  healthRecentInteraction: string;
  healthMissingLabel: string;

  /** Weather statuses */
  weatherClear: string;
  weatherNeedsAttention: string;
  weatherOpenLoop: string;
  weatherQuietRecently: string;
  weatherSensitive: string;
  weatherMeetingSoon: string;
  weatherPromisePending: string;

  /** Page dashboard */
  dashWhoNeedsMe: string;
  dashWhoNeedsMeEmpty: string;
  dashPromiseDebt: string;
  dashPromiseDebtEmpty: string;
  dashPromiseDebtCount: string;
  reasonOverduePromise: string;
  reasonNextActionDue: string;
  reasonOpenPromise: string;
  reasonFavoriteQuiet: string;

  /** Card additions */
  cardOpenIntelligence: string;
  cardOpenPromiseCount: string;
  cardContextHealth: string;

  /** Shared memories / images */
  imagesUpload: string;
  imagesUploading: string;
  imagesEmpty: string;
  imageTypeProfile: string;
  imageTypeShared: string;
  imageTypeEvent: string;
  imageTypeBusinessCard: string;
  imageTypeScreenshot: string;
  imageTypeMemory: string;
  imageTypeOther: string;
  imageDelete: string;

  /** Draft message */
  draftTone: string;
  draftPurpose: string;
  draftGenerate: string;
  draftGenerating: string;
  draftCopy: string;
  draftCopied: string;
  draftSave: string;
  draftNeverSent: string;
  draftSubject: string;
  draftCaution: string;
};

const en: RelationshipUiCopy = {
  containerTitle: "People",
  containerDescription:
    "The people who shape your life — those you collaborate with, learn from, and look up to.",
  tabsAriaLabel: "People sections",
  tabRelationship: "Relationships",
  tabRoleModel: "Role Model",

  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  create: "Create",
  delete: "Delete",
  edit: "Edit",
  search: "Search…",

  relPageTitle: "Relationships",
  relPageDescription: "People you collaborate with and care about",
  relNew: "New relationship",
  relSearchPlaceholder: "Search people…",
  relTypeFilter: "Type",
  relTypePersonal: "Personal",
  relTypeProfessional: "Professional",
  relSortName: "Name",
  relSortRecentlyAdded: "Recently added",
  relEmptyTitle: "No relationships yet",
  relEmptyDescNoResults: "Try adjusting filters or search",
  relEmptyDescNoEntries:
    "Start by adding someone important to you — a mentor, friend, collaborator, or family member.",
  relEmptyAction: "Add relationship",
  relMetaProjectsOne: "1 project",
  relMetaProjectsOther: "{count} projects",
  relCreateTitle: "New relationship",
  relEditTitle: "Edit relationship",
  relLabelName: "Name *",
  relLabelType: "Type",
  relLabelDescription: "Description",
  relLabelEmail: "Email",
  relLabelPhone: "Phone",
  relLabelOtherContact: "Other contact notes",
  relLabelLinkedProjects: "Linked projects",
  relSectionDescription: "Description",
  relSectionContact: "Contact information",
  relSectionLinkedProjects: "Linked projects",
  relUpdated: "Updated {date}",
  relDeleteTitle: "Delete relationship",
  relDeleteDescription: 'Remove "{name}"? This cannot be undone.',

  rmPageTitle: "Role models",
  rmPageDescription: "People and figures you learn from",
  rmAdd: "Add role model",
  rmSearchPlaceholder: "Search…",
  rmSortName: "Name",
  rmSortRecentlyAdded: "Recently added",
  rmEmptyTitle: "No role models yet",
  rmEmptyDescNoResults: "Try a different search",
  rmEmptyDescNoEntries:
    "Collect mentors, leaders, and inspirations in one gallery — start with someone who's shaped how you think.",
  rmEmptyAction: "Add one",
  rmMetaLinks: "{count} links",
  rmCreateTitle: "Add role model",
  rmEditTitle: "Edit role model",
  rmLabelName: "Name *",
  rmLabelImageUrl: "Image URL",
  rmLabelDescription: "Description",
  rmLabelProjects: "Projects",
  rmLabelGoals: "Goals",
  rmLabelNotes: "Notes",
  rmSectionDescription: "Description",
  rmSectionProjects: "Projects",
  rmSectionGoals: "Goals",
  rmSectionNotes: "Notes",
  rmUpdated: "Updated {date}",
  rmDeleteTitle: "Remove role model",
  rmDeleteDescription: 'Remove "{name}"? This cannot be undone.',

  rmAutoFillSectionTitle: "Auto-fill with AI",
  rmAutoFillSectionHelp:
    "Type a name above and let AI gather the bio, quotes, and lessons for you. You'll review everything before it saves.",
  rmAutoFillCta: "Auto-fill with AI",
  rmAutoFillCtaRefresh: "Re-run AI",
  rmAutoFillResearching: "Searching the web…",
  rmAutoFillExtracting: "Drafting the profile…",
  rmAutoFillSuccess: "Draft ready — review the fields below",
  rmAutoFillError: "Couldn't generate a profile. Try a different name or fill it in manually.",
  rmAutoFillToastSuccess: "AI-drafted profile ready for review",
  rmAutoFillErrorMissingName: "Enter a name first.",
  rmAutoFillErrorGeneric: "AI generation failed. Please try again.",
  rmAutoFillReviewBanner:
    "AI-generated draft. Verify quotes and facts, then edit anything before saving.",
  rmAutoFillMetaModel: "Generated by {model}",
  rmAutoFillSwitchToManual: "Skip — I'll fill it in myself",

  rmFormSectionEssentials: "Essentials",
  rmFormSectionProfile: "Profile",
  rmFormSectionWisdom: "Wisdom",
  rmFormSectionLinks: "Links & references",
  rmFormSectionPersonal: "Personal",

  rmLabelPhoto: "Photo",
  rmLabelPhotoUrlPlaceholder: "https://… (image URL)",
  rmLabelCategory: "Category",
  rmLabelCategoryPlaceholder: "Pick or type a domain",
  rmLabelAdmirationBlurb: "Why I admire them",
  rmLabelAdmirationBlurbPlaceholder: "One sentence on what draws you to them…",
  rmLabelBio: "Biography",
  rmLabelBioPlaceholder: "Who they were and what they're known for…",
  rmLabelQuotes: "Quotes",
  rmLabelQuotesEmpty: "No quotes yet. Add one to remember their voice.",
  rmLabelQuoteText: "Quote",
  rmLabelQuoteSource: "Source (book, speech, year…)",
  rmLabelKeyLessons: "Key lessons",
  rmLabelKeyLessonsEmpty: "What's the principle you want to carry forward?",
  rmLabelLessonTitle: "Lesson title",
  rmLabelLessonDetail: "Detail (optional)",
  rmLabelTags: "Tags",
  rmLabelTagsPlaceholder: "Add a tag and press Enter",
  rmLabelTagsHelp: "Lowercase, single words work best (e.g. perseverance).",
  rmLabelLinks: "Reference links",
  rmLabelLinksEmpty: "Add a Wikipedia, official site, or favorite book link.",
  rmLabelLinkLabel: "Label",
  rmLabelLinkUrl: "URL",
  rmLabelLinkKind: "Kind",
  rmLabelNotesPersonal: "My private notes",
  rmLabelNotesPersonalPlaceholder:
    "What does their life mean to you? Only you'll see this…",
  rmLabelFavorite: "Favorite",

  rmAddQuote: "Add quote",
  rmAddLesson: "Add lesson",
  rmAddLink: "Add link",
  rmRemove: "Remove",

  rmSectionAdmirationBlurb: "Why I admire them",
  rmSectionBio: "Biography",
  rmSectionQuotes: "Quotes",
  rmSectionKeyLessons: "Key lessons",
  rmSectionTags: "Tags",
  rmSectionLinks: "Reference links",
  rmSectionPersonalNotes: "My notes",

  rmFilterAllCategories: "All categories",
  rmFilterFavoritesOnly: "Favorites",
  rmFilterClear: "Clear filters",

  rmCategoryPhilosopher: "Philosopher",
  rmCategoryScientist: "Scientist",
  rmCategoryEntrepreneur: "Entrepreneur",
  rmCategoryArtist: "Artist",
  rmCategoryWriter: "Writer",
  rmCategoryAthlete: "Athlete",
  rmCategoryLeader: "Leader",
  rmCategoryEngineer: "Engineer",
  rmCategoryDesigner: "Designer",
  rmCategoryMusician: "Musician",
  rmCategoryActivist: "Activist",
  rmCategoryTeacher: "Teacher",
  rmCategoryExplorer: "Explorer",
  rmCategorySpiritual: "Spiritual",
  rmCategoryOther: "Other",

  rmLinkKindWikipedia: "Wikipedia",
  rmLinkKindOfficial: "Official site",
  rmLinkKindBook: "Book",
  rmLinkKindArticle: "Article",
  rmLinkKindVideo: "Video",
  rmLinkKindPodcast: "Podcast",
  rmLinkKindSocial: "Social",
  rmLinkKindOther: "Other",

  rmFavoriteAddAria: "Mark as favorite",
  rmFavoriteRemoveAria: "Remove from favorites",

  rmPhotoTabUpload: "Upload",
  rmPhotoTabUrl: "Image URL",
  rmPhotoDropzoneIdle: "Drag a photo here, or click to choose",
  rmPhotoDropzoneActive: "Drop the photo to upload",
  rmPhotoDropzoneHint: "JPG, PNG, WebP, or GIF — up to 5 MB",
  rmPhotoDropzoneBrowse: "Browse files",
  rmPhotoUploading: "Uploading photo…",
  rmPhotoErrorWrongType: "That file type isn't supported. Use JPG, PNG, WebP, or GIF.",
  rmPhotoErrorTooLarge: "Photo is too large. Please pick something under 5 MB.",
  rmPhotoErrorEmpty: "That file appears to be empty.",
  rmPhotoErrorAuth: "Please sign in again to upload photos.",
  rmPhotoErrorUnknown: "Couldn't upload the photo. Please try again.",
  rmPhotoUploadSuccessToast: "Photo uploaded",
  rmPhotoFileInputAria: "Choose a photo to upload",
  rmAutoFillAriaAnnounce: "AI draft ready. Review the fields below before saving.",

  rmFavoritesRailTitle: "Favorites",
  rmSectionSpotlight: "Spotlight quote",
  rmSpotlightNextAria: "Show another quote",
  rmSortFavoritesFirst: "Favorites first",
  rmLinkedOpenInAria: "Open in {area}",
  rmEmptyTrySampleHint: "Or try a name like Marie Curie, Steve Jobs, or Maya Angelou — AI will fill the rest.",
  rmEmptyTrySampleAction: "Try with AI",

  rmDiscardChangesTitle: "Discard your changes?",
  rmDiscardChangesDescription: "You haven't saved this role model yet. If you close now, your edits will be lost.",
  rmDiscardKeepEditing: "Keep editing",
  rmDiscardConfirm: "Discard",
  rmFavoritesRailItemAria: "Open {name}",

  // ---- 2026-04-19 redesign keys (English source of truth) ----
  relStubTitle: "A redesigned Relationships gallery is coming",
  relStubDescription:
    "We're rebuilding this view as a personal-CRM gallery — photos, last-contact tracking, next actions, and tags. Check back shortly.",

  relFilterCategory: "Category",
  relFilterStrength: "Strength",
  relFilterFavoritesOnly: "Favorites only",
  relFilterAllCategories: "All categories",
  relFilterAllStrengths: "All strengths",
  relFilterClear: "Clear filters",

  relCatProfessor: "Professor",
  relCatClassmate: "Classmate",
  relCatCollaborator: "Collaborator",
  relCatFriend: "Friend",
  relCatFamily: "Family",
  relCatMentor: "Mentor",
  relCatProfessionalContact: "Professional contact",
  relCatOther: "Other",

  relStrStrong: "Strong",
  relStrModerate: "Moderate",
  relStrWeak: "Weak",
  relStrNew: "New",

  relSortNameAZ: "Name (A–Z)",
  relSortLastContact: "Last contact",
  relSortFavoritesFirst: "Favorites first",

  relCardNeverContacted: "Never contacted",
  relCardNextAction: "Next Action",
  relCardDueOn: "Due: {date}",
  relCardFavoriteAddAria: "Add {name} to favorites",
  relCardFavoriteRemoveAria: "Remove {name} from favorites",

  relFormSectionEssentials: "Essentials",
  relFormSectionContact: "Contact",
  relFormSectionInteraction: "Interaction history",
  relFormSectionLongForm: "Context & notes",
  relFormSectionMeta: "Tags & links",

  relFieldPhoto: "Photo",
  relFieldPhotoHint: "Click to upload a photo",
  relFieldName: "Name",
  relFieldNamePlaceholder: "Full name",
  relFieldCategory: "Category",
  relFieldCategoryPlaceholder: "Select a category",
  relFieldEmail: "Email",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "Phone",
  relFieldPhonePlaceholder: "+1 234 567 8900",
  relFieldStrength: "Relationship strength",
  relFieldLastContact: "Last contact date",
  relFieldLastInteractionNotes: "Last interaction notes",
  relFieldLastInteractionPlaceholder: "What happened in your last conversation?",
  relFieldNextAction: "Next action",
  relFieldNextActionPlaceholder: "What's the next step with this person?",
  relFieldNextActionDate: "Next action date",
  relFieldCommitments: "Commitments made",
  relFieldCommitmentsPlaceholder: "What did you (or they) promise to do?",
  relFieldPreferences: "Preferences & details",
  relFieldPreferencesPlaceholder: "Birthday, allergies, favorite coffee…",
  relFieldGeneralNotes: "General notes",
  relFieldGeneralNotesPlaceholder: "Anything else worth remembering",
  relFieldTags: "Tags",
  relFieldTagsPlaceholder:
    "LSAT study group, piano community, startup network",
  relFieldTagsHint: "Comma-separated. Use any words you'd search for later.",
  relFieldLinkedProject: "Linked project",
  relFieldLinkedProjectPlaceholder: "Select a project",
  relFieldLinkedProjectNone: "No project",
  relFieldFavorite: "Mark as favorite",

  relSaveRelationship: "Save relationship",

  relDetailSectionContact: "Contact",
  relDetailSectionLastContact: "Last contact",
  relDetailSectionLastInteraction: "Last interaction notes",
  relDetailSectionNextAction: "Next action",
  relDetailSectionCommitments: "Commitments made",
  relDetailSectionPreferences: "Preferences & details",
  relDetailSectionGeneralNotes: "General notes",
  relDetailSectionTags: "Tags",
  relDetailSectionLinkedProject: "Linked project",

  relNoResultsTitle: "No matches found",
  relNoResultsDescription: "Try adjusting your search or filters.",

  relPhotoUploading: "Uploading…",
  relPhotoRemoveAria: "Remove photo",
  relPhotoErrorWrongType:
    "That file type isn't supported. Try JPG, PNG, WebP, or GIF.",
  relPhotoErrorTooLarge: "That image is over the 5 MB limit.",
  relPhotoErrorEmpty: "That file appears to be empty.",
  relPhotoErrorAuth: "You need to be signed in to upload a photo.",
  relPhotoErrorUnknown: "Couldn't upload the photo. Try again in a moment.",

  relDetailEdit: "Edit",
  relDetailDelete: "Delete",
  relDetailDeleteConfirmTitle: "Delete relationship",
  relDetailDeleteConfirmDescription:
    'Remove "{name}" from your relationships? This cannot be undone.',

  relLoading: "Loading relationships…",
  relLoadError: "Couldn't load your relationships.",
  relLoadErrorRetry: "Try again",

  // ---- Relationship Intelligence Hub ----
  hubAddWithAi: "Add with AI",
  hubLogInteraction: "Log Interaction",
  hubAddManually: "Add Manually",
  hubIntro:
    "Capture people, memories, promises, and follow-ups without filling a long form. Paste a note, describe someone, or log what happened — AI organizes the relationship context for you.",
  hubEmptyTitle: "Build your Relationship Intelligence Hub",
  hubEmptyDescription:
    "Paste a meeting note, describe someone you met, or log what happened. AI will organize the contact, remember commitments, and suggest the next thoughtful follow-up.",

  wizardTitle: "Add Relationship with AI",
  wizardStepInput: "Capture",
  wizardStepReview: "Review",
  wizardChooseMethod:
    "How do you want to add this person? Paste a memory, describe them, or just give a name — AI fills the boring fields for you.",
  wizardMethodPaste: "Paste notes / message",
  wizardMethodDescribe: "Describe in one sentence",
  wizardMethodName: "Just a name",
  wizardInputPlaceholder:
    "e.g. Met Lori Sims on Zoom. She agreed to accept me into her studio. I want to thank her and send a repertoire plan later. She prefers concise emails.",
  wizardNamePlaceholder: "Person's name",
  wizardExtract: "Extract with AI",
  wizardExtracting: "Reading your note…",
  wizardReviewBanner: "AI-drafted — review and edit before saving. Nothing is saved automatically.",
  wizardConfidenceHigh: "High confidence",
  wizardConfidenceMedium: "Medium confidence",
  wizardConfidenceLow: "Low confidence",
  wizardConfidenceMissing: "Needs review",
  wizardSave: "Save relationship",
  wizardBack: "Back",
  wizardError: "AI couldn't process that. Try rephrasing or add manually.",
  wizardSuggestedActions: "Suggested next actions",

  wizardProgressReading: "Reading context…",
  wizardProgressIdentifying: "Identifying person…",
  wizardProgressContact: "Extracting contact details…",
  wizardProgressCommitments: "Finding commitments…",
  wizardProgressNextAction: "Detecting next action…",
  wizardProgressPreparing: "Preparing review…",

  loggerTitle: "Log Interaction",
  loggerSelectPerson: "Who did you interact with?",
  loggerNotePlaceholder:
    "e.g. Had coffee with Karen today. She paid for her students. Need to send confirmation tomorrow. She prefers WhatsApp and concise messages.",
  loggerExtract: "Extract update",
  loggerExtracting: "Reading your note…",
  loggerReviewTitle: "Review the update",
  loggerWillUpdate: "Will update",
  loggerApply: "Apply update",
  loggerCancel: "Cancel",
  loggerNoChanges: "AI didn't find anything to update.",
  loggerSaved: "Interaction logged",
  loggerError: "Couldn't process that note.",
  loggerAlsoCreatePromises: "Also track these as promises",

  modalRefreshInsight: "Refresh insight",
  modalGenerating: "Thinking about this relationship…",
  modalWhyMatters: "Why this person matters",
  modalMemoryCapsule: "Relationship memory capsule",
  modalNextTouchpoint: "Next best touchpoint",
  modalPromiseKeeper: "Promise keeper",
  modalContextHealth: "Context health",
  modalWeather: "Relationship weather",
  modalCareWithout: "Care without overdoing it",
  modalDontForget: "Don't forget",
  modalHiddenConnections: "Hidden connections",
  modalWhatToRemember: "What to remember",
  modalOpenLoops: "Open loops",
  modalWhatNotToSay: "What not to say",
  modalSharedMemories: "Shared memories",
  modalNoInsightYet:
    "Generate an AI insight to see why this person matters, what to remember, and the next thoughtful touchpoint.",
  modalGenerateInsight: "Generate insight",
  modalDraftFollowUp: "Draft follow-up",
  modalTiming: "Timing",
  modalChannel: "Channel",

  promiseOpen: "Open",
  promiseDone: "Done",
  promiseOverdue: "Overdue",
  promiseCancelled: "Cancelled",
  promiseMarkDone: "Mark done",
  promiseReopen: "Reopen",
  promiseAdd: "Add promise",
  promiseAddPlaceholder: "e.g. Send repertoire plan",
  promiseNone: "No promises tracked yet.",
  promiseDueOn: "Due {date}",

  healthContactInfo: "Contact info",
  healthLastContact: "Last contact",
  healthNextAction: "Next action",
  healthNextActionDate: "Next action date",
  healthPreferences: "Communication preferences",
  healthCommitments: "Tracked commitments",
  healthLinkedProject: "Linked project",
  healthTags: "Tags",
  healthProfilePhoto: "Profile photo",
  healthMemoryImage: "Shared memory photo",
  healthRecentInteraction: "Recent interaction",
  healthMissingLabel: "Missing",

  weatherClear: "Clear",
  weatherNeedsAttention: "Needs attention",
  weatherOpenLoop: "Open loop",
  weatherQuietRecently: "Quiet recently",
  weatherSensitive: "Sensitive",
  weatherMeetingSoon: "Meeting soon",
  weatherPromisePending: "Promise pending",

  dashWhoNeedsMe: "Who may need attention this week",
  dashWhoNeedsMeEmpty: "No one needs urgent attention — you're on top of things.",
  dashPromiseDebt: "Open promises",
  dashPromiseDebtEmpty: "No open promises. Nicely kept.",
  dashPromiseDebtCount: "You have {count} open promise(s)",
  reasonOverduePromise: "Overdue promise",
  reasonNextActionDue: "Next action due",
  reasonOpenPromise: "Open promise",
  reasonFavoriteQuiet: "Important but quiet",

  cardOpenIntelligence: "Open intelligence",
  cardOpenPromiseCount: "{count} open",
  cardContextHealth: "Context {score}%",

  imagesUpload: "Add image",
  imagesUploading: "Uploading…",
  imagesEmpty: "No shared photos or memory images yet.",
  imageTypeProfile: "Profile photo",
  imageTypeShared: "Shared photo (合照)",
  imageTypeEvent: "Event photo",
  imageTypeBusinessCard: "Business card",
  imageTypeScreenshot: "Screenshot",
  imageTypeMemory: "Memory photo",
  imageTypeOther: "Other",
  imageDelete: "Remove image",

  draftTone: "Tone",
  draftPurpose: "Purpose",
  draftGenerate: "Generate draft",
  draftGenerating: "Drafting…",
  draftCopy: "Copy",
  draftCopied: "Copied",
  draftSave: "Save draft",
  draftNeverSent: "Drafts are never sent automatically — copy or save, then send yourself.",
  draftSubject: "Subject",
  draftCaution: "Heads up",
};

const zhTW: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "人物",
  containerDescription: "塑造你人生的那些人 —— 你合作、學習、敬仰的對象。",
  tabsAriaLabel: "人物分頁",
  tabRelationship: "人際關係",
  tabRoleModel: "榜樣",

  cancel: "取消",
  save: "儲存",
  saving: "儲存中…",
  create: "建立",
  delete: "刪除",
  edit: "編輯",
  search: "搜尋…",

  relPageTitle: "人際關係",
  relPageDescription: "你合作與在乎的人",
  relNew: "新增關係",
  relSearchPlaceholder: "搜尋人物…",
  relTypeFilter: "類型",
  relTypePersonal: "個人",
  relTypeProfessional: "專業",
  relSortName: "名稱",
  relSortRecentlyAdded: "最近新增",
  relEmptyTitle: "尚未新增任何人際關係",
  relEmptyDescNoResults: "嘗試調整篩選或搜尋",
  relEmptyDescNoEntries: "從新增一位對你重要的人開始 —— 導師、朋友、合作夥伴或家人。",
  relEmptyAction: "新增關係",
  relMetaProjectsOne: "1 個專案",
  relMetaProjectsOther: "{count} 個專案",
  relCreateTitle: "新增關係",
  relEditTitle: "編輯關係",
  relLabelName: "姓名 *",
  relLabelType: "類型",
  relLabelDescription: "描述",
  relLabelEmail: "電子郵件",
  relLabelPhone: "電話",
  relLabelOtherContact: "其他聯絡備註",
  relLabelLinkedProjects: "連結的專案",
  relSectionDescription: "描述",
  relSectionContact: "聯絡資訊",
  relSectionLinkedProjects: "連結的專案",
  relUpdated: "更新於 {date}",
  relDeleteTitle: "刪除關係",
  relDeleteDescription: "確定要移除「{name}」嗎？此操作無法復原。",

  rmPageTitle: "榜樣",
  rmPageDescription: "你向他們學習的人物",
  rmAdd: "新增榜樣",
  rmSearchPlaceholder: "搜尋…",
  rmSortName: "名稱",
  rmSortRecentlyAdded: "最近新增",
  rmEmptyTitle: "尚未新增任何榜樣",
  rmEmptyDescNoResults: "嘗試其他關鍵字",
  rmEmptyDescNoEntries: "把導師、領袖與啟發你的人收藏在一處 —— 從一位深刻影響你思維的人開始。",
  rmEmptyAction: "新增一位",
  rmMetaLinks: "{count} 個連結",
  rmCreateTitle: "新增榜樣",
  rmEditTitle: "編輯榜樣",
  rmLabelName: "姓名 *",
  rmLabelImageUrl: "圖片網址",
  rmLabelDescription: "描述",
  rmLabelProjects: "專案",
  rmLabelGoals: "目標",
  rmLabelNotes: "筆記",
  rmSectionDescription: "描述",
  rmSectionProjects: "專案",
  rmSectionGoals: "目標",
  rmSectionNotes: "筆記",
  rmUpdated: "更新於 {date}",
  rmDeleteTitle: "移除榜樣",
  rmDeleteDescription: "確定要移除「{name}」嗎？此操作無法復原。",

  rmAutoFillSectionTitle: "AI 自動填寫",
  rmAutoFillSectionHelp:
    "輸入姓名後讓 AI 為你蒐集生平、語錄與啟發。儲存前你可以審閱並修改。",
  rmAutoFillCta: "用 AI 自動填寫",
  rmAutoFillCtaRefresh: "重新生成",
  rmAutoFillResearching: "搜尋網路中…",
  rmAutoFillExtracting: "整理資料中…",
  rmAutoFillSuccess: "草稿已備好 —— 請審閱以下欄位",
  rmAutoFillError: "無法生成資料，請換個名字或手動填寫。",
  rmAutoFillToastSuccess: "AI 草稿已生成，請審閱",
  rmAutoFillErrorMissingName: "請先輸入姓名。",
  rmAutoFillErrorGeneric: "AI 生成失敗，請再試一次。",
  rmAutoFillReviewBanner: "AI 生成草稿。儲存前請核對語錄與事實，可隨意修改。",
  rmAutoFillMetaModel: "由 {model} 生成",
  rmAutoFillSwitchToManual: "略過 —— 我自己填",

  rmFormSectionEssentials: "基本資料",
  rmFormSectionProfile: "個人簡介",
  rmFormSectionWisdom: "智慧",
  rmFormSectionLinks: "參考連結",
  rmFormSectionPersonal: "個人筆記",

  rmLabelPhoto: "照片",
  rmLabelPhotoUrlPlaceholder: "https://… (圖片網址)",
  rmLabelCategory: "領域",
  rmLabelCategoryPlaceholder: "選擇或輸入領域",
  rmLabelAdmirationBlurb: "敬佩他們的原因",
  rmLabelAdmirationBlurbPlaceholder: "用一句話描述吸引你的特質…",
  rmLabelBio: "生平",
  rmLabelBioPlaceholder: "他們是誰，又因何而聞名…",
  rmLabelQuotes: "語錄",
  rmLabelQuotesEmpty: "尚未新增語錄。新增一句來記住他們的聲音。",
  rmLabelQuoteText: "引言",
  rmLabelQuoteSource: "出處（書籍、演講、年份…）",
  rmLabelKeyLessons: "重要啟發",
  rmLabelKeyLessonsEmpty: "你想帶走的原則是什麼？",
  rmLabelLessonTitle: "啟發標題",
  rmLabelLessonDetail: "說明（選填）",
  rmLabelTags: "標籤",
  rmLabelTagsPlaceholder: "輸入標籤後按 Enter",
  rmLabelTagsHelp: "建議使用小寫單字（例如 perseverance）。",
  rmLabelLinks: "參考連結",
  rmLabelLinksEmpty: "新增維基百科、官方網站或喜愛的書籍連結。",
  rmLabelLinkLabel: "名稱",
  rmLabelLinkUrl: "網址",
  rmLabelLinkKind: "類型",
  rmLabelNotesPersonal: "我的筆記",
  rmLabelNotesPersonalPlaceholder: "他們的人生對你而言意味著什麼？只有你看得到…",
  rmLabelFavorite: "最愛",

  rmAddQuote: "新增語錄",
  rmAddLesson: "新增啟發",
  rmAddLink: "新增連結",
  rmRemove: "移除",

  rmSectionAdmirationBlurb: "敬佩的原因",
  rmSectionBio: "生平",
  rmSectionQuotes: "語錄",
  rmSectionKeyLessons: "重要啟發",
  rmSectionTags: "標籤",
  rmSectionLinks: "參考連結",
  rmSectionPersonalNotes: "我的筆記",

  rmFilterAllCategories: "所有領域",
  rmFilterFavoritesOnly: "最愛",
  rmFilterClear: "清除篩選",

  rmCategoryPhilosopher: "哲學家",
  rmCategoryScientist: "科學家",
  rmCategoryEntrepreneur: "創業家",
  rmCategoryArtist: "藝術家",
  rmCategoryWriter: "作家",
  rmCategoryAthlete: "運動員",
  rmCategoryLeader: "領導者",
  rmCategoryEngineer: "工程師",
  rmCategoryDesigner: "設計師",
  rmCategoryMusician: "音樂家",
  rmCategoryActivist: "社會運動者",
  rmCategoryTeacher: "教師",
  rmCategoryExplorer: "探險家",
  rmCategorySpiritual: "靈性導師",
  rmCategoryOther: "其他",

  rmLinkKindWikipedia: "維基百科",
  rmLinkKindOfficial: "官方網站",
  rmLinkKindBook: "書籍",
  rmLinkKindArticle: "文章",
  rmLinkKindVideo: "影片",
  rmLinkKindPodcast: "Podcast",
  rmLinkKindSocial: "社群",
  rmLinkKindOther: "其他",

  rmFavoriteAddAria: "標記為最愛",
  rmFavoriteRemoveAria: "取消最愛",

  rmPhotoTabUpload: "上傳",
  rmPhotoTabUrl: "圖片網址",
  rmPhotoDropzoneIdle: "將照片拖到此處，或點擊選擇",
  rmPhotoDropzoneActive: "放開以上傳照片",
  rmPhotoDropzoneHint: "JPG、PNG、WebP 或 GIF —— 最大 5 MB",
  rmPhotoDropzoneBrowse: "瀏覽檔案",
  rmPhotoUploading: "正在上傳照片…",
  rmPhotoErrorWrongType: "不支援此檔案類型，請使用 JPG、PNG、WebP 或 GIF。",
  rmPhotoErrorTooLarge: "照片太大，請選擇 5 MB 以下的檔案。",
  rmPhotoErrorEmpty: "檔案似乎是空的。",
  rmPhotoErrorAuth: "請重新登入後再上傳照片。",
  rmPhotoErrorUnknown: "無法上傳照片，請再試一次。",
  rmPhotoUploadSuccessToast: "照片已上傳",
  rmPhotoFileInputAria: "選擇要上傳的照片",
  rmAutoFillAriaAnnounce: "AI 草稿已生成，請在儲存前審閱以下欄位。",

  rmFavoritesRailTitle: "最愛",
  rmSectionSpotlight: "金句聚光",
  rmSpotlightNextAria: "顯示另一則語錄",
  rmSortFavoritesFirst: "最愛優先",
  rmLinkedOpenInAria: "在「{area}」中開啟",
  rmEmptyTrySampleHint: "也可以試試輸入「居禮夫人」、「賈伯斯」或「Maya Angelou」，讓 AI 幫你補齊其餘內容。",
  rmEmptyTrySampleAction: "用 AI 試試看",

  rmDiscardChangesTitle: "要捨棄編輯內容嗎？",
  rmDiscardChangesDescription: "這位榜樣的變更尚未儲存，現在關閉將會遺失你目前的編輯。",
  rmDiscardKeepEditing: "繼續編輯",
  rmDiscardConfirm: "捨棄",
  rmFavoritesRailItemAria: "開啟「{name}」",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "全新人際關係相簿即將上線",
  relStubDescription:
    "我們正在把這個頁面改造成個人 CRM 相簿——含照片、最近聯繫追蹤、下一步行動與標籤。請稍後回來查看。",

  relFilterCategory: "分類",
  relFilterStrength: "關係強度",
  relFilterFavoritesOnly: "僅顯示收藏",
  relFilterAllCategories: "所有分類",
  relFilterAllStrengths: "所有強度",
  relFilterClear: "清除篩選",

  relCatProfessor: "教授",
  relCatClassmate: "同學",
  relCatCollaborator: "合作夥伴",
  relCatFriend: "朋友",
  relCatFamily: "家人",
  relCatMentor: "導師",
  relCatProfessionalContact: "專業聯繫人",
  relCatOther: "其他",

  relStrStrong: "緊密",
  relStrModerate: "普通",
  relStrWeak: "疏遠",
  relStrNew: "剛認識",

  relSortNameAZ: "姓名 (A–Z)",
  relSortLastContact: "最近聯繫",
  relSortFavoritesFirst: "收藏優先",

  relCardNeverContacted: "尚未聯繫",
  relCardNextAction: "下一步行動",
  relCardDueOn: "到期:{date}",
  relCardFavoriteAddAria: "將「{name}」加入收藏",
  relCardFavoriteRemoveAria: "將「{name}」從收藏移除",

  relFormSectionEssentials: "基本資訊",
  relFormSectionContact: "聯絡方式",
  relFormSectionInteraction: "互動紀錄",
  relFormSectionLongForm: "細節與筆記",
  relFormSectionMeta: "標籤與連結",

  relFieldPhoto: "照片",
  relFieldPhotoHint: "點擊上傳照片",
  relFieldName: "姓名",
  relFieldNamePlaceholder: "完整姓名",
  relFieldCategory: "分類",
  relFieldCategoryPlaceholder: "選擇分類",
  relFieldEmail: "電子郵件",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "電話",
  relFieldPhonePlaceholder: "+886 912 345 678",
  relFieldStrength: "關係強度",
  relFieldLastContact: "最近聯繫日期",
  relFieldLastInteractionNotes: "最近互動筆記",
  relFieldLastInteractionPlaceholder: "上次對話發生了什麼?",
  relFieldNextAction: "下一步行動",
  relFieldNextActionPlaceholder: "和這個人的下一個動作是什麼?",
  relFieldNextActionDate: "下一步日期",
  relFieldCommitments: "做過的承諾",
  relFieldCommitmentsPlaceholder: "你或對方答應了什麼?",
  relFieldPreferences: "偏好與細節",
  relFieldPreferencesPlaceholder: "生日、過敏、喜歡的咖啡……",
  relFieldGeneralNotes: "其他筆記",
  relFieldGeneralNotesPlaceholder: "任何值得記住的事",
  relFieldTags: "標籤",
  relFieldTagsPlaceholder: "讀書會、鋼琴社群、創業圈",
  relFieldTagsHint: "用逗號分隔。寫任何你之後可能會搜尋的字。",
  relFieldLinkedProject: "連結專案",
  relFieldLinkedProjectPlaceholder: "選擇專案",
  relFieldLinkedProjectNone: "不連結任何專案",
  relFieldFavorite: "標記為收藏",

  relSaveRelationship: "儲存",

  relDetailSectionContact: "聯絡方式",
  relDetailSectionLastContact: "最近聯繫",
  relDetailSectionLastInteraction: "最近互動筆記",
  relDetailSectionNextAction: "下一步行動",
  relDetailSectionCommitments: "做過的承諾",
  relDetailSectionPreferences: "偏好與細節",
  relDetailSectionGeneralNotes: "其他筆記",
  relDetailSectionTags: "標籤",
  relDetailSectionLinkedProject: "連結專案",

  relNoResultsTitle: "找不到符合的結果",
  relNoResultsDescription: "試著調整搜尋字或篩選條件。",

  relPhotoUploading: "上傳中……",
  relPhotoRemoveAria: "移除照片",
  relPhotoErrorWrongType: "不支援的檔案格式。請使用 JPG、PNG、WebP 或 GIF。",
  relPhotoErrorTooLarge: "圖片超過 5 MB 上限。",
  relPhotoErrorEmpty: "檔案似乎是空的。",
  relPhotoErrorAuth: "請先登入再上傳照片。",
  relPhotoErrorUnknown: "無法上傳照片,請稍後再試。",

  relDetailEdit: "編輯",
  relDetailDelete: "刪除",
  relDetailDeleteConfirmTitle: "刪除關係",
  relDetailDeleteConfirmDescription: "確定要從關係列表移除「{name}」嗎?此動作無法復原。",

  relLoading: "正在載入關係……",
  relLoadError: "無法載入你的關係資料。",
  relLoadErrorRetry: "重新載入",
};

const zhCN: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "人物",
  containerDescription: "塑造你人生的那些人 —— 你合作、学习、敬仰的对象。",
  tabsAriaLabel: "人物分页",
  tabRelationship: "人际关系",
  tabRoleModel: "榜样",

  cancel: "取消",
  save: "保存",
  saving: "保存中…",
  create: "创建",
  delete: "删除",
  edit: "编辑",
  search: "搜索…",

  relPageTitle: "人际关系",
  relPageDescription: "你合作与在意的人",
  relNew: "新增关系",
  relSearchPlaceholder: "搜索人物…",
  relTypeFilter: "类型",
  relTypePersonal: "个人",
  relTypeProfessional: "专业",
  relSortName: "名称",
  relSortRecentlyAdded: "最近添加",
  relEmptyTitle: "尚未添加任何人际关系",
  relEmptyDescNoResults: "尝试调整筛选或搜索",
  relEmptyDescNoEntries: "从添加一位对你重要的人开始 —— 导师、朋友、合作伙伴或家人。",
  relEmptyAction: "添加关系",
  relMetaProjectsOne: "1 个项目",
  relMetaProjectsOther: "{count} 个项目",
  relCreateTitle: "新增关系",
  relEditTitle: "编辑关系",
  relLabelName: "姓名 *",
  relLabelType: "类型",
  relLabelDescription: "描述",
  relLabelEmail: "电子邮件",
  relLabelPhone: "电话",
  relLabelOtherContact: "其他联系备注",
  relLabelLinkedProjects: "关联的项目",
  relSectionDescription: "描述",
  relSectionContact: "联系信息",
  relSectionLinkedProjects: "关联的项目",
  relUpdated: "更新于 {date}",
  relDeleteTitle: "删除关系",
  relDeleteDescription: "确定要移除「{name}」吗？此操作无法撤销。",

  rmPageTitle: "榜样",
  rmPageDescription: "你向他们学习的人物",
  rmAdd: "新增榜样",
  rmSearchPlaceholder: "搜索…",
  rmSortName: "名称",
  rmSortRecentlyAdded: "最近添加",
  rmEmptyTitle: "尚未添加任何榜样",
  rmEmptyDescNoResults: "尝试其他关键词",
  rmEmptyDescNoEntries: "把导师、领袖与启发你的人收藏在一处 —— 从一位深刻影响你思维的人开始。",
  rmEmptyAction: "添加一位",
  rmMetaLinks: "{count} 个关联",
  rmCreateTitle: "新增榜样",
  rmEditTitle: "编辑榜样",
  rmLabelName: "姓名 *",
  rmLabelImageUrl: "图片网址",
  rmLabelDescription: "描述",
  rmLabelProjects: "项目",
  rmLabelGoals: "目标",
  rmLabelNotes: "笔记",
  rmSectionDescription: "描述",
  rmSectionProjects: "项目",
  rmSectionGoals: "目标",
  rmSectionNotes: "笔记",
  rmUpdated: "更新于 {date}",
  rmDeleteTitle: "移除榜样",
  rmDeleteDescription: "确定要移除「{name}」吗？此操作无法撤销。",

  rmAutoFillSectionTitle: "AI 自动填写",
  rmAutoFillSectionHelp:
    "输入姓名后让 AI 为你收集生平、语录与启发。保存前你可以审阅并修改。",
  rmAutoFillCta: "用 AI 自动填写",
  rmAutoFillCtaRefresh: "重新生成",
  rmAutoFillResearching: "正在搜索网络…",
  rmAutoFillExtracting: "正在整理资料…",
  rmAutoFillSuccess: "草稿已生成 —— 请审阅以下字段",
  rmAutoFillError: "无法生成资料，请换个名字或手动填写。",
  rmAutoFillToastSuccess: "AI 草稿已生成，请审阅",
  rmAutoFillErrorMissingName: "请先输入姓名。",
  rmAutoFillErrorGeneric: "AI 生成失败，请再试一次。",
  rmAutoFillReviewBanner: "AI 生成草稿。保存前请核对语录与事实，可随意修改。",
  rmAutoFillMetaModel: "由 {model} 生成",
  rmAutoFillSwitchToManual: "跳过 —— 我自己填",

  rmFormSectionEssentials: "基本信息",
  rmFormSectionProfile: "个人简介",
  rmFormSectionWisdom: "智慧",
  rmFormSectionLinks: "参考链接",
  rmFormSectionPersonal: "个人笔记",

  rmLabelPhoto: "照片",
  rmLabelPhotoUrlPlaceholder: "https://… (图片网址)",
  rmLabelCategory: "领域",
  rmLabelCategoryPlaceholder: "选择或输入领域",
  rmLabelAdmirationBlurb: "敬佩他们的原因",
  rmLabelAdmirationBlurbPlaceholder: "用一句话描述吸引你的特质…",
  rmLabelBio: "生平",
  rmLabelBioPlaceholder: "他们是谁，又因何而闻名…",
  rmLabelQuotes: "语录",
  rmLabelQuotesEmpty: "尚未添加语录。添加一句来记住他们的声音。",
  rmLabelQuoteText: "引言",
  rmLabelQuoteSource: "出处（书籍、演讲、年份…）",
  rmLabelKeyLessons: "重要启发",
  rmLabelKeyLessonsEmpty: "你想带走的原则是什么？",
  rmLabelLessonTitle: "启发标题",
  rmLabelLessonDetail: "说明（选填）",
  rmLabelTags: "标签",
  rmLabelTagsPlaceholder: "输入标签后按 Enter",
  rmLabelTagsHelp: "建议使用小写单词（例如 perseverance）。",
  rmLabelLinks: "参考链接",
  rmLabelLinksEmpty: "添加维基百科、官方网站或喜爱的书籍链接。",
  rmLabelLinkLabel: "名称",
  rmLabelLinkUrl: "网址",
  rmLabelLinkKind: "类型",
  rmLabelNotesPersonal: "我的笔记",
  rmLabelNotesPersonalPlaceholder: "他们的人生对你而言意味着什么？只有你能看到…",
  rmLabelFavorite: "收藏",

  rmAddQuote: "新增语录",
  rmAddLesson: "新增启发",
  rmAddLink: "新增链接",
  rmRemove: "移除",

  rmSectionAdmirationBlurb: "敬佩的原因",
  rmSectionBio: "生平",
  rmSectionQuotes: "语录",
  rmSectionKeyLessons: "重要启发",
  rmSectionTags: "标签",
  rmSectionLinks: "参考链接",
  rmSectionPersonalNotes: "我的笔记",

  rmFilterAllCategories: "所有领域",
  rmFilterFavoritesOnly: "收藏",
  rmFilterClear: "清除筛选",

  rmCategoryPhilosopher: "哲学家",
  rmCategoryScientist: "科学家",
  rmCategoryEntrepreneur: "创业家",
  rmCategoryArtist: "艺术家",
  rmCategoryWriter: "作家",
  rmCategoryAthlete: "运动员",
  rmCategoryLeader: "领导者",
  rmCategoryEngineer: "工程师",
  rmCategoryDesigner: "设计师",
  rmCategoryMusician: "音乐家",
  rmCategoryActivist: "社会活动家",
  rmCategoryTeacher: "教师",
  rmCategoryExplorer: "探险家",
  rmCategorySpiritual: "灵性导师",
  rmCategoryOther: "其他",

  rmLinkKindWikipedia: "维基百科",
  rmLinkKindOfficial: "官方网站",
  rmLinkKindBook: "书籍",
  rmLinkKindArticle: "文章",
  rmLinkKindVideo: "视频",
  rmLinkKindPodcast: "播客",
  rmLinkKindSocial: "社交",
  rmLinkKindOther: "其他",

  rmFavoriteAddAria: "标记为收藏",
  rmFavoriteRemoveAria: "取消收藏",

  rmPhotoTabUpload: "上传",
  rmPhotoTabUrl: "图片网址",
  rmPhotoDropzoneIdle: "将照片拖到此处，或点击选择",
  rmPhotoDropzoneActive: "松开以上传照片",
  rmPhotoDropzoneHint: "JPG、PNG、WebP 或 GIF —— 最大 5 MB",
  rmPhotoDropzoneBrowse: "浏览文件",
  rmPhotoUploading: "正在上传照片…",
  rmPhotoErrorWrongType: "不支持此文件类型，请使用 JPG、PNG、WebP 或 GIF。",
  rmPhotoErrorTooLarge: "照片太大，请选择 5 MB 以下的文件。",
  rmPhotoErrorEmpty: "文件似乎是空的。",
  rmPhotoErrorAuth: "请重新登录后再上传照片。",
  rmPhotoErrorUnknown: "无法上传照片，请再试一次。",
  rmPhotoUploadSuccessToast: "照片已上传",
  rmPhotoFileInputAria: "选择要上传的照片",
  rmAutoFillAriaAnnounce: "AI 草稿已生成，请在保存前审阅以下字段。",

  rmFavoritesRailTitle: "收藏",
  rmSectionSpotlight: "金句聚光",
  rmSpotlightNextAria: "显示另一条语录",
  rmSortFavoritesFirst: "收藏优先",
  rmLinkedOpenInAria: "在「{area}」中打开",
  rmEmptyTrySampleHint: "也可以试试输入「居里夫人」「乔布斯」或「Maya Angelou」，让 AI 帮你补齐其余内容。",
  rmEmptyTrySampleAction: "用 AI 试一下",

  rmDiscardChangesTitle: "要放弃编辑内容吗？",
  rmDiscardChangesDescription: "这位榜样的更改尚未保存，现在关闭将会丢失当前编辑。",
  rmDiscardKeepEditing: "继续编辑",
  rmDiscardConfirm: "放弃",
  rmFavoritesRailItemAria: "打开「{name}」",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "全新人际关系相册即将上线",
  relStubDescription:
    "我们正在把这个页面重做成个人 CRM 相册——含照片、最近联系追踪、下一步行动与标签。请稍后回来查看。",

  relFilterCategory: "分类",
  relFilterStrength: "关系强度",
  relFilterFavoritesOnly: "仅显示收藏",
  relFilterAllCategories: "所有分类",
  relFilterAllStrengths: "所有强度",
  relFilterClear: "清除筛选",

  relCatProfessor: "教授",
  relCatClassmate: "同学",
  relCatCollaborator: "合作伙伴",
  relCatFriend: "朋友",
  relCatFamily: "家人",
  relCatMentor: "导师",
  relCatProfessionalContact: "专业联系人",
  relCatOther: "其他",

  relStrStrong: "紧密",
  relStrModerate: "一般",
  relStrWeak: "疏远",
  relStrNew: "刚认识",

  relSortNameAZ: "姓名 (A–Z)",
  relSortLastContact: "最近联系",
  relSortFavoritesFirst: "收藏优先",

  relCardNeverContacted: "尚未联系",
  relCardNextAction: "下一步行动",
  relCardDueOn: "到期: {date}",
  relCardFavoriteAddAria: "将「{name}」加入收藏",
  relCardFavoriteRemoveAria: "将「{name}」从收藏移除",

  relFormSectionEssentials: "基本信息",
  relFormSectionContact: "联系方式",
  relFormSectionInteraction: "互动记录",
  relFormSectionLongForm: "细节与笔记",
  relFormSectionMeta: "标签与关联",

  relFieldPhoto: "照片",
  relFieldPhotoHint: "点击上传照片",
  relFieldName: "姓名",
  relFieldNamePlaceholder: "完整姓名",
  relFieldCategory: "分类",
  relFieldCategoryPlaceholder: "选择分类",
  relFieldEmail: "电子邮件",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "电话",
  relFieldPhonePlaceholder: "+86 138 0013 8000",
  relFieldStrength: "关系强度",
  relFieldLastContact: "最近联系日期",
  relFieldLastInteractionNotes: "最近互动笔记",
  relFieldLastInteractionPlaceholder: "上次对话发生了什么？",
  relFieldNextAction: "下一步行动",
  relFieldNextActionPlaceholder: "和这个人下一步要做什么？",
  relFieldNextActionDate: "下一步日期",
  relFieldCommitments: "做过的承诺",
  relFieldCommitmentsPlaceholder: "你或对方答应了什么？",
  relFieldPreferences: "偏好与细节",
  relFieldPreferencesPlaceholder: "生日、过敏、爱喝的咖啡……",
  relFieldGeneralNotes: "其他笔记",
  relFieldGeneralNotesPlaceholder: "其他值得记住的事",
  relFieldTags: "标签",
  relFieldTagsPlaceholder: "读书会、钢琴圈、创业社群",
  relFieldTagsHint: "用逗号分隔。写任何你以后可能搜索的词。",
  relFieldLinkedProject: "关联项目",
  relFieldLinkedProjectPlaceholder: "选择项目",
  relFieldLinkedProjectNone: "不关联任何项目",
  relFieldFavorite: "标记为收藏",

  relSaveRelationship: "保存",

  relDetailSectionContact: "联系方式",
  relDetailSectionLastContact: "最近联系",
  relDetailSectionLastInteraction: "最近互动笔记",
  relDetailSectionNextAction: "下一步行动",
  relDetailSectionCommitments: "做过的承诺",
  relDetailSectionPreferences: "偏好与细节",
  relDetailSectionGeneralNotes: "其他笔记",
  relDetailSectionTags: "标签",
  relDetailSectionLinkedProject: "关联项目",

  relNoResultsTitle: "没有匹配的结果",
  relNoResultsDescription: "试着调整搜索词或筛选条件。",

  relPhotoUploading: "上传中……",
  relPhotoRemoveAria: "移除照片",
  relPhotoErrorWrongType: "不支持此文件格式。请使用 JPG、PNG、WebP 或 GIF。",
  relPhotoErrorTooLarge: "图片超过 5 MB 上限。",
  relPhotoErrorEmpty: "文件似乎是空的。",
  relPhotoErrorAuth: "请先登录再上传照片。",
  relPhotoErrorUnknown: "无法上传照片，请稍后再试。",

  relDetailEdit: "编辑",
  relDetailDelete: "删除",
  relDetailDeleteConfirmTitle: "删除关系",
  relDetailDeleteConfirmDescription: "确定要从关系列表移除「{name}」吗？此操作无法撤销。",

  relLoading: "正在加载关系……",
  relLoadError: "无法加载你的关系数据。",
  relLoadErrorRetry: "重新加载",
};

const ja: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "人々",
  containerDescription:
    "あなたの人生をかたちづくる人々 —— 共に働き、学び、敬う相手。",
  tabsAriaLabel: "人々セクション",
  tabRelationship: "人間関係",
  tabRoleModel: "ロールモデル",

  cancel: "キャンセル",
  save: "保存",
  saving: "保存中…",
  create: "作成",
  delete: "削除",
  edit: "編集",
  search: "検索…",

  relPageTitle: "人間関係",
  relPageDescription: "共に取り組み、大切に思う人々",
  relNew: "新しい関係",
  relSearchPlaceholder: "人を検索…",
  relTypeFilter: "タイプ",
  relTypePersonal: "個人",
  relTypeProfessional: "仕事",
  relSortName: "名前",
  relSortRecentlyAdded: "最近追加",
  relEmptyTitle: "まだ人間関係がありません",
  relEmptyAction: "関係を追加",
  rmPageTitle: "ロールモデル",
  rmAdd: "ロールモデルを追加",
  rmEmptyTitle: "まだロールモデルがありません",
  rmEmptyAction: "追加する",

  rmAutoFillSectionTitle: "AI 自動入力",
  rmAutoFillSectionHelp:
    "名前を入力すると AI が経歴・引用・学びを集めます。保存前に必ず確認できます。",
  rmAutoFillCta: "AI で自動入力",
  rmAutoFillCtaRefresh: "AI を再実行",
  rmAutoFillResearching: "ウェブを検索中…",
  rmAutoFillExtracting: "プロフィールを作成中…",
  rmAutoFillSuccess: "下書きが完成しました — 各項目を確認してください",
  rmAutoFillError: "プロフィールを生成できませんでした。別の名前で試すか手動で入力してください。",
  rmAutoFillToastSuccess: "AI の下書きが届きました",
  rmAutoFillErrorMissingName: "まず名前を入力してください。",
  rmAutoFillErrorGeneric: "AI 生成に失敗しました。もう一度お試しください。",
  rmAutoFillReviewBanner: "AI が下書きしました。引用や事実を確認し、保存前に編集できます。",
  rmAutoFillMetaModel: "{model} が生成",
  rmAutoFillSwitchToManual: "スキップ — 自分で入力します",

  rmFormSectionEssentials: "基本情報",
  rmFormSectionProfile: "プロフィール",
  rmFormSectionWisdom: "学び",
  rmFormSectionLinks: "リンクと参照",
  rmFormSectionPersonal: "メモ",

  rmLabelPhoto: "写真",
  rmLabelPhotoUrlPlaceholder: "https://… (画像 URL)",
  rmLabelCategory: "分野",
  rmLabelCategoryPlaceholder: "分野を選ぶか入力",
  rmLabelAdmirationBlurb: "尊敬する理由",
  rmLabelAdmirationBlurbPlaceholder: "魅力を一文で…",
  rmLabelBio: "経歴",
  rmLabelBioPlaceholder: "どんな人で何で知られているか…",
  rmLabelQuotes: "引用",
  rmLabelQuotesEmpty: "まだ引用がありません。声を覚えておくために追加しましょう。",
  rmLabelQuoteText: "引用",
  rmLabelQuoteSource: "出典（書籍・スピーチ・年）",
  rmLabelKeyLessons: "重要な学び",
  rmLabelKeyLessonsEmpty: "持ち帰りたい原則は何ですか？",
  rmLabelLessonTitle: "学びのタイトル",
  rmLabelLessonDetail: "詳細（任意）",
  rmLabelTags: "タグ",
  rmLabelTagsPlaceholder: "タグを入力して Enter",
  rmLabelTagsHelp: "小文字の単語が最適です（例: perseverance）。",
  rmLabelLinks: "参照リンク",
  rmLabelLinksEmpty: "Wikipedia、公式サイト、好きな書籍のリンクを追加。",
  rmLabelLinkLabel: "ラベル",
  rmLabelLinkUrl: "URL",
  rmLabelLinkKind: "種類",
  rmLabelNotesPersonal: "個人メモ",
  rmLabelNotesPersonalPlaceholder: "彼らの人生はあなたにとってどんな意味を持つ？",
  rmLabelFavorite: "お気に入り",

  rmAddQuote: "引用を追加",
  rmAddLesson: "学びを追加",
  rmAddLink: "リンクを追加",
  rmRemove: "削除",

  rmSectionAdmirationBlurb: "尊敬する理由",
  rmSectionBio: "経歴",
  rmSectionQuotes: "引用",
  rmSectionKeyLessons: "重要な学び",
  rmSectionTags: "タグ",
  rmSectionLinks: "参照リンク",
  rmSectionPersonalNotes: "個人メモ",

  rmFilterAllCategories: "すべての分野",
  rmFilterFavoritesOnly: "お気に入り",
  rmFilterClear: "フィルタを解除",

  rmCategoryPhilosopher: "哲学者",
  rmCategoryScientist: "科学者",
  rmCategoryEntrepreneur: "起業家",
  rmCategoryArtist: "芸術家",
  rmCategoryWriter: "作家",
  rmCategoryAthlete: "アスリート",
  rmCategoryLeader: "リーダー",
  rmCategoryEngineer: "エンジニア",
  rmCategoryDesigner: "デザイナー",
  rmCategoryMusician: "音楽家",
  rmCategoryActivist: "活動家",
  rmCategoryTeacher: "教師",
  rmCategoryExplorer: "探検家",
  rmCategorySpiritual: "精神的指導者",
  rmCategoryOther: "その他",

  rmLinkKindWikipedia: "Wikipedia",
  rmLinkKindOfficial: "公式サイト",
  rmLinkKindBook: "書籍",
  rmLinkKindArticle: "記事",
  rmLinkKindVideo: "動画",
  rmLinkKindPodcast: "ポッドキャスト",
  rmLinkKindSocial: "ソーシャル",
  rmLinkKindOther: "その他",

  rmFavoriteAddAria: "お気に入りに追加",
  rmFavoriteRemoveAria: "お気に入りから削除",

  rmPhotoTabUpload: "アップロード",
  rmPhotoTabUrl: "画像 URL",
  rmPhotoDropzoneIdle: "写真をここにドラッグ、またはクリックして選択",
  rmPhotoDropzoneActive: "ここにドロップしてアップロード",
  rmPhotoDropzoneHint: "JPG、PNG、WebP、GIF — 最大 5 MB",
  rmPhotoDropzoneBrowse: "ファイルを選択",
  rmPhotoUploading: "写真をアップロード中…",
  rmPhotoErrorWrongType:
    "このファイル形式はサポートされていません。JPG、PNG、WebP、GIF を使用してください。",
  rmPhotoErrorTooLarge: "写真が大きすぎます。5 MB 未満を選択してください。",
  rmPhotoErrorEmpty: "ファイルが空のようです。",
  rmPhotoErrorAuth: "写真をアップロードするには再ログインしてください。",
  rmPhotoErrorUnknown: "写真をアップロードできませんでした。もう一度お試しください。",
  rmPhotoUploadSuccessToast: "写真をアップロードしました",
  rmPhotoFileInputAria: "アップロードする写真を選択",
  rmAutoFillAriaAnnounce: "AI による下書きが完成しました。保存前に各項目をご確認ください。",

  rmFavoritesRailTitle: "お気に入り",
  rmSectionSpotlight: "今日の名言",
  rmSpotlightNextAria: "別の名言を表示",
  rmSortFavoritesFirst: "お気に入りを先頭に",
  rmLinkedOpenInAria: "「{area}」で開く",
  rmEmptyTrySampleHint:
    "キュリー夫人、スティーブ・ジョブズ、マヤ・アンジェロウ などの名前を入力すると、AI が残りを補完します。",
  rmEmptyTrySampleAction: "AI で試す",

  rmDiscardChangesTitle: "編集内容を破棄しますか？",
  rmDiscardChangesDescription: "このロールモデルの変更はまだ保存されていません。閉じると編集内容が失われます。",
  rmDiscardKeepEditing: "編集を続ける",
  rmDiscardConfirm: "破棄する",
  rmFavoritesRailItemAria: "「{name}」を開く",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "新しい人間関係ギャラリーを準備中",
  relStubDescription:
    "この画面は写真・最終連絡日の追跡・次のアクション・タグを備えたパーソナル CRM ギャラリーへ刷新中です。もう少しお待ちください。",

  relFilterCategory: "カテゴリ",
  relFilterStrength: "関係の強さ",
  relFilterFavoritesOnly: "お気に入りのみ",
  relFilterAllCategories: "すべてのカテゴリ",
  relFilterAllStrengths: "すべての強さ",
  relFilterClear: "フィルタを解除",

  relCatProfessor: "教授",
  relCatClassmate: "同級生",
  relCatCollaborator: "協力者",
  relCatFriend: "友人",
  relCatFamily: "家族",
  relCatMentor: "メンター",
  relCatProfessionalContact: "ビジネス関係者",
  relCatOther: "その他",

  relStrStrong: "親密",
  relStrModerate: "普通",
  relStrWeak: "希薄",
  relStrNew: "新しい",

  relSortNameAZ: "名前 (A–Z)",
  relSortLastContact: "最終連絡日",
  relSortFavoritesFirst: "お気に入りを先頭に",

  relCardNeverContacted: "未連絡",
  relCardNextAction: "次のアクション",
  relCardDueOn: "期限: {date}",
  relCardFavoriteAddAria: "「{name}」をお気に入りに追加",
  relCardFavoriteRemoveAria: "「{name}」をお気に入りから削除",

  relFormSectionEssentials: "基本情報",
  relFormSectionContact: "連絡先",
  relFormSectionInteraction: "やり取りの履歴",
  relFormSectionLongForm: "詳細とメモ",
  relFormSectionMeta: "タグとリンク",

  relFieldPhoto: "写真",
  relFieldPhotoHint: "クリックして写真をアップロード",
  relFieldName: "名前",
  relFieldNamePlaceholder: "氏名",
  relFieldCategory: "カテゴリ",
  relFieldCategoryPlaceholder: "カテゴリを選択",
  relFieldEmail: "メール",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "電話",
  relFieldPhonePlaceholder: "+81 90 1234 5678",
  relFieldStrength: "関係の強さ",
  relFieldLastContact: "最終連絡日",
  relFieldLastInteractionNotes: "前回のやり取りメモ",
  relFieldLastInteractionPlaceholder: "前回はどんな会話でしたか？",
  relFieldNextAction: "次のアクション",
  relFieldNextActionPlaceholder: "この人との次の一歩は？",
  relFieldNextActionDate: "次のアクションの予定日",
  relFieldCommitments: "交わした約束",
  relFieldCommitmentsPlaceholder: "あなたや相手は何を約束しましたか？",
  relFieldPreferences: "好みや詳細",
  relFieldPreferencesPlaceholder: "誕生日、アレルギー、好きなコーヒー…",
  relFieldGeneralNotes: "メモ",
  relFieldGeneralNotesPlaceholder: "覚えておきたいことなら何でも",
  relFieldTags: "タグ",
  relFieldTagsPlaceholder: "勉強会、ピアノコミュニティ、スタートアップ仲間",
  relFieldTagsHint: "カンマ区切り。あとで検索しそうな言葉を自由に。",
  relFieldLinkedProject: "関連プロジェクト",
  relFieldLinkedProjectPlaceholder: "プロジェクトを選択",
  relFieldLinkedProjectNone: "プロジェクトなし",
  relFieldFavorite: "お気に入りに登録",

  relSaveRelationship: "保存",

  relDetailSectionContact: "連絡先",
  relDetailSectionLastContact: "最終連絡",
  relDetailSectionLastInteraction: "前回のやり取り",
  relDetailSectionNextAction: "次のアクション",
  relDetailSectionCommitments: "交わした約束",
  relDetailSectionPreferences: "好みや詳細",
  relDetailSectionGeneralNotes: "メモ",
  relDetailSectionTags: "タグ",
  relDetailSectionLinkedProject: "関連プロジェクト",

  relNoResultsTitle: "該当する結果がありません",
  relNoResultsDescription: "検索語やフィルタを変更してみてください。",

  relPhotoUploading: "アップロード中…",
  relPhotoRemoveAria: "写真を削除",
  relPhotoErrorWrongType: "このファイル形式は使えません。JPG、PNG、WebP、GIF をご利用ください。",
  relPhotoErrorTooLarge: "画像が 5 MB の上限を超えています。",
  relPhotoErrorEmpty: "ファイルが空のようです。",
  relPhotoErrorAuth: "写真をアップロードするには再ログインしてください。",
  relPhotoErrorUnknown: "写真をアップロードできませんでした。少し時間をおいて再試行してください。",

  relDetailEdit: "編集",
  relDetailDelete: "削除",
  relDetailDeleteConfirmTitle: "関係を削除",
  relDetailDeleteConfirmDescription: "「{name}」を関係一覧から削除しますか？この操作は取り消せません。",

  relLoading: "関係を読み込み中…",
  relLoadError: "関係データを読み込めませんでした。",
  relLoadErrorRetry: "もう一度試す",
};

const ko: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "사람들",
  containerDescription:
    "당신의 삶을 만들어가는 사람들 —— 함께 일하고, 배우고, 존경하는 이들.",
  tabsAriaLabel: "사람들 섹션",
  tabRelationship: "관계",
  tabRoleModel: "롤모델",

  cancel: "취소",
  save: "저장",
  saving: "저장 중…",
  create: "생성",
  delete: "삭제",
  edit: "편집",
  search: "검색…",

  relPageTitle: "관계",
  relPageDescription: "함께하고 소중히 여기는 사람들",
  relNew: "새 관계",
  relSearchPlaceholder: "사람 검색…",
  relTypeFilter: "유형",
  relTypePersonal: "개인",
  relTypeProfessional: "업무",
  relSortName: "이름",
  relSortRecentlyAdded: "최근 추가",
  relEmptyTitle: "아직 관계가 없습니다",
  relEmptyAction: "관계 추가",
  rmPageTitle: "롤모델",
  rmAdd: "롤모델 추가",
  rmEmptyTitle: "아직 롤모델이 없습니다",
  rmEmptyAction: "추가하기",

  rmAutoFillSectionTitle: "AI 자동 채우기",
  rmAutoFillSectionHelp:
    "이름을 입력하면 AI가 약력·명언·교훈을 모아 드립니다. 저장 전에 모두 검토할 수 있어요.",
  rmAutoFillCta: "AI로 자동 채우기",
  rmAutoFillCtaRefresh: "다시 생성",
  rmAutoFillResearching: "웹에서 검색 중…",
  rmAutoFillExtracting: "프로필 정리 중…",
  rmAutoFillSuccess: "초안이 준비되었어요 — 아래 항목을 검토하세요",
  rmAutoFillError: "프로필을 만들 수 없습니다. 다른 이름으로 시도하거나 직접 입력해 주세요.",
  rmAutoFillToastSuccess: "AI 초안 준비 완료",
  rmAutoFillErrorMissingName: "먼저 이름을 입력하세요.",
  rmAutoFillErrorGeneric: "AI 생성에 실패했어요. 다시 시도해 주세요.",
  rmAutoFillReviewBanner: "AI 초안입니다. 인용과 사실을 확인한 뒤 저장 전에 자유롭게 수정하세요.",
  rmAutoFillMetaModel: "{model}이(가) 생성",
  rmAutoFillSwitchToManual: "건너뛰기 — 직접 입력할게요",

  rmFormSectionEssentials: "기본 정보",
  rmFormSectionProfile: "프로필",
  rmFormSectionWisdom: "지혜",
  rmFormSectionLinks: "링크와 자료",
  rmFormSectionPersonal: "개인 메모",

  rmLabelPhoto: "사진",
  rmLabelPhotoUrlPlaceholder: "https://… (이미지 URL)",
  rmLabelCategory: "분야",
  rmLabelCategoryPlaceholder: "분야를 선택하거나 입력",
  rmLabelAdmirationBlurb: "존경하는 이유",
  rmLabelAdmirationBlurbPlaceholder: "한 문장으로 이유를…",
  rmLabelBio: "약력",
  rmLabelBioPlaceholder: "어떤 사람이며 무엇으로 알려졌는지…",
  rmLabelQuotes: "명언",
  rmLabelQuotesEmpty: "아직 명언이 없습니다. 그들의 목소리를 기억할 한 마디를 추가하세요.",
  rmLabelQuoteText: "인용",
  rmLabelQuoteSource: "출처(책·연설·연도…)",
  rmLabelKeyLessons: "핵심 교훈",
  rmLabelKeyLessonsEmpty: "어떤 원칙을 마음에 새기고 싶으신가요?",
  rmLabelLessonTitle: "교훈 제목",
  rmLabelLessonDetail: "상세(선택)",
  rmLabelTags: "태그",
  rmLabelTagsPlaceholder: "태그 입력 후 Enter",
  rmLabelTagsHelp: "소문자 한 단어를 권장합니다(예: perseverance).",
  rmLabelLinks: "참고 링크",
  rmLabelLinksEmpty: "위키백과·공식 사이트·좋아하는 책의 링크를 추가하세요.",
  rmLabelLinkLabel: "이름",
  rmLabelLinkUrl: "URL",
  rmLabelLinkKind: "종류",
  rmLabelNotesPersonal: "내 메모",
  rmLabelNotesPersonalPlaceholder: "그들의 삶이 당신에게 어떤 의미인가요? 본인만 볼 수 있어요…",
  rmLabelFavorite: "즐겨찾기",

  rmAddQuote: "명언 추가",
  rmAddLesson: "교훈 추가",
  rmAddLink: "링크 추가",
  rmRemove: "삭제",

  rmSectionAdmirationBlurb: "존경하는 이유",
  rmSectionBio: "약력",
  rmSectionQuotes: "명언",
  rmSectionKeyLessons: "핵심 교훈",
  rmSectionTags: "태그",
  rmSectionLinks: "참고 링크",
  rmSectionPersonalNotes: "내 메모",

  rmFilterAllCategories: "모든 분야",
  rmFilterFavoritesOnly: "즐겨찾기",
  rmFilterClear: "필터 지우기",

  rmCategoryPhilosopher: "철학자",
  rmCategoryScientist: "과학자",
  rmCategoryEntrepreneur: "기업가",
  rmCategoryArtist: "예술가",
  rmCategoryWriter: "작가",
  rmCategoryAthlete: "운동선수",
  rmCategoryLeader: "리더",
  rmCategoryEngineer: "엔지니어",
  rmCategoryDesigner: "디자이너",
  rmCategoryMusician: "음악가",
  rmCategoryActivist: "활동가",
  rmCategoryTeacher: "교사",
  rmCategoryExplorer: "탐험가",
  rmCategorySpiritual: "영성 지도자",
  rmCategoryOther: "기타",

  rmLinkKindWikipedia: "위키백과",
  rmLinkKindOfficial: "공식 사이트",
  rmLinkKindBook: "도서",
  rmLinkKindArticle: "기사",
  rmLinkKindVideo: "영상",
  rmLinkKindPodcast: "팟캐스트",
  rmLinkKindSocial: "소셜",
  rmLinkKindOther: "기타",

  rmFavoriteAddAria: "즐겨찾기에 추가",
  rmFavoriteRemoveAria: "즐겨찾기에서 제거",

  rmPhotoTabUpload: "업로드",
  rmPhotoTabUrl: "이미지 URL",
  rmPhotoDropzoneIdle: "여기에 사진을 끌어다 놓거나 클릭하여 선택하세요",
  rmPhotoDropzoneActive: "여기에 놓아 업로드하세요",
  rmPhotoDropzoneHint: "JPG, PNG, WebP, GIF — 최대 5 MB",
  rmPhotoDropzoneBrowse: "파일 찾기",
  rmPhotoUploading: "사진 업로드 중…",
  rmPhotoErrorWrongType:
    "지원되지 않는 파일 형식입니다. JPG, PNG, WebP, GIF를 사용해 주세요.",
  rmPhotoErrorTooLarge: "사진이 너무 큽니다. 5 MB 이하로 선택해 주세요.",
  rmPhotoErrorEmpty: "파일이 비어 있습니다.",
  rmPhotoErrorAuth: "사진을 업로드하려면 다시 로그인해 주세요.",
  rmPhotoErrorUnknown: "사진을 업로드할 수 없습니다. 다시 시도해 주세요.",
  rmPhotoUploadSuccessToast: "사진이 업로드되었습니다",
  rmPhotoFileInputAria: "업로드할 사진 선택",
  rmAutoFillAriaAnnounce: "AI 초안이 준비되었습니다. 저장하기 전에 아래 항목을 검토해 주세요.",

  rmFavoritesRailTitle: "즐겨찾기",
  rmSectionSpotlight: "오늘의 한마디",
  rmSpotlightNextAria: "다른 명언 보기",
  rmSortFavoritesFirst: "즐겨찾기 먼저",
  rmLinkedOpenInAria: "「{area}」에서 열기",
  rmEmptyTrySampleHint:
    "마리 퀴리, 스티브 잡스, 마야 안젤루 같은 이름을 입력하면 AI가 나머지를 채워 줍니다.",
  rmEmptyTrySampleAction: "AI로 시도하기",

  rmDiscardChangesTitle: "변경사항을 취소할까요?",
  rmDiscardChangesDescription: "이 롤모델의 변경사항이 아직 저장되지 않았습니다. 지금 닫으면 편집 내용이 사라집니다.",
  rmDiscardKeepEditing: "계속 편집",
  rmDiscardConfirm: "취소",
  rmFavoritesRailItemAria: "「{name}」 열기",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "새로운 인간관계 갤러리가 곧 공개됩니다",
  relStubDescription:
    "이 화면을 사진·최근 연락 기록·다음 행동·태그를 갖춘 개인 CRM 갤러리로 다시 만들고 있어요. 잠시 후에 다시 확인해 주세요.",

  relFilterCategory: "분류",
  relFilterStrength: "관계 강도",
  relFilterFavoritesOnly: "즐겨찾기만",
  relFilterAllCategories: "모든 분류",
  relFilterAllStrengths: "모든 강도",
  relFilterClear: "필터 지우기",

  relCatProfessor: "교수",
  relCatClassmate: "동급생",
  relCatCollaborator: "협업자",
  relCatFriend: "친구",
  relCatFamily: "가족",
  relCatMentor: "멘토",
  relCatProfessionalContact: "비즈니스 인맥",
  relCatOther: "기타",

  relStrStrong: "긴밀",
  relStrModerate: "보통",
  relStrWeak: "소원",
  relStrNew: "새로 알게 됨",

  relSortNameAZ: "이름 (A–Z)",
  relSortLastContact: "최근 연락",
  relSortFavoritesFirst: "즐겨찾기 먼저",

  relCardNeverContacted: "연락한 적 없음",
  relCardNextAction: "다음 행동",
  relCardDueOn: "마감: {date}",
  relCardFavoriteAddAria: "「{name}」을(를) 즐겨찾기에 추가",
  relCardFavoriteRemoveAria: "「{name}」을(를) 즐겨찾기에서 제거",

  relFormSectionEssentials: "기본 정보",
  relFormSectionContact: "연락처",
  relFormSectionInteraction: "교류 기록",
  relFormSectionLongForm: "세부 사항과 메모",
  relFormSectionMeta: "태그와 링크",

  relFieldPhoto: "사진",
  relFieldPhotoHint: "클릭해서 사진 업로드",
  relFieldName: "이름",
  relFieldNamePlaceholder: "전체 이름",
  relFieldCategory: "분류",
  relFieldCategoryPlaceholder: "분류 선택",
  relFieldEmail: "이메일",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "전화",
  relFieldPhonePlaceholder: "+82 10-1234-5678",
  relFieldStrength: "관계 강도",
  relFieldLastContact: "최근 연락 날짜",
  relFieldLastInteractionNotes: "최근 대화 메모",
  relFieldLastInteractionPlaceholder: "지난 대화에서 어떤 일이 있었나요?",
  relFieldNextAction: "다음 행동",
  relFieldNextActionPlaceholder: "이 사람과의 다음 단계는 무엇인가요?",
  relFieldNextActionDate: "다음 행동 날짜",
  relFieldCommitments: "약속한 것",
  relFieldCommitmentsPlaceholder: "본인 또는 상대가 약속한 일은?",
  relFieldPreferences: "선호와 세부 사항",
  relFieldPreferencesPlaceholder: "생일, 알레르기, 좋아하는 커피…",
  relFieldGeneralNotes: "일반 메모",
  relFieldGeneralNotesPlaceholder: "기억해 두고 싶은 모든 것",
  relFieldTags: "태그",
  relFieldTagsPlaceholder: "스터디 모임, 피아노 커뮤니티, 스타트업 인맥",
  relFieldTagsHint: "쉼표로 구분하세요. 나중에 검색할 만한 단어를 자유롭게.",
  relFieldLinkedProject: "연결된 프로젝트",
  relFieldLinkedProjectPlaceholder: "프로젝트 선택",
  relFieldLinkedProjectNone: "프로젝트 없음",
  relFieldFavorite: "즐겨찾기로 등록",

  relSaveRelationship: "저장",

  relDetailSectionContact: "연락처",
  relDetailSectionLastContact: "최근 연락",
  relDetailSectionLastInteraction: "최근 대화 메모",
  relDetailSectionNextAction: "다음 행동",
  relDetailSectionCommitments: "약속한 것",
  relDetailSectionPreferences: "선호와 세부 사항",
  relDetailSectionGeneralNotes: "일반 메모",
  relDetailSectionTags: "태그",
  relDetailSectionLinkedProject: "연결된 프로젝트",

  relNoResultsTitle: "일치하는 결과가 없습니다",
  relNoResultsDescription: "검색어나 필터를 조정해 보세요.",

  relPhotoUploading: "업로드 중…",
  relPhotoRemoveAria: "사진 제거",
  relPhotoErrorWrongType: "지원되지 않는 파일 형식입니다. JPG, PNG, WebP, GIF를 사용해 주세요.",
  relPhotoErrorTooLarge: "이미지가 5 MB 한도를 초과했습니다.",
  relPhotoErrorEmpty: "파일이 비어 있는 것 같습니다.",
  relPhotoErrorAuth: "사진을 업로드하려면 다시 로그인해 주세요.",
  relPhotoErrorUnknown: "사진을 업로드할 수 없습니다. 잠시 후 다시 시도해 주세요.",

  relDetailEdit: "편집",
  relDetailDelete: "삭제",
  relDetailDeleteConfirmTitle: "관계 삭제",
  relDetailDeleteConfirmDescription: "관계 목록에서 「{name}」을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.",

  relLoading: "관계를 불러오는 중…",
  relLoadError: "관계 데이터를 불러올 수 없습니다.",
  relLoadErrorRetry: "다시 시도",
};

const fr: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "Personnes",
  containerDescription:
    "Les personnes qui façonnent votre vie — celles avec qui vous collaborez, apprenez et que vous admirez.",
  tabsAriaLabel: "Sections Personnes",
  tabRelationship: "Relations",
  tabRoleModel: "Modèle",

  cancel: "Annuler",
  save: "Enregistrer",
  saving: "Enregistrement…",
  create: "Créer",
  delete: "Supprimer",
  edit: "Modifier",
  search: "Rechercher…",

  relPageTitle: "Relations",
  relNew: "Nouvelle relation",
  relTypeFilter: "Type",
  relTypePersonal: "Personnel",
  relTypeProfessional: "Professionnel",
  relSortName: "Nom",
  relSortRecentlyAdded: "Récemment ajouté",
  relEmptyTitle: "Aucune relation pour le moment",
  relEmptyAction: "Ajouter une relation",
  rmPageTitle: "Modèles",
  rmAdd: "Ajouter un modèle",
  rmEmptyTitle: "Aucun modèle pour le moment",
  rmEmptyAction: "En ajouter un",

  rmAutoFillSectionTitle: "Remplissage automatique par IA",
  rmAutoFillSectionHelp:
    "Saisissez un nom, l'IA collecte la biographie, les citations et les leçons. Vous validerez avant l'enregistrement.",
  rmAutoFillCta: "Remplir avec l'IA",
  rmAutoFillCtaRefresh: "Relancer l'IA",
  rmAutoFillResearching: "Recherche sur le web…",
  rmAutoFillExtracting: "Rédaction du profil…",
  rmAutoFillSuccess: "Brouillon prêt — vérifiez les champs ci-dessous",
  rmAutoFillError: "Profil introuvable. Essayez un autre nom ou remplissez manuellement.",
  rmAutoFillToastSuccess: "Brouillon IA prêt à vérifier",
  rmAutoFillErrorMissingName: "Saisissez d'abord un nom.",
  rmAutoFillErrorGeneric: "Échec de l'IA. Veuillez réessayer.",
  rmAutoFillReviewBanner:
    "Brouillon généré par IA. Vérifiez les citations et les faits avant d'enregistrer.",
  rmAutoFillMetaModel: "Généré par {model}",
  rmAutoFillSwitchToManual: "Ignorer — je remplis moi-même",

  rmFormSectionEssentials: "Essentiel",
  rmFormSectionProfile: "Profil",
  rmFormSectionWisdom: "Sagesse",
  rmFormSectionLinks: "Liens et références",
  rmFormSectionPersonal: "Personnel",

  rmLabelPhoto: "Photo",
  rmLabelCategory: "Catégorie",
  rmLabelAdmirationBlurb: "Pourquoi je l'admire",
  rmLabelBio: "Biographie",
  rmLabelQuotes: "Citations",
  rmLabelKeyLessons: "Leçons clés",
  rmLabelTags: "Étiquettes",
  rmLabelLinks: "Liens",
  rmLabelNotesPersonal: "Mes notes",
  rmLabelFavorite: "Favori",

  rmAddQuote: "Ajouter une citation",
  rmAddLesson: "Ajouter une leçon",
  rmAddLink: "Ajouter un lien",
  rmRemove: "Supprimer",

  rmFilterAllCategories: "Toutes les catégories",
  rmFilterFavoritesOnly: "Favoris",
  rmFilterClear: "Effacer les filtres",

  rmCategoryPhilosopher: "Philosophe",
  rmCategoryScientist: "Scientifique",
  rmCategoryEntrepreneur: "Entrepreneur",
  rmCategoryArtist: "Artiste",
  rmCategoryWriter: "Écrivain",
  rmCategoryAthlete: "Athlète",
  rmCategoryLeader: "Leader",
  rmCategoryEngineer: "Ingénieur",
  rmCategoryDesigner: "Designer",
  rmCategoryMusician: "Musicien",
  rmCategoryActivist: "Militant",
  rmCategoryTeacher: "Enseignant",
  rmCategoryExplorer: "Explorateur",
  rmCategorySpiritual: "Spirituel",
  rmCategoryOther: "Autre",

  // Phase 3 — photo uploads & AI a11y
  rmPhotoTabUpload: "Téléverser",
  rmPhotoTabUrl: "URL de l'image",
  rmPhotoDropzoneIdle: "Glissez une photo ici, ou cliquez pour la choisir",
  rmPhotoDropzoneActive: "Déposez la photo pour la téléverser",
  rmPhotoDropzoneHint: "JPG, PNG, WebP ou GIF — jusqu'à 5 Mo",
  rmPhotoDropzoneBrowse: "Parcourir les fichiers",
  rmPhotoUploading: "Téléversement de la photo…",
  rmPhotoErrorWrongType: "Ce type de fichier n'est pas pris en charge. Utilisez JPG, PNG, WebP ou GIF.",
  rmPhotoErrorTooLarge: "Photo trop volumineuse. Choisissez un fichier de moins de 5 Mo.",
  rmPhotoErrorEmpty: "Ce fichier semble vide.",
  rmPhotoErrorAuth: "Veuillez vous reconnecter pour téléverser des photos.",
  rmPhotoErrorUnknown: "Impossible de téléverser la photo. Veuillez réessayer.",
  rmPhotoUploadSuccessToast: "Photo téléversée",
  rmPhotoFileInputAria: "Choisir une photo à téléverser",
  rmAutoFillAriaAnnounce: "Brouillon IA prêt. Vérifiez les champs ci-dessous avant d'enregistrer.",

  // Phase 4 — gallery polish
  rmFavoritesRailTitle: "Favoris",
  rmSectionSpotlight: "Citation à l'honneur",
  rmSpotlightNextAria: "Afficher une autre citation",
  rmSortFavoritesFirst: "Favoris d'abord",
  rmLinkedOpenInAria: "Ouvrir dans {area}",
  rmEmptyTrySampleHint: "Ou essayez un nom comme Marie Curie, Steve Jobs ou Maya Angelou — l'IA s'occupe du reste.",
  rmEmptyTrySampleAction: "Essayer avec l'IA",

  // Phase 5 — polish & QA
  rmDiscardChangesTitle: "Abandonner vos modifications ?",
  rmDiscardChangesDescription: "Ce modèle n'a pas encore été enregistré. Si vous fermez maintenant, vos modifications seront perdues.",
  rmDiscardKeepEditing: "Continuer la modification",
  rmDiscardConfirm: "Abandonner",
  rmFavoritesRailItemAria: "Ouvrir {name}",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "Une nouvelle galerie Relations arrive",
  relStubDescription:
    "Nous repensons cette vue en galerie type CRM personnel — photos, suivi des derniers contacts, prochaines actions et étiquettes. Revenez bientôt.",

  relFilterCategory: "Catégorie",
  relFilterStrength: "Force",
  relFilterFavoritesOnly: "Favoris uniquement",
  relFilterAllCategories: "Toutes les catégories",
  relFilterAllStrengths: "Toutes les forces",
  relFilterClear: "Effacer les filtres",

  relCatProfessor: "Professeur",
  relCatClassmate: "Camarade",
  relCatCollaborator: "Collaborateur",
  relCatFriend: "Ami",
  relCatFamily: "Famille",
  relCatMentor: "Mentor",
  relCatProfessionalContact: "Contact professionnel",
  relCatOther: "Autre",

  relStrStrong: "Forte",
  relStrModerate: "Modérée",
  relStrWeak: "Faible",
  relStrNew: "Nouvelle",

  relSortNameAZ: "Nom (A–Z)",
  relSortLastContact: "Dernier contact",
  relSortFavoritesFirst: "Favoris d'abord",

  relCardNeverContacted: "Jamais contacté",
  relCardNextAction: "Prochaine action",
  relCardDueOn: "Échéance : {date}",
  relCardFavoriteAddAria: "Ajouter {name} aux favoris",
  relCardFavoriteRemoveAria: "Retirer {name} des favoris",

  relFormSectionEssentials: "Essentiels",
  relFormSectionContact: "Contact",
  relFormSectionInteraction: "Historique des échanges",
  relFormSectionLongForm: "Contexte et notes",
  relFormSectionMeta: "Étiquettes et liens",

  relFieldPhoto: "Photo",
  relFieldPhotoHint: "Cliquez pour téléverser une photo",
  relFieldName: "Nom",
  relFieldNamePlaceholder: "Nom complet",
  relFieldCategory: "Catégorie",
  relFieldCategoryPlaceholder: "Choisissez une catégorie",
  relFieldEmail: "E-mail",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "Téléphone",
  relFieldPhonePlaceholder: "+33 6 12 34 56 78",
  relFieldStrength: "Force de la relation",
  relFieldLastContact: "Date du dernier contact",
  relFieldLastInteractionNotes: "Notes sur le dernier échange",
  relFieldLastInteractionPlaceholder: "Que s'est-il passé lors de votre dernière conversation ?",
  relFieldNextAction: "Prochaine action",
  relFieldNextActionPlaceholder: "Quelle est la prochaine étape avec cette personne ?",
  relFieldNextActionDate: "Date de la prochaine action",
  relFieldCommitments: "Engagements pris",
  relFieldCommitmentsPlaceholder: "Qu'avez-vous (ou cette personne) promis de faire ?",
  relFieldPreferences: "Préférences et détails",
  relFieldPreferencesPlaceholder: "Anniversaire, allergies, café préféré…",
  relFieldGeneralNotes: "Notes générales",
  relFieldGeneralNotesPlaceholder: "Tout ce qui mérite d'être retenu",
  relFieldTags: "Étiquettes",
  relFieldTagsPlaceholder: "club de lecture, communauté piano, réseau startup",
  relFieldTagsHint: "Séparées par des virgules. Utilisez les mots que vous chercherez plus tard.",
  relFieldLinkedProject: "Projet lié",
  relFieldLinkedProjectPlaceholder: "Choisissez un projet",
  relFieldLinkedProjectNone: "Aucun projet",
  relFieldFavorite: "Marquer comme favori",

  relSaveRelationship: "Enregistrer la relation",

  relDetailSectionContact: "Contact",
  relDetailSectionLastContact: "Dernier contact",
  relDetailSectionLastInteraction: "Notes sur le dernier échange",
  relDetailSectionNextAction: "Prochaine action",
  relDetailSectionCommitments: "Engagements pris",
  relDetailSectionPreferences: "Préférences et détails",
  relDetailSectionGeneralNotes: "Notes générales",
  relDetailSectionTags: "Étiquettes",
  relDetailSectionLinkedProject: "Projet lié",

  relNoResultsTitle: "Aucun résultat",
  relNoResultsDescription: "Essayez d'ajuster votre recherche ou vos filtres.",

  relPhotoUploading: "Téléversement…",
  relPhotoRemoveAria: "Supprimer la photo",
  relPhotoErrorWrongType: "Ce type de fichier n'est pas pris en charge. Essayez JPG, PNG, WebP ou GIF.",
  relPhotoErrorTooLarge: "Cette image dépasse la limite de 5 Mo.",
  relPhotoErrorEmpty: "Ce fichier semble vide.",
  relPhotoErrorAuth: "Vous devez être connecté pour téléverser une photo.",
  relPhotoErrorUnknown: "Impossible de téléverser la photo. Réessayez dans un instant.",

  relDetailEdit: "Modifier",
  relDetailDelete: "Supprimer",
  relDetailDeleteConfirmTitle: "Supprimer la relation",
  relDetailDeleteConfirmDescription: "Retirer « {name} » de vos relations ? Cette action est irréversible.",

  relLoading: "Chargement des relations…",
  relLoadError: "Impossible de charger vos relations.",
  relLoadErrorRetry: "Réessayer",
};

const it: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "Persone",
  containerDescription:
    "Le persone che plasmano la tua vita — quelle con cui collabori, da cui impari e che ammiri.",
  tabsAriaLabel: "Sezioni Persone",
  tabRelationship: "Relazioni",
  tabRoleModel: "Modello",

  cancel: "Annulla",
  save: "Salva",
  saving: "Salvataggio…",
  create: "Crea",
  delete: "Elimina",
  edit: "Modifica",
  search: "Cerca…",

  relPageTitle: "Relazioni",
  relNew: "Nuova relazione",
  relTypeFilter: "Tipo",
  relTypePersonal: "Personale",
  relTypeProfessional: "Professionale",
  relSortName: "Nome",
  relSortRecentlyAdded: "Aggiunto di recente",
  relEmptyTitle: "Nessuna relazione",
  relEmptyAction: "Aggiungi relazione",
  rmPageTitle: "Modelli",
  rmAdd: "Aggiungi modello",
  rmEmptyTitle: "Nessun modello",
  rmEmptyAction: "Aggiungine uno",

  rmAutoFillSectionTitle: "Compilazione automatica con IA",
  rmAutoFillSectionHelp:
    "Inserisci un nome: l'IA raccoglie biografia, citazioni e lezioni. Potrai rivedere tutto prima di salvare.",
  rmAutoFillCta: "Compila con l'IA",
  rmAutoFillCtaRefresh: "Rigenera con l'IA",
  rmAutoFillResearching: "Ricerca sul web…",
  rmAutoFillExtracting: "Stesura del profilo…",
  rmAutoFillSuccess: "Bozza pronta — controlla i campi qui sotto",
  rmAutoFillError: "Profilo non generato. Prova un altro nome o compila manualmente.",
  rmAutoFillToastSuccess: "Bozza IA pronta da rivedere",
  rmAutoFillErrorMissingName: "Inserisci prima un nome.",
  rmAutoFillErrorGeneric: "Generazione IA non riuscita. Riprova.",
  rmAutoFillReviewBanner:
    "Bozza generata dall'IA. Verifica citazioni e fatti prima di salvare.",
  rmAutoFillMetaModel: "Generato da {model}",
  rmAutoFillSwitchToManual: "Salta — compilo io",

  rmFormSectionEssentials: "Essenziali",
  rmFormSectionProfile: "Profilo",
  rmFormSectionWisdom: "Saggezza",
  rmFormSectionLinks: "Link e riferimenti",
  rmFormSectionPersonal: "Personale",

  rmLabelPhoto: "Foto",
  rmLabelCategory: "Categoria",
  rmLabelAdmirationBlurb: "Perché lo ammiro",
  rmLabelBio: "Biografia",
  rmLabelQuotes: "Citazioni",
  rmLabelKeyLessons: "Lezioni chiave",
  rmLabelTags: "Tag",
  rmLabelLinks: "Link",
  rmLabelNotesPersonal: "Le mie note",
  rmLabelFavorite: "Preferito",

  rmAddQuote: "Aggiungi citazione",
  rmAddLesson: "Aggiungi lezione",
  rmAddLink: "Aggiungi link",
  rmRemove: "Rimuovi",

  rmFilterAllCategories: "Tutte le categorie",
  rmFilterFavoritesOnly: "Preferiti",
  rmFilterClear: "Cancella filtri",

  rmCategoryPhilosopher: "Filosofo",
  rmCategoryScientist: "Scienziato",
  rmCategoryEntrepreneur: "Imprenditore",
  rmCategoryArtist: "Artista",
  rmCategoryWriter: "Scrittore",
  rmCategoryAthlete: "Atleta",
  rmCategoryLeader: "Leader",
  rmCategoryEngineer: "Ingegnere",
  rmCategoryDesigner: "Designer",
  rmCategoryMusician: "Musicista",
  rmCategoryActivist: "Attivista",
  rmCategoryTeacher: "Insegnante",
  rmCategoryExplorer: "Esploratore",
  rmCategorySpiritual: "Spirituale",
  rmCategoryOther: "Altro",

  // Phase 3 — caricamento foto e accessibilità AI
  rmPhotoTabUpload: "Carica",
  rmPhotoTabUrl: "URL immagine",
  rmPhotoDropzoneIdle: "Trascina qui una foto, oppure clicca per sceglierla",
  rmPhotoDropzoneActive: "Rilascia la foto per caricarla",
  rmPhotoDropzoneHint: "JPG, PNG, WebP o GIF — fino a 5 MB",
  rmPhotoDropzoneBrowse: "Sfoglia i file",
  rmPhotoUploading: "Caricamento in corso…",
  rmPhotoErrorWrongType: "Questo tipo di file non è supportato. Usa JPG, PNG, WebP o GIF.",
  rmPhotoErrorTooLarge: "La foto è troppo grande. Scegli un file inferiore a 5 MB.",
  rmPhotoErrorEmpty: "Il file sembra essere vuoto.",
  rmPhotoErrorAuth: "Accedi di nuovo per caricare le foto.",
  rmPhotoErrorUnknown: "Impossibile caricare la foto. Riprova.",
  rmPhotoUploadSuccessToast: "Foto caricata",
  rmPhotoFileInputAria: "Scegli una foto da caricare",
  rmAutoFillAriaAnnounce: "Bozza AI pronta. Controlla i campi qui sotto prima di salvare.",

  // Phase 4 — rifinitura galleria
  rmFavoritesRailTitle: "Preferiti",
  rmSectionSpotlight: "Citazione in evidenza",
  rmSpotlightNextAria: "Mostra un'altra citazione",
  rmSortFavoritesFirst: "Prima i preferiti",
  rmLinkedOpenInAria: "Apri in {area}",
  rmEmptyTrySampleHint: "Oppure prova con un nome come Marie Curie, Steve Jobs o Maya Angelou — al resto pensa l'AI.",
  rmEmptyTrySampleAction: "Prova con l'AI",

  // Phase 5 — rifinitura e QA
  rmDiscardChangesTitle: "Annullare le modifiche?",
  rmDiscardChangesDescription: "Questo modello non è ancora stato salvato. Chiudendo ora perderai le modifiche.",
  rmDiscardKeepEditing: "Continua a modificare",
  rmDiscardConfirm: "Annulla",
  rmFavoritesRailItemAria: "Apri {name}",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "Sta arrivando una nuova galleria Relazioni",
  relStubDescription:
    "Stiamo trasformando questa schermata in una galleria CRM personale — con foto, ultimo contatto, prossime azioni e tag. Torna tra poco.",

  relFilterCategory: "Categoria",
  relFilterStrength: "Forza",
  relFilterFavoritesOnly: "Solo preferiti",
  relFilterAllCategories: "Tutte le categorie",
  relFilterAllStrengths: "Tutte le forze",
  relFilterClear: "Cancella filtri",

  relCatProfessor: "Professore",
  relCatClassmate: "Compagno",
  relCatCollaborator: "Collaboratore",
  relCatFriend: "Amico",
  relCatFamily: "Famiglia",
  relCatMentor: "Mentore",
  relCatProfessionalContact: "Contatto professionale",
  relCatOther: "Altro",

  relStrStrong: "Forte",
  relStrModerate: "Moderata",
  relStrWeak: "Debole",
  relStrNew: "Nuova",

  relSortNameAZ: "Nome (A–Z)",
  relSortLastContact: "Ultimo contatto",
  relSortFavoritesFirst: "Prima i preferiti",

  relCardNeverContacted: "Mai contattato",
  relCardNextAction: "Prossima azione",
  relCardDueOn: "Scadenza: {date}",
  relCardFavoriteAddAria: "Aggiungi {name} ai preferiti",
  relCardFavoriteRemoveAria: "Rimuovi {name} dai preferiti",

  relFormSectionEssentials: "Essenziali",
  relFormSectionContact: "Contatti",
  relFormSectionInteraction: "Storico interazioni",
  relFormSectionLongForm: "Contesto e note",
  relFormSectionMeta: "Tag e collegamenti",

  relFieldPhoto: "Foto",
  relFieldPhotoHint: "Clicca per caricare una foto",
  relFieldName: "Nome",
  relFieldNamePlaceholder: "Nome completo",
  relFieldCategory: "Categoria",
  relFieldCategoryPlaceholder: "Seleziona una categoria",
  relFieldEmail: "Email",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "Telefono",
  relFieldPhonePlaceholder: "+39 333 123 4567",
  relFieldStrength: "Forza della relazione",
  relFieldLastContact: "Data ultimo contatto",
  relFieldLastInteractionNotes: "Note sull'ultima interazione",
  relFieldLastInteractionPlaceholder: "Cos'è successo nell'ultima conversazione?",
  relFieldNextAction: "Prossima azione",
  relFieldNextActionPlaceholder: "Qual è il prossimo passo con questa persona?",
  relFieldNextActionDate: "Data della prossima azione",
  relFieldCommitments: "Impegni presi",
  relFieldCommitmentsPlaceholder: "Cosa hai promesso (o cosa ti hanno promesso)?",
  relFieldPreferences: "Preferenze e dettagli",
  relFieldPreferencesPlaceholder: "Compleanno, allergie, caffè preferito…",
  relFieldGeneralNotes: "Note generali",
  relFieldGeneralNotesPlaceholder: "Qualsiasi cosa valga la pena ricordare",
  relFieldTags: "Tag",
  relFieldTagsPlaceholder: "gruppo di studio, comunità pianoforte, rete startup",
  relFieldTagsHint: "Separati da virgole. Usa parole che cercheresti in seguito.",
  relFieldLinkedProject: "Progetto collegato",
  relFieldLinkedProjectPlaceholder: "Seleziona un progetto",
  relFieldLinkedProjectNone: "Nessun progetto",
  relFieldFavorite: "Segna come preferito",

  relSaveRelationship: "Salva relazione",

  relDetailSectionContact: "Contatti",
  relDetailSectionLastContact: "Ultimo contatto",
  relDetailSectionLastInteraction: "Note sull'ultima interazione",
  relDetailSectionNextAction: "Prossima azione",
  relDetailSectionCommitments: "Impegni presi",
  relDetailSectionPreferences: "Preferenze e dettagli",
  relDetailSectionGeneralNotes: "Note generali",
  relDetailSectionTags: "Tag",
  relDetailSectionLinkedProject: "Progetto collegato",

  relNoResultsTitle: "Nessun risultato",
  relNoResultsDescription: "Prova a modificare la ricerca o i filtri.",

  relPhotoUploading: "Caricamento…",
  relPhotoRemoveAria: "Rimuovi foto",
  relPhotoErrorWrongType: "Tipo di file non supportato. Prova JPG, PNG, WebP o GIF.",
  relPhotoErrorTooLarge: "L'immagine supera il limite di 5 MB.",
  relPhotoErrorEmpty: "Il file sembra essere vuoto.",
  relPhotoErrorAuth: "Devi accedere per caricare una foto.",
  relPhotoErrorUnknown: "Impossibile caricare la foto. Riprova tra poco.",

  relDetailEdit: "Modifica",
  relDetailDelete: "Elimina",
  relDetailDeleteConfirmTitle: "Elimina relazione",
  relDetailDeleteConfirmDescription: "Rimuovere «{name}» dalle tue relazioni? L'operazione non è reversibile.",

  relLoading: "Caricamento delle relazioni…",
  relLoadError: "Impossibile caricare le tue relazioni.",
  relLoadErrorRetry: "Riprova",
};

const es: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "Personas",
  containerDescription:
    "Las personas que dan forma a tu vida — con quienes colaboras, aprendes y a quienes admiras.",
  tabsAriaLabel: "Secciones Personas",
  tabRelationship: "Relaciones",
  tabRoleModel: "Modelo",

  cancel: "Cancelar",
  save: "Guardar",
  saving: "Guardando…",
  create: "Crear",
  delete: "Eliminar",
  edit: "Editar",
  search: "Buscar…",

  relPageTitle: "Relaciones",
  relNew: "Nueva relación",
  relTypeFilter: "Tipo",
  relTypePersonal: "Personal",
  relTypeProfessional: "Profesional",
  relSortName: "Nombre",
  relSortRecentlyAdded: "Añadido recientemente",
  relEmptyTitle: "Aún no hay relaciones",
  relEmptyAction: "Añadir relación",
  rmPageTitle: "Modelos a seguir",
  rmAdd: "Añadir modelo",
  rmEmptyTitle: "Aún no hay modelos",
  rmEmptyAction: "Añadir uno",

  rmAutoFillSectionTitle: "Autocompletar con IA",
  rmAutoFillSectionHelp:
    "Escribe un nombre y la IA recopilará la biografía, citas y lecciones. Podrás revisar todo antes de guardar.",
  rmAutoFillCta: "Completar con IA",
  rmAutoFillCtaRefresh: "Volver a generar",
  rmAutoFillResearching: "Buscando en la web…",
  rmAutoFillExtracting: "Redactando el perfil…",
  rmAutoFillSuccess: "Borrador listo — revisa los campos abajo",
  rmAutoFillError: "No se pudo generar. Prueba con otro nombre o complétalo manualmente.",
  rmAutoFillToastSuccess: "Borrador IA listo para revisar",
  rmAutoFillErrorMissingName: "Introduce primero un nombre.",
  rmAutoFillErrorGeneric: "La IA falló. Inténtalo de nuevo.",
  rmAutoFillReviewBanner:
    "Borrador generado por IA. Verifica citas y datos antes de guardar.",
  rmAutoFillMetaModel: "Generado por {model}",
  rmAutoFillSwitchToManual: "Omitir — lo completo yo",

  rmFormSectionEssentials: "Esenciales",
  rmFormSectionProfile: "Perfil",
  rmFormSectionWisdom: "Sabiduría",
  rmFormSectionLinks: "Enlaces y referencias",
  rmFormSectionPersonal: "Personal",

  rmLabelPhoto: "Foto",
  rmLabelCategory: "Categoría",
  rmLabelAdmirationBlurb: "Por qué la admiro",
  rmLabelBio: "Biografía",
  rmLabelQuotes: "Citas",
  rmLabelKeyLessons: "Lecciones clave",
  rmLabelTags: "Etiquetas",
  rmLabelLinks: "Enlaces",
  rmLabelNotesPersonal: "Mis notas",
  rmLabelFavorite: "Favorito",

  rmAddQuote: "Añadir cita",
  rmAddLesson: "Añadir lección",
  rmAddLink: "Añadir enlace",
  rmRemove: "Quitar",

  rmFilterAllCategories: "Todas las categorías",
  rmFilterFavoritesOnly: "Favoritos",
  rmFilterClear: "Limpiar filtros",

  rmCategoryPhilosopher: "Filósofo",
  rmCategoryScientist: "Científico",
  rmCategoryEntrepreneur: "Emprendedor",
  rmCategoryArtist: "Artista",
  rmCategoryWriter: "Escritor",
  rmCategoryAthlete: "Atleta",
  rmCategoryLeader: "Líder",
  rmCategoryEngineer: "Ingeniero",
  rmCategoryDesigner: "Diseñador",
  rmCategoryMusician: "Músico",
  rmCategoryActivist: "Activista",
  rmCategoryTeacher: "Docente",
  rmCategoryExplorer: "Explorador",
  rmCategorySpiritual: "Espiritual",
  rmCategoryOther: "Otro",

  // Phase 3 — carga de fotos y accesibilidad de IA
  rmPhotoTabUpload: "Subir",
  rmPhotoTabUrl: "URL de la imagen",
  rmPhotoDropzoneIdle: "Arrastra una foto aquí o haz clic para elegir una",
  rmPhotoDropzoneActive: "Suelta la foto para subirla",
  rmPhotoDropzoneHint: "JPG, PNG, WebP o GIF — hasta 5 MB",
  rmPhotoDropzoneBrowse: "Buscar archivos",
  rmPhotoUploading: "Subiendo foto…",
  rmPhotoErrorWrongType: "Ese tipo de archivo no es compatible. Usa JPG, PNG, WebP o GIF.",
  rmPhotoErrorTooLarge: "La foto es demasiado grande. Elige un archivo menor a 5 MB.",
  rmPhotoErrorEmpty: "El archivo parece estar vacío.",
  rmPhotoErrorAuth: "Inicia sesión de nuevo para subir fotos.",
  rmPhotoErrorUnknown: "No se pudo subir la foto. Inténtalo de nuevo.",
  rmPhotoUploadSuccessToast: "Foto subida",
  rmPhotoFileInputAria: "Elegir una foto para subir",
  rmAutoFillAriaAnnounce: "Borrador de IA listo. Revisa los campos antes de guardar.",

  // Phase 4 — pulido de la galería
  rmFavoritesRailTitle: "Favoritos",
  rmSectionSpotlight: "Cita destacada",
  rmSpotlightNextAria: "Mostrar otra cita",
  rmSortFavoritesFirst: "Favoritos primero",
  rmLinkedOpenInAria: "Abrir en {area}",
  rmEmptyTrySampleHint: "O prueba con un nombre como Marie Curie, Steve Jobs o Maya Angelou — la IA hará el resto.",
  rmEmptyTrySampleAction: "Probar con IA",

  // Phase 5 — pulido y control de calidad
  rmDiscardChangesTitle: "¿Descartar tus cambios?",
  rmDiscardChangesDescription: "Aún no has guardado este referente. Si cierras ahora, se perderán tus cambios.",
  rmDiscardKeepEditing: "Seguir editando",
  rmDiscardConfirm: "Descartar",
  rmFavoritesRailItemAria: "Abrir {name}",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "Próximamente: una nueva galería de Relaciones",
  relStubDescription:
    "Estamos rediseñando esta vista como una galería tipo CRM personal — con fotos, seguimiento del último contacto, próximas acciones y etiquetas. Vuelve en un momento.",

  relFilterCategory: "Categoría",
  relFilterStrength: "Fortaleza",
  relFilterFavoritesOnly: "Solo favoritos",
  relFilterAllCategories: "Todas las categorías",
  relFilterAllStrengths: "Todas las fortalezas",
  relFilterClear: "Limpiar filtros",

  relCatProfessor: "Profesor",
  relCatClassmate: "Compañero de clase",
  relCatCollaborator: "Colaborador",
  relCatFriend: "Amigo",
  relCatFamily: "Familia",
  relCatMentor: "Mentor",
  relCatProfessionalContact: "Contacto profesional",
  relCatOther: "Otro",

  relStrStrong: "Fuerte",
  relStrModerate: "Moderada",
  relStrWeak: "Débil",
  relStrNew: "Nueva",

  relSortNameAZ: "Nombre (A–Z)",
  relSortLastContact: "Último contacto",
  relSortFavoritesFirst: "Favoritos primero",

  relCardNeverContacted: "Nunca contactado",
  relCardNextAction: "Próxima acción",
  relCardDueOn: "Vence: {date}",
  relCardFavoriteAddAria: "Añadir a {name} a favoritos",
  relCardFavoriteRemoveAria: "Quitar a {name} de favoritos",

  relFormSectionEssentials: "Esenciales",
  relFormSectionContact: "Contacto",
  relFormSectionInteraction: "Historial de interacciones",
  relFormSectionLongForm: "Contexto y notas",
  relFormSectionMeta: "Etiquetas y enlaces",

  relFieldPhoto: "Foto",
  relFieldPhotoHint: "Haz clic para subir una foto",
  relFieldName: "Nombre",
  relFieldNamePlaceholder: "Nombre completo",
  relFieldCategory: "Categoría",
  relFieldCategoryPlaceholder: "Selecciona una categoría",
  relFieldEmail: "Correo electrónico",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "Teléfono",
  relFieldPhonePlaceholder: "+34 612 345 678",
  relFieldStrength: "Fortaleza de la relación",
  relFieldLastContact: "Fecha del último contacto",
  relFieldLastInteractionNotes: "Notas de la última interacción",
  relFieldLastInteractionPlaceholder: "¿Qué pasó en tu última conversación?",
  relFieldNextAction: "Próxima acción",
  relFieldNextActionPlaceholder: "¿Cuál es el siguiente paso con esta persona?",
  relFieldNextActionDate: "Fecha de la próxima acción",
  relFieldCommitments: "Compromisos asumidos",
  relFieldCommitmentsPlaceholder: "¿Qué prometiste tú (o esta persona)?",
  relFieldPreferences: "Preferencias y detalles",
  relFieldPreferencesPlaceholder: "Cumpleaños, alergias, café favorito…",
  relFieldGeneralNotes: "Notas generales",
  relFieldGeneralNotesPlaceholder: "Cualquier cosa que valga la pena recordar",
  relFieldTags: "Etiquetas",
  relFieldTagsPlaceholder: "club de lectura, comunidad de piano, red de startups",
  relFieldTagsHint: "Separadas por comas. Usa palabras que buscarías más adelante.",
  relFieldLinkedProject: "Proyecto vinculado",
  relFieldLinkedProjectPlaceholder: "Selecciona un proyecto",
  relFieldLinkedProjectNone: "Sin proyecto",
  relFieldFavorite: "Marcar como favorito",

  relSaveRelationship: "Guardar relación",

  relDetailSectionContact: "Contacto",
  relDetailSectionLastContact: "Último contacto",
  relDetailSectionLastInteraction: "Notas de la última interacción",
  relDetailSectionNextAction: "Próxima acción",
  relDetailSectionCommitments: "Compromisos asumidos",
  relDetailSectionPreferences: "Preferencias y detalles",
  relDetailSectionGeneralNotes: "Notas generales",
  relDetailSectionTags: "Etiquetas",
  relDetailSectionLinkedProject: "Proyecto vinculado",

  relNoResultsTitle: "Sin resultados",
  relNoResultsDescription: "Prueba a ajustar la búsqueda o los filtros.",

  relPhotoUploading: "Subiendo…",
  relPhotoRemoveAria: "Eliminar foto",
  relPhotoErrorWrongType: "Ese tipo de archivo no es compatible. Prueba JPG, PNG, WebP o GIF.",
  relPhotoErrorTooLarge: "La imagen supera el límite de 5 MB.",
  relPhotoErrorEmpty: "El archivo parece estar vacío.",
  relPhotoErrorAuth: "Inicia sesión para subir una foto.",
  relPhotoErrorUnknown: "No se pudo subir la foto. Inténtalo en un momento.",

  relDetailEdit: "Editar",
  relDetailDelete: "Eliminar",
  relDetailDeleteConfirmTitle: "Eliminar relación",
  relDetailDeleteConfirmDescription: "¿Quitar a «{name}» de tus relaciones? Esta acción no se puede deshacer.",

  relLoading: "Cargando relaciones…",
  relLoadError: "No se pudieron cargar tus relaciones.",
  relLoadErrorRetry: "Reintentar",
};

const vi: DeepPartial<RelationshipUiCopy> = {
  containerTitle: "Người",
  containerDescription:
    "Những người định hình cuộc đời bạn — người bạn cộng tác, học hỏi và ngưỡng mộ.",
  tabsAriaLabel: "Các mục Người",
  tabRelationship: "Mối quan hệ",
  tabRoleModel: "Hình mẫu",

  cancel: "Huỷ",
  save: "Lưu",
  saving: "Đang lưu…",
  create: "Tạo",
  delete: "Xoá",
  edit: "Sửa",
  search: "Tìm kiếm…",

  relPageTitle: "Mối quan hệ",
  relNew: "Quan hệ mới",
  relTypeFilter: "Loại",
  relTypePersonal: "Cá nhân",
  relTypeProfessional: "Công việc",
  relSortName: "Tên",
  relSortRecentlyAdded: "Mới thêm",
  relEmptyTitle: "Chưa có mối quan hệ nào",
  relEmptyAction: "Thêm quan hệ",
  rmPageTitle: "Hình mẫu",
  rmAdd: "Thêm hình mẫu",
  rmEmptyTitle: "Chưa có hình mẫu nào",
  rmEmptyAction: "Thêm một",

  rmAutoFillSectionTitle: "Tự động điền bằng AI",
  rmAutoFillSectionHelp:
    "Nhập tên và để AI thu thập tiểu sử, trích dẫn, bài học. Bạn sẽ xem lại trước khi lưu.",
  rmAutoFillCta: "Tự động điền bằng AI",
  rmAutoFillCtaRefresh: "Chạy lại AI",
  rmAutoFillResearching: "Đang tìm trên web…",
  rmAutoFillExtracting: "Đang soạn hồ sơ…",
  rmAutoFillSuccess: "Bản nháp đã sẵn — hãy xem lại các trường bên dưới",
  rmAutoFillError: "Không thể tạo hồ sơ. Hãy thử tên khác hoặc nhập tay.",
  rmAutoFillToastSuccess: "Bản nháp AI đã sẵn để xem lại",
  rmAutoFillErrorMissingName: "Vui lòng nhập tên trước.",
  rmAutoFillErrorGeneric: "AI tạo nội dung thất bại. Hãy thử lại.",
  rmAutoFillReviewBanner: "Bản nháp do AI tạo. Hãy kiểm tra trích dẫn và dữ liệu trước khi lưu.",
  rmAutoFillMetaModel: "Tạo bởi {model}",
  rmAutoFillSwitchToManual: "Bỏ qua — tôi tự điền",

  rmFormSectionEssentials: "Cơ bản",
  rmFormSectionProfile: "Hồ sơ",
  rmFormSectionWisdom: "Tri thức",
  rmFormSectionLinks: "Liên kết & tham chiếu",
  rmFormSectionPersonal: "Cá nhân",

  rmLabelPhoto: "Ảnh",
  rmLabelCategory: "Lĩnh vực",
  rmLabelAdmirationBlurb: "Lý do tôi ngưỡng mộ",
  rmLabelBio: "Tiểu sử",
  rmLabelQuotes: "Trích dẫn",
  rmLabelKeyLessons: "Bài học chính",
  rmLabelTags: "Thẻ",
  rmLabelLinks: "Liên kết",
  rmLabelNotesPersonal: "Ghi chú riêng",
  rmLabelFavorite: "Yêu thích",

  rmAddQuote: "Thêm trích dẫn",
  rmAddLesson: "Thêm bài học",
  rmAddLink: "Thêm liên kết",
  rmRemove: "Xoá",

  rmFilterAllCategories: "Tất cả lĩnh vực",
  rmFilterFavoritesOnly: "Yêu thích",
  rmFilterClear: "Xoá bộ lọc",

  rmCategoryPhilosopher: "Triết gia",
  rmCategoryScientist: "Nhà khoa học",
  rmCategoryEntrepreneur: "Doanh nhân",
  rmCategoryArtist: "Nghệ sĩ",
  rmCategoryWriter: "Nhà văn",
  rmCategoryAthlete: "Vận động viên",
  rmCategoryLeader: "Nhà lãnh đạo",
  rmCategoryEngineer: "Kỹ sư",
  rmCategoryDesigner: "Nhà thiết kế",
  rmCategoryMusician: "Nhạc sĩ",
  rmCategoryActivist: "Nhà hoạt động",
  rmCategoryTeacher: "Giáo viên",
  rmCategoryExplorer: "Nhà thám hiểm",
  rmCategorySpiritual: "Tâm linh",
  rmCategoryOther: "Khác",

  // Phase 3 — tải ảnh & hỗ trợ tiếp cận cho AI
  rmPhotoTabUpload: "Tải lên",
  rmPhotoTabUrl: "URL ảnh",
  rmPhotoDropzoneIdle: "Kéo thả ảnh vào đây, hoặc nhấn để chọn",
  rmPhotoDropzoneActive: "Thả ảnh để tải lên",
  rmPhotoDropzoneHint: "JPG, PNG, WebP hoặc GIF — tối đa 5 MB",
  rmPhotoDropzoneBrowse: "Duyệt tệp",
  rmPhotoUploading: "Đang tải ảnh…",
  rmPhotoErrorWrongType: "Loại tệp này không được hỗ trợ. Hãy dùng JPG, PNG, WebP hoặc GIF.",
  rmPhotoErrorTooLarge: "Ảnh quá lớn. Hãy chọn tệp dưới 5 MB.",
  rmPhotoErrorEmpty: "Tệp này có vẻ trống.",
  rmPhotoErrorAuth: "Vui lòng đăng nhập lại để tải ảnh lên.",
  rmPhotoErrorUnknown: "Không thể tải ảnh. Vui lòng thử lại.",
  rmPhotoUploadSuccessToast: "Đã tải ảnh lên",
  rmPhotoFileInputAria: "Chọn ảnh để tải lên",
  rmAutoFillAriaAnnounce: "Bản nháp AI đã sẵn sàng. Hãy kiểm tra các trường bên dưới trước khi lưu.",

  // Phase 4 — hoàn thiện thư viện
  rmFavoritesRailTitle: "Yêu thích",
  rmSectionSpotlight: "Câu trích nổi bật",
  rmSpotlightNextAria: "Hiện một câu trích khác",
  rmSortFavoritesFirst: "Yêu thích trước",
  rmLinkedOpenInAria: "Mở trong {area}",
  rmEmptyTrySampleHint: "Hoặc thử một cái tên như Marie Curie, Steve Jobs hay Maya Angelou — AI sẽ điền phần còn lại.",
  rmEmptyTrySampleAction: "Thử với AI",

  // Phase 5 — hoàn thiện & QA
  rmDiscardChangesTitle: "Hủy các thay đổi?",
  rmDiscardChangesDescription: "Hình mẫu này chưa được lưu. Nếu đóng bây giờ, các chỉnh sửa sẽ bị mất.",
  rmDiscardKeepEditing: "Tiếp tục chỉnh sửa",
  rmDiscardConfirm: "Hủy bỏ",
  rmFavoritesRailItemAria: "Mở {name}",

  // ---- 2026-04-19 redesign keys ----
  relStubTitle: "Bộ sưu tập Mối quan hệ mới sắp ra mắt",
  relStubDescription:
    "Chúng tôi đang làm lại trang này thành bộ sưu tập kiểu CRM cá nhân — có ảnh, theo dõi liên lạc gần nhất, hành động kế tiếp và thẻ. Hãy quay lại sau.",

  relFilterCategory: "Phân loại",
  relFilterStrength: "Độ thân",
  relFilterFavoritesOnly: "Chỉ yêu thích",
  relFilterAllCategories: "Tất cả phân loại",
  relFilterAllStrengths: "Tất cả mức độ",
  relFilterClear: "Xoá bộ lọc",

  relCatProfessor: "Giáo sư",
  relCatClassmate: "Bạn cùng lớp",
  relCatCollaborator: "Cộng sự",
  relCatFriend: "Bạn bè",
  relCatFamily: "Gia đình",
  relCatMentor: "Người cố vấn",
  relCatProfessionalContact: "Liên hệ công việc",
  relCatOther: "Khác",

  relStrStrong: "Thân thiết",
  relStrModerate: "Bình thường",
  relStrWeak: "Xa cách",
  relStrNew: "Mới quen",

  relSortNameAZ: "Tên (A–Z)",
  relSortLastContact: "Liên lạc gần nhất",
  relSortFavoritesFirst: "Yêu thích trước",

  relCardNeverContacted: "Chưa từng liên lạc",
  relCardNextAction: "Hành động kế tiếp",
  relCardDueOn: "Hạn: {date}",
  relCardFavoriteAddAria: "Thêm {name} vào yêu thích",
  relCardFavoriteRemoveAria: "Bỏ {name} khỏi yêu thích",

  relFormSectionEssentials: "Cơ bản",
  relFormSectionContact: "Liên hệ",
  relFormSectionInteraction: "Lịch sử tương tác",
  relFormSectionLongForm: "Bối cảnh & ghi chú",
  relFormSectionMeta: "Thẻ & liên kết",

  relFieldPhoto: "Ảnh",
  relFieldPhotoHint: "Bấm để tải ảnh lên",
  relFieldName: "Tên",
  relFieldNamePlaceholder: "Họ và tên",
  relFieldCategory: "Phân loại",
  relFieldCategoryPlaceholder: "Chọn phân loại",
  relFieldEmail: "Email",
  relFieldEmailPlaceholder: "email@example.com",
  relFieldPhone: "Điện thoại",
  relFieldPhonePlaceholder: "+84 912 345 678",
  relFieldStrength: "Độ thân của mối quan hệ",
  relFieldLastContact: "Ngày liên lạc gần nhất",
  relFieldLastInteractionNotes: "Ghi chú lần tương tác gần nhất",
  relFieldLastInteractionPlaceholder: "Lần trò chuyện trước đã diễn ra thế nào?",
  relFieldNextAction: "Hành động kế tiếp",
  relFieldNextActionPlaceholder: "Bước tiếp theo với người này là gì?",
  relFieldNextActionDate: "Ngày của hành động kế tiếp",
  relFieldCommitments: "Cam kết đã đưa ra",
  relFieldCommitmentsPlaceholder: "Bạn (hoặc đối phương) đã hứa làm gì?",
  relFieldPreferences: "Sở thích & chi tiết",
  relFieldPreferencesPlaceholder: "Sinh nhật, dị ứng, loại cà phê yêu thích…",
  relFieldGeneralNotes: "Ghi chú chung",
  relFieldGeneralNotesPlaceholder: "Bất cứ điều gì đáng để nhớ",
  relFieldTags: "Thẻ",
  relFieldTagsPlaceholder: "nhóm học, cộng đồng piano, mạng lưới startup",
  relFieldTagsHint: "Phân tách bằng dấu phẩy. Dùng từ bạn có thể tìm lại sau.",
  relFieldLinkedProject: "Dự án liên kết",
  relFieldLinkedProjectPlaceholder: "Chọn một dự án",
  relFieldLinkedProjectNone: "Không có dự án",
  relFieldFavorite: "Đánh dấu yêu thích",

  relSaveRelationship: "Lưu mối quan hệ",

  relDetailSectionContact: "Liên hệ",
  relDetailSectionLastContact: "Liên lạc gần nhất",
  relDetailSectionLastInteraction: "Ghi chú lần tương tác gần nhất",
  relDetailSectionNextAction: "Hành động kế tiếp",
  relDetailSectionCommitments: "Cam kết đã đưa ra",
  relDetailSectionPreferences: "Sở thích & chi tiết",
  relDetailSectionGeneralNotes: "Ghi chú chung",
  relDetailSectionTags: "Thẻ",
  relDetailSectionLinkedProject: "Dự án liên kết",

  relNoResultsTitle: "Không tìm thấy kết quả",
  relNoResultsDescription: "Hãy thử điều chỉnh từ khoá hoặc bộ lọc.",

  relPhotoUploading: "Đang tải lên…",
  relPhotoRemoveAria: "Xoá ảnh",
  relPhotoErrorWrongType: "Loại tệp này không được hỗ trợ. Hãy thử JPG, PNG, WebP hoặc GIF.",
  relPhotoErrorTooLarge: "Ảnh vượt giới hạn 5 MB.",
  relPhotoErrorEmpty: "Tệp này có vẻ trống.",
  relPhotoErrorAuth: "Bạn cần đăng nhập để tải ảnh lên.",
  relPhotoErrorUnknown: "Không thể tải ảnh lên. Vui lòng thử lại sau.",

  relDetailEdit: "Sửa",
  relDetailDelete: "Xoá",
  relDetailDeleteConfirmTitle: "Xoá mối quan hệ",
  relDetailDeleteConfirmDescription: "Xoá «{name}» khỏi danh sách mối quan hệ? Hành động này không thể hoàn tác.",

  relLoading: "Đang tải mối quan hệ…",
  relLoadError: "Không thể tải dữ liệu mối quan hệ.",
  relLoadErrorRetry: "Thử lại",
};

const localizedCopy = createLocaleCopyMap<RelationshipUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getRelationshipUiCopy(locale: AppLocale): RelationshipUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}

/** Format a copy template that contains a `{token}` placeholder. */
export function formatRelationshipCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}
