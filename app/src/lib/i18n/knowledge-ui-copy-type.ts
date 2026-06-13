import type { ContentType, DepthIndicator, ThumbnailStyle } from "@/types/knowledge";

export type KnowledgeUiCopy = {
  pageTitle: string;
  pageDescription: string;
  openKnowledgeMenu: string;
  askAi: string;
  askKnowledgeBase: string;
  chatWithKnowledgeBase: string;
  searchOrAskAi: string;
  searchKnowledgeBase: string;
  addKnowledge: string;
  addShort: string;
  viewLabels: {
    gallery: string;
    board: string;
    table: string;
    constellation: string;
  };
  boardLandscape: {
    title: string;
    description: string;
    enter: string;
    exit: string;
    rotateHint: string;
  };
  typeLabels: Record<ContentType, string>;
  /** Upload-specific badges on cards (Image, PDF File, Word File, …). */
  uploadKindLabels: {
    image: string;
    pdfFile: string;
    wordFile: string;
    excelFile: string;
    powerpointFile: string;
    markdownFile: string;
    textFile: string;
    csvFile: string;
    audioFile: string;
    videoFile: string;
    archiveFile: string;
    codeFile: string;
    genericFile: string;
  };
  lightbox: {
    close: string;
    openPreview: string;
    zoomIn: string;
    zoomOut: string;
    zoomSliderAria: string;
    download: string;
    openInNewTab: string;
  };
  depthLabels: Record<DepthIndicator, string>;
  thumbnailStyleLabels: Record<ThumbnailStyle, string>;
  thumbnailStyleSectionTitle: string;
  thumbnailStyleNaCardTitle: string;
  thumbnailStyleNaCardSubtitle: string;
  formatOpenItem: (title: string) => string;
  justNow: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  weeksAgo: (count: number) => string;
  monthsAgo: (count: number) => string;
  processing: string;
  aiProcessing: string;
  failedAt: (step: string) => string;
  connectionsCount: (count: number) => string;
  sidebarTitle: string;
  library: string;
  /** Sidebar section heading above category filters (articles, repositories, …). */
  categories: string;
  allItems: string;
  aiCollections: string;
  tags: string;
  uncategorized: string;
  untagged: string;
  noItems: string;
  /** Tag taxonomy strings. */
  tagTaxonomy: {
    /** Sidebar section heading above the tag tree. */
    sectionTitle: string;
    /** Search input placeholder ("Search tags…"). */
    searchPlaceholder: string;
    /** Status text shown when search returns nothing. */
    searchNoResults: string;
    /** Status hint above search results. */
    searchResultsHint: (count: number) => string;
    /** Bucket name for unmapped tags. */
    otherCategoryName: string;
    /** Label for the "All knowledge" reset entry above the tree. */
    allKnowledge: string;
    /** Active filter chip prefix ("Filtered by:"). */
    filteredBy: string;
    /** Clear button next to the active tag filter. */
    clear: string;
    /** ARIA label for the tag tree expand toggle. */
    expandNode: (name: string) => string;
    collapseNode: (name: string) => string;
    /** ARIA label for selecting a tag. */
    selectTag: (path: string) => string;
    /** Empty state when no tags exist yet. */
    emptyTitle: string;
    emptyDescription: string;
  };
  /** Laptop: hide the left directory (Library / categories / tags) to widen the card area. */
  collapseDirectory: string;
  /** Laptop: show the left directory again after it was collapsed. */
  expandDirectory: string;
  /** Board view: keep a column visible while horizontally scrolling other columns. */
  formatFreezeColumn: (label: string) => string;
  /** Board view: release a frozen column back into the horizontal board flow. */
  formatUnfreezeColumn: (label: string) => string;
  formatAddToColumn: (label: string) => string;
  /** Accessible label for applying a tag as search filter from the sidebar. */
  formatFilterByTag: (tag: string) => string;
  emptyStateNoKnowledgeTitle: string;
  emptyStateNoKnowledgeDescription: string;
  emptyStateNoMatchesTitle: string;
  emptyStateNoMatchesDescription: string;
  /** Gallery / table list search box. */
  searchKnowledgePlaceholder: string;
  sortLabel: string;
  sortLabels: {
    latest: string;
    updated: string;
    titleAZ: string;
    contentType: string;
    relevance: string;
    linked: string;
    sourceDate: string;
  };
  cardsPerPageLabel: string;
  cardsPerPageCustom: string;
  cardsPerPageApply: string;
  cardsPerPageInputAria: string;
  formatCardsPerPageOption: (count: number) => string;
  formatPaginationRange: (start: number, end: number, total: number) => string;
  formatPaginationPage: (page: number, totalPages: number) => string;
  previousPage: string;
  nextPage: string;
  quickFilters: {
    recent: string;
    social: string;
    github: string;
    hasMedia: string;
    hasSource: string;
    aiGenerated: string;
    needsReview: string;
  };
  quickFilterManager: {
    manageButton: string;
    title: string;
    description: string;
    addFilter: string;
    resetDefaults: string;
    save: string;
    saving: string;
    cancel: string;
    filterLabel: string;
    filterNamePlaceholder: string;
    iconLabel: string;
    visibleLabel: string;
    matchLabel: string;
    matchAll: string;
    matchAny: string;
    builtInBadge: string;
    customBadge: string;
    moveUp: string;
    moveDown: string;
    hide: string;
    delete: string;
    rulesHeading: string;
    addRule: string;
    removeRule: string;
    fieldLabel: string;
    operatorLabel: string;
    valueLabel: string;
    present: string;
    missing: string;
    selectValue: string;
    incompleteDraft: string;
    noFilters: string;
    savedToast: string;
    saveFailedToast: string;
    textValuePlaceholder: string;
    tagValuePlaceholder: string;
    daysValuePlaceholder: string;
    iconLabels: Record<string, string>;
    ruleFields: Record<string, string>;
    ruleOperators: Record<string, string>;
  };
  activeFiltersHeading: string;
  clearAllFilters: string;
  formatActiveSearch: (q: string) => string;
  formatActiveTypes: (n: number) => string;
  formatActiveCategories: (n: number) => string;
  formatActiveQuick: (n: number) => string;
  formatActiveCollection: (name: string) => string;
  contentTypesMenuTitle: string;
  emptyFilteredClearButton: string;
  tableCategory: string;
  tableCollection: string;
  tableUpdated: string;
  tableAdded: string;
  tableType: string;
  tableTitle: string;
  tableAiSummary: string;
  tableTags: string;
  tableSource: string;
  tableDate: string;
  tableProcessing: string;
  tableFailed: string;
  inquiryAgent: {
    eyebrow: string;
    openRetrieval: string;
    openRetrievalDescription: string;
    collapseRetrieval: string;
    title: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    runInquiry: string;
    clearInquiry: string;
    startListening: string;
    stopListening: string;
    speechUnsupported: string;
    permissionDenied: string;
    speechError: string;
    idleStatus: string;
    listeningStatus: string;
    transcribingStatus: string;
    analyzingStatus: string;
    matchingStatus: string;
    resultsReadyStatus: string;
    noStrongMatchesStatus: string;
    errorStatus: string;
    examplesLabel: string;
    exampleQueries: string[];
    resultsHeading: (count: number) => string;
    noStrongMatchesTitle: string;
    noStrongMatchesDescription: string;
    relevanceScore: (score: number) => string;
    confidenceLabels: {
      "very-high": string;
      high: string;
      medium: string;
      low: string;
    };
    whyThisMatches: string;
    matchedConcepts: string;
    matchedKeywords: string;
    matchedBecause: string;
    suggestedAction: string;
    openItem: string;
    askAi: string;
    applyPrompt: string;
    copyPrompt: string;
    promptCopied: string;
    saveRecipe: string;
    recipeSaved: string;
    savedRecipes: string;
    pinSource: string;
    unpinSource: string;
    pinnedSources: string;
    compareSource: string;
    removeCompareSource: string;
    compareTrayTitle: string;
    compareTrayDescription: string;
    compareWithSources: string;
    clearCompare: string;
    workflowsLabel: string;
    workflowChanged: string;
    workflowContradictions: string;
    workflowTasks: string;
    workflowStudyPack: string;
  };
  aiPanel: {
    title: string;
    closePanel: string;
    welcomeTitle: string;
    welcomeDescription: string;
    thinking: string;
    inputPlaceholder: string;
    inputAria: string;
    send: string;
    sendAria: string;
    suggestedQueries: string[];
    recentItems: (content: string) => string;
    noRecentItems: string;
    connectionsFound: (count: number, content: string) => string;
    noConnectionsFound: string;
    summariesFound: (count: number, content: string) => string;
    noSummariesFound: string;
    matchesFound: (count: number, content: string, remaining: number) => string;
    noMatchesFound: (query: string) => string;
    genericError: string;
    clearConversation: string;
    historyPersistHint: string;
    connectedContextTitle: string;
    connectedContextDescription: string;
    assistantUnavailable: string;
  };
  addModal: {
    title: string;
    tabUrl: string;
    tabFile: string;
    tabText: string;
    tabVoice: string;
    urlLabel: string;
    urlPlaceholder: string;
    autoDetectBlurb: string;
    youtubeThumbnailHint: string;
    cancel: string;
    processing: string;
    process: string;
    addSuccess: string;
    addUrlFailed: string;
    uploadFailed: string;
    /** Video uploads exceed the 1 GB limit (aligned with storage bucket). */
    fileVideoTooLarge: string;
    /** Raster photo uploads exceed the product limit (25 MB). */
    filePhotoTooLarge: string;
    /** Any knowledge file exceeds the maximum allowed size (1 GB). */
    fileTooLarge: string;
    /** User cancelled before finalize / after blob reached storage. */
    uploadCancelled: string;
    /** Red X on the file drop zone — clear selection or request cancel while uploading. */
    removeFileFromDropzoneAria: string;
    /** File tab: image uploads use the file as the card image — no style picker. */
    photoThumbnailUsesUploadHint: string;
    addNoteFallbackFailed: string;
    autoTranscriptionFailed: string;
    microphoneAccessDenied: string;
    uploadFileAria: string;
    dropFileOrBrowse: string;
    supportedFileFormats: string;
    multipleFilesDetectedTitle: string;
    multipleFilesDetectedDescription: (count: number) => string;
    fileQueuePosition: (current: number, total: number) => string;
    skipFile: string;
    uploading: string;
    upload: string;
    quickTipTitle: string;
    quickTipDescription: string;
    titleLabel: string;
    titlePlaceholder: string;
    generatingTitle: string;
    contentLabel: string;
    contentPlaceholder: string;
    codeDetected: (language: string, previewAvailable: boolean) => string;
    adding: string;
    addNote: string;
    startRecording: string;
    stopRecording: string;
    tapToRecord: string;
    recording: (time: string) => string;
    recorded: (time: string) => string;
    previewLabel: string;
    transcriptLabel: string;
    transcriptPending: string;
    transcriptPlaceholder: string;
    addVoiceMemo: string;
    addVoiceMemoFailed: string;
    saveHtmlTitle: string;
    saveHtmlDescription: (language: string) => string;
    backToEdit: string;
    saveAsSource: string;
    saveWithPreview: string;
    // ── Source-aware detection ──
    detectedBadgePrefix: string;
    detectedBadgeGeneric: string;
    /** Short subtitle under the detection badge explaining what's next. */
    detectedSubtitleFor: (label: string) => string;
    youtubeTranscriptLabel: string;
    youtubeTranscriptHint: string;
    youtubeTranscriptOptional: string;
    /** Shown when a social post URL is detected (single notice; no extra disclaimers). */
    socialAiEmbedNotice: string;
    githubRepoHint: string;
    displayModeLabel: string;
    displayModePreview: string;
    displayModeSource: string;
    displayModeHelpPreview: string;
    displayModeHelpSource: string;
  };
  detail: {
    close: string;
    dragHandleClose: string;
    sourceFallback: string;
    processingFailedAt: (step: string) => string;
    retrying: string;
    retryProcessing: string;
    processingInProgress: string;
    updatingThumbnail: string;
    refreshYoutubeThumbnail: string;
    regeneratingThumbnail: string;
    regenerateThumbnail: string;
    summary: string;
    /** One-line headline for the TL;DR / one-sentence summary block. */
    oneSentenceSummary: string;
    /** Heading for the short multi-sentence description (maps to ai_summary). */
    shortDescription: string;
    contentOverview: string;
    keyInsights: string;
    generateSection: string;
    generatingSection: string;
    viewGeneratedSection: string;
    hideSection: string;
    deferredSectionFailed: string;
    keyQuotes: string;
    questionsThisAnswers: string;
    actionItems: string;
    tags: string;
    addTagPlaceholder: string;
    addTag: string;
    relatedItemsDiscovered: string;
    content: string;
    /** In-document PDF preview region heading. */
    pdfViewerHeading: string;
    /** In-document Word editor region heading. */
    wordEditorHeading: string;
    wordEditorHint: string;
    wordEditorLoading: string;
    wordSaveRevision: string;
    wordSaving: string;
    wordSavedToast: string;
    wordSaveFailed: string;
    wordLoadFailed: string;
    /** Paginated Word preview (docx-preview). */
    wordLayoutTab: string;
    /** Plain HTML quick editor tab. */
    wordQuickEditTab: string;
    source: string;
    preview: string;
    fullPage: string;
    added: string;
    modified: string;
    deleteItem: string;
    fullPagePreviewAria: string;
    exitPreview: string;
    deleteTitle: string;
    deleteDescription: (title: string) => string;
    deleting: string;
    delete: string;
    updateTitleFailed: string;
    addTagFailed: string;
    removeTagFailed: string;
    thumbnailRegenerated: string;
    regenerateFailed: string;
    youtubeThumbnailUpdated: string;
    refreshThumbnailFailed: string;
    retryingAiProcessing: string;
    retryFailed: string;
    itemDeleted: string;
    deleteFailed: string;
    generateTranscript: string;
    generatingTranscript: string;
    transcriptSavedToast: string;
    transcriptFailed: string;
    transcriptSection: string;
    transcriptEmpty: string;
    askAboutVideo: string;
    videoChatTitle: string;
    videoChatIntro: string;
    videoChatQuickPicks: string;
    videoChatPlaceholder: string;
    videoChatSend: string;
    videoChatThinking: string;
    videoChatError: string;
    videoChatFallbackQuestions: string[];
    // ── Ask the Document ──
    askDocument: string;
    documentChatTitle: string;
    documentChatIntro: string;
    documentChatPlaceholder: string;
    documentChatSend: string;
    documentChatThinking: string;
    documentChatError: string;
    documentChatFallbackQuestions: string[];
    documentChatQuickPicks: string;
    // ── Auth-state error copy shared by video + document chats ──
    authErrorSessionInvalid: string;
    authErrorDevBypass: string;
    authErrorNoSession: string;
    authErrorUnknown: string;
    // ── Social / provider metadata ──
    postedBy: (name: string) => string;
    viewOriginal: string;
    openKnowledgeSource: string;
    viewOnYouTube: string;
    viewOnGitHub: string;
    viewOnProvider: (provider: string) => string;
    extractionPartialHint: string;
    extractionFailedHint: string;
    askUnavailableForSocial: string;
    socialEmbedUnavailable: string;
    repoStars: (count: number) => string;
    repoLanguage: (name: string) => string;
  };
  constellation: {
    title: string;
    description: string;
    loadingGraphData: string;
    /** Toolbar */
    searchPlaceholder: string;
    /** Compact placeholder for very narrow viewports (e.g. mobile). */
    searchPlaceholderShort?: string;
    /** Long-form placeholder for desktop ("Search across your knowledge…"). */
    searchPlaceholderFull?: string;
    modeGlobal: string;
    modeLocal: string;
    modeSphere3D: string;
    sphere3DBadge: string;
    sphere3DLoading: string;
    sphere3DUnsupported: string;
    sphere3DEmpty: string;
    sphere3DPerformanceWarning: string;
    resetSphere: string;
    fitSphere: string;
    clusterBy: string;
    clusterByCategory: string;
    clusterByNodeType: string;
    clusterByLibrary: string;
    clusterByCollection: string;
    clusterByProject: string;
    clusterBySourceType: string;
    clusterByNone: string;
    depth: string;
    showLabels: string;
    hideOrphans: string;
    resetView: string;
    fitGraph: string;
    /** Browser fullscreen for the graph canvas only (max space for 3D sphere). */
    graphFullscreenEnter: string;
    graphFullscreenExit: string;
    openFilters: string;
    openLegend: string;
    nodes: string;
    edges: string;
    /** Filters */
    filtersTitle: string;
    filtersScope: string;
    filtersNodeTypes: string;
    filtersRelations: string;
    filtersTagsCollections: string;
    filtersSourcesProjects: string;
    filtersDisplay: string;
    filtersAdvanced: string;
    filtersResetAll: string;
    filtersShowTagNodes: string;
    filtersShowCollectionNodes: string;
    filtersShowSourceNodes: string;
    filtersShowProjectNodes: string;
    filtersShowEntityNodes: string;
    filtersShowSemanticLinks: string;
    filtersShowAISuggestedLinks: string;
    filtersManualLinksOnly: string;
    filtersMinSemanticConfidence: string;
    filtersMinConnectionCount: string;
    /** Empty / loading states */
    emptyTitle: string;
    emptyDescription: string;
    noResultsTitle: string;
    noResultsDescription: string;
    localNoSelectionTitle: string;
    localNoSelectionDescription: string;
    /** Local orbit inspector (depth rings) — shared Brain + Constellation */
    localOrbitPanelTitle: string;
    localOrbitPickCenterHint: string;
    localOrbitCenterBadge: string;
    localOrbitDepthLine: (depth: number) => string;
    localOrbitGraphCounts: (nodeCount: number, edgeCount: number) => string;
    localOrbitGraphSubsetSummary: (
      canvasNodes: number,
      canvasEdges: number,
      availableNodes: number,
      availableEdges: number,
    ) => string;
    localOrbitInnerRingTitle: string;
    localOrbitInnerRingDesc: string;
    localOrbitMiddleRingTitle: string;
    localOrbitMiddleRingDesc: string;
    localOrbitOuterRingTitle: string;
    localOrbitOuterRingDesc: string;
    localOrbitNoMembers: string;
    loadFailed: string;
    /** Detail panel */
    detailNodeType: string;
    detailCollection: string;
    detailTags: string;
    detailSource: string;
    detailCreated: string;
    detailUpdated: string;
    detailConnectionCount: string;
    /** Compact inspector: collapsible secondary metadata & filters */
    detailBottomMore: string;
    detailRelatedKnowledge: string;
    detailAISuggestions: string;
    detailNoSelection: string;
    detailNoSelectionHint: string;
    actionOpenKnowledge: string;
    actionExploreLocal: string;
    actionAddManualLink: string;
    actionFilterByTag: string;
    actionFilterBySource: string;
    actionFilterByCollection: string;
    actionFilterByProject: string;
    actionFilterByPerson: string;
    actionFilterByOrganization: string;
    actionFilterByConcept: string;
    confirmAISuggestion: string;
    dismissAISuggestion: string;
    manualLinkComingSoon: string;
    /** Legend */
    legendTitle: string;
    legendNodes: string;
    legendEdges: string;
    /** Node-type labels (for legend / details) */
    actionFilterByCategory: string;
    typeKnowledge: string;
    typeCategory: string;
    typeTag: string;
    typeCollection: string;
    typeSource: string;
    typeProject: string;
    typePerson: string;
    typeOrganization: string;
    typeConcept: string;
    /** Filter group label for "Show category nodes". */
    filtersShowCategoryNodes: string;
  };
  docOracle: {
    openWorkspace: string;
    retryJob: string;
    extractionLabel: string;
    workspaceHintNoJob: string;
    progressPercent: (pct: number) => string;
    stageLine: (stage: string) => string;
    jobStatus: (status: string) => string;
  };
};
