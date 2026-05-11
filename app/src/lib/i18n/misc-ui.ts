import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

export type AuthLoginUiCopy = {
  heading: string;
  description: string;
  redirecting: string;
  continueWithGoogle: string;
  continueWithApple: string;
  continueWithMicrosoft: string;
  continueWithFacebook: string;
  orEmail: string;
  confirmEmailTitle: string;
  confirmEmailBody: (email: string) => string;
  backToSignIn: string;
  signInTab: string;
  createAccountTab: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  passwordHint: string;
  signInWithEmail: string;
  signingIn: string;
  createAccount: string;
  creatingAccount: string;
  devBypassCta: string;
  devBypassDescription: string;
  devBypassLocalOnlySuffix: string;
  termsNotice: string;
  toastAuthFailed: string;
  toastCouldNotStartSignIn: string;
  toastEnterEmailPassword: string;
  toastPasswordMin: string;
  toastPasswordsMismatch: string;
  toastAccountReady: string;
  toastCheckEmail: string;
  toastCouldNotSignIn: string;
  toastCouldNotCreateAccount: string;
};

export type PrivacyUiCopy = {
  title: string;
  description: (brand: string) => string;
  intro: string;
  whoWeAreTitle: string;
  whoWeAreBody: (brand: string) => string;
  whatWeCollectTitle: string;
  accountDataLabel: string;
  accountDataBody: string;
  contentDataLabel: string;
  contentDataBody: string;
  technicalDataLabel: string;
  technicalDataBody: string;
  howWeUseTitle: string;
  howWeUseBody: string;
  storageSecurityTitle: string;
  storageSecurityBody: string;
  yourChoicesTitle: string;
  yourChoiceSettings: string;
  yourChoiceDelete: string;
  yourChoiceExport: string;
  contactTitle: string;
  contactBody: string;
  changesTitle: string;
  changesBody: string;
  lastUpdated: string;
  backToSettings: string;
};

export type AnalyticsUiCopy = {
  pageTitle: string;
  pageDescription: (activeGoalsCount: number) => string;
  tasksCompletedTitle: string;
  tasksCompletedDescription: string;
  activeProjectsTitle: string;
  activeProjectsDescription: string;
  studyHoursTitle: string;
  studyHoursDescription: string;
  journalEntriesTitle: string;
  journalEntriesDescription: string;
  tasksByStatusTitle: string;
  projectsByStatusTitle: string;
  noProjectsYet: string;
  taskStatusTodo: string;
  taskStatusInProgress: string;
  taskStatusDone: string;
  taskStatusCancelled: string;
  projectStatusPlanning: string;
  projectStatusActive: string;
  projectStatusPaused: string;
  projectStatusCompleted: string;
  projectStatusCancelled: string;
};

export type AiAssistantUiCopy = {
  pageTitle: string;
  pageDescription: string;
  emptyState: string;
  inputPlaceholder: string;
  send: string;
  sendMessageAria: string;
  localPlaceholderReply: string;
};

export type AboutMeUiCopy = {
  pageTitle: string;
  pageDescription: string;
  profileImageTitle: string;
  profileImageDescription: string;
  profileImageFileHint: string;
  profileImageAriaLabel: string;
  profileImageInvalidType: string;
  profileImageTooLarge: string;
  profileImageUploadFailed: string;
  toastProfileImageSaved: string;
  instructionManualTitle: string;
  instructionManualDescription: string;
  coreValuesTitle: string;
  coreValuesDescription: string;
  missionTitle: string;
  missionDescription: string;
  personalityInsightsTitle: string;
  personalityInsightsDescription: string;
  writeSectionPlaceholder: (title: string) => string;
  saveSection: (title: string) => string;
  saving: string;
  toastProfileSaved: string;
  toastProfileSaveFailed: string;
};

export type StubPageUiCopy = {
  title: string;
  description: string;
};

export type MutationToastsUiCopy = {
  assets: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
    favoriteFailed: string;
  };
  documents: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  goals: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
    keyResultCreated: string;
    keyResultCreateFailed: string;
    keyResultUpdated: string;
    keyResultUpdateFailed: string;
    keyResultDeleted: string;
    keyResultDeleteFailed: string;
  };
  notes: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  ideas: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  journal: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  habits: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
    logSaved: string;
    logSaveFailed: string;
  };
  routines: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
    runLogged: string;
    runLogFailed: string;
  };
  weeklyReviews: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  projectResources: {
    saveRelatedFailed: string;
    updateFailed: string;
  };
  garden: {
    seedPlanted: string;
    seedPlantFailed: string;
    plantWatered: string;
    plantWaterFailed: string;
    fertilizerApplied: string;
    noFertilizer: string;
    fertilizerUseFailed: string;
    plantHarvested: string;
    plantHarvestFailed: string;
    chestClaimFailed: string;
  };
  softwareVault: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  japaneseStudy: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  roleModels: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  finance: {
    accountCreated: string;
    accountCreateFailed: string;
    accountUpdated: string;
    accountUpdateFailed: string;
    accountDeleted: string;
    accountDeleteFailed: string;
    transactionCreated: string;
    transactionCreateFailed: string;
    transactionUpdated: string;
    transactionUpdateFailed: string;
    transactionDeleted: string;
    transactionDeleteFailed: string;
    savingsGoalCreated: string;
    savingsGoalCreateFailed: string;
    savingsGoalUpdated: string;
    savingsGoalUpdateFailed: string;
    savingsGoalDeleted: string;
    savingsGoalDeleteFailed: string;
    budgetCreated: string;
    budgetCreateFailed: string;
    budgetUpdated: string;
    budgetUpdateFailed: string;
    budgetDeleted: string;
    budgetDeleteFailed: string;
    categoryCreated: string;
    categoryCreateFailed: string;
    categoryUpdated: string;
    categoryUpdateFailed: string;
    categoryDeleted: string;
    categoryDeleteFailed: string;
  };
  career: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  relationships: {
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  scheduleTemplates: {
    created: string;
    createFailed: string;
    deleted: string;
    deleteFailed: string;
  };
  health: {
    sleepCreated: string;
    sleepCreateFailed: string;
    exerciseCreated: string;
    exerciseCreateFailed: string;
    mealCreated: string;
    mealCreateFailed: string;
    checkInCreated: string;
    checkInCreateFailed: string;
    entryDeleted: string;
    entryDeleteFailed: string;
  };
  healthV2: {
    dailyLogSaved: string;
    dailyLogSaveFailed: string;
    metricLogged: string;
    metricLogFailed: string;
    goalUpdated: string;
    goalUpdateFailed: string;
    syncSuccess: string;
    syncFailed: string;
  };
};

export type MiscUiCopy = {
  authLogin: AuthLoginUiCopy;
  privacy: PrivacyUiCopy;
  analytics: AnalyticsUiCopy;
  aiAssistant: AiAssistantUiCopy;
  aboutMe: AboutMeUiCopy;
  stubs: {
    comingSoonTitle: string;
    underDevelopmentDescription: string;
    youtubeRadar: StubPageUiCopy;
    aiKnowledge: StubPageUiCopy;
    businessAnalyst: StubPageUiCopy;
  };
  toasts: MutationToastsUiCopy;
};

const en: MiscUiCopy = {
  authLogin: {
    heading: "My Best Life OS",
    description: "Your personal operating system for life management",
    redirecting: "Redirecting…",
    continueWithGoogle: "Continue with Google",
    continueWithApple: "Continue with Apple",
    continueWithMicrosoft: "Continue with Microsoft",
    continueWithFacebook: "Continue with Facebook",
    orEmail: "or email",
    confirmEmailTitle: "Confirm your email",
    confirmEmailBody: (email) =>
      `We sent a link to ${email}. Open it to verify your account, then sign in below.`,
    backToSignIn: "Back to sign in",
    signInTab: "Sign in",
    createAccountTab: "Create account",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    passwordHint: "At least 6 characters (stricter rules may apply in Supabase).",
    signInWithEmail: "Sign in with email",
    signingIn: "Signing in…",
    createAccount: "Create account",
    creatingAccount: "Creating account…",
    devBypassCta: "Dev / Test mode (skip login)",
    devBypassDescription:
      "No Supabase session — Settings and cloud sync need a real sign-in (Google, Apple, Microsoft, Facebook, or email).",
    devBypassLocalOnlySuffix: " Local dev only.",
    termsNotice: "By continuing, you agree to our Terms of Service and Privacy Policy",
    toastAuthFailed: "Sign-in failed. Please try again.",
    toastCouldNotStartSignIn: "Could not start sign-in.",
    toastEnterEmailPassword: "Enter your email and password.",
    toastPasswordMin: "Password must be at least 6 characters.",
    toastPasswordsMismatch: "Passwords do not match.",
    toastAccountReady: "Account ready. Redirecting…",
    toastCheckEmail: "Check your email to confirm your account.",
    toastCouldNotSignIn: "Could not sign in.",
    toastCouldNotCreateAccount: "Could not create account.",
  },
  privacy: {
    title: "Privacy policy",
    description: (brand) => `How ${brand} treats your information when you use this application.`,
    intro:
      "This document is a practical summary for users of the app. It is not a substitute for legal advice. Update the details below to match your real deployment, data processors, and jurisdiction before publishing publicly.",
    whoWeAreTitle: "Who we are",
    whoWeAreBody: (brand) =>
      `${brand} is a personal productivity and life-management application. The entity responsible for data processing should be identified here (for example, your name or company and contact email).`,
    whatWeCollectTitle: "What we collect",
    accountDataLabel: "Account data",
    accountDataBody:
      "such as email address and profile fields you choose to provide, processed through your authentication provider (for example Supabase Auth).",
    contentDataLabel: "Content you create",
    contentDataBody:
      "tasks, notes, journal entries, financial records, and other modules you store in the app.",
    technicalDataLabel: "Technical data",
    technicalDataBody:
      "basic logs or diagnostics your hosting or database provider may collect as part of normal service operation.",
    howWeUseTitle: "How we use your data",
    howWeUseBody:
      "We use your information to operate the service: authenticate you, sync your data across devices, send optional notifications you enable, and improve reliability and security. We do not sell your personal data.",
    storageSecurityTitle: "Storage and security",
    storageSecurityBody:
      "Data is stored using the infrastructure you configure (for example Supabase / Postgres). Reasonable safeguards such as encryption in transit, access control, and row-level security should be applied in your project; describe the measures you actually use here.",
    yourChoicesTitle: "Your choices",
    yourChoiceSettings: "Access or update profile information in Settings.",
    yourChoiceDelete: "Delete content you no longer need within each module, where supported.",
    yourChoiceExport: "Export or delete your account according to the flows you implement.",
    contactTitle: "Contact",
    contactBody:
      "Add a contact email or form link for privacy-related requests (access, correction, deletion).",
    changesTitle: "Changes",
    changesBody:
      "We may update this policy when the product or legal context changes. The “last updated” note should be revised whenever you edit this page.",
    lastUpdated: "Last updated: April 14, 2026",
    backToSettings: "Back to settings",
  },
  analytics: {
    pageTitle: "Analytics",
    pageDescription: (activeGoalsCount) =>
      `Productivity metrics and insights · ${activeGoalsCount} active goal${activeGoalsCount === 1 ? "" : "s"}`,
    tasksCompletedTitle: "Tasks completed",
    tasksCompletedDescription: "All-time done tasks",
    activeProjectsTitle: "Active projects",
    activeProjectsDescription: "Projects in motion",
    studyHoursTitle: "Study hours",
    studyHoursDescription: "Japanese study (logged)",
    journalEntriesTitle: "Journal entries",
    journalEntriesDescription: "Reflections captured",
    tasksByStatusTitle: "Tasks by status",
    projectsByStatusTitle: "Projects by status",
    noProjectsYet: "No projects yet",
    taskStatusTodo: "To Do",
    taskStatusInProgress: "In Progress",
    taskStatusDone: "Done",
    taskStatusCancelled: "Cancelled",
    projectStatusPlanning: "Planning",
    projectStatusActive: "Active",
    projectStatusPaused: "Paused",
    projectStatusCompleted: "Completed",
    projectStatusCancelled: "Cancelled",
  },
  aiAssistant: {
    pageTitle: "AI Assistant",
    pageDescription: "Chat-style workspace for future AI features",
    emptyState: "Send a message to get started. Replies are local-only for now.",
    inputPlaceholder: "Type a message…",
    send: "Send",
    sendMessageAria: "Send message",
    localPlaceholderReply: "AI integration coming soon!",
  },
  aboutMe: {
    pageTitle: "About me",
    pageDescription: "A living profile you can refine over time",
    profileImageTitle: "Profile image",
    profileImageDescription: "Upload a photo or avatar for your crew profile.",
    profileImageFileHint: "JPEG, PNG, WebP, or GIF · 5 MB max",
    profileImageAriaLabel: "Upload profile photo",
    profileImageInvalidType: "Please choose a JPEG, PNG, WebP, or GIF image",
    profileImageTooLarge: "Image must be 5 MB or smaller",
    profileImageUploadFailed: "Could not upload photo",
    toastProfileImageSaved: "Profile image saved",
    instructionManualTitle: "Instruction manual",
    instructionManualDescription: "How to work with you, boundaries, preferences, and rhythms.",
    coreValuesTitle: "Core values",
    coreValuesDescription: "What you optimize for when choices get hard.",
    missionTitle: "Mission",
    missionDescription: "The change you want to see or build in the world.",
    personalityInsightsTitle: "Personality insights",
    personalityInsightsDescription: "Patterns from assessments, feedback, or self-observation.",
    writeSectionPlaceholder: (title) => `Write your ${title.toLowerCase()}…`,
    saveSection: (title) => `Save ${title.toLowerCase()}`,
    saving: "Saving…",
    toastProfileSaved: "Profile saved",
    toastProfileSaveFailed: "Failed to save profile",
  },
  stubs: {
    comingSoonTitle: "Coming soon",
    underDevelopmentDescription: "This feature is under development",
    youtubeRadar: {
      title: "YouTube Radar",
      description: "Track YouTube content",
    },
    aiKnowledge: {
      title: "AI Knowledge",
      description: "Manage AI configurations",
    },
    businessAnalyst: {
      title: "Business Analyst",
      description: "AI-powered market research",
    },
  },
  toasts: {
    assets: {
      created: "Asset created",
      createFailed: "Failed to create asset",
      updated: "Asset updated",
      updateFailed: "Failed to update asset",
      deleted: "Asset deleted",
      deleteFailed: "Failed to delete asset",
      favoriteFailed: "Failed to update favorite",
    },
    documents: {
      created: "Document created",
      createFailed: "Failed to create document",
      updated: "Document updated",
      updateFailed: "Failed to update document",
      deleted: "Document deleted",
      deleteFailed: "Failed to delete document",
    },
    goals: {
      created: "Goal created",
      createFailed: "Failed to create goal",
      updated: "Goal updated",
      updateFailed: "Failed to update goal",
      deleted: "Goal deleted",
      deleteFailed: "Failed to delete goal",
      keyResultCreated: "Key result created",
      keyResultCreateFailed: "Failed to create key result",
      keyResultUpdated: "Key result updated",
      keyResultUpdateFailed: "Failed to update key result",
      keyResultDeleted: "Key result deleted",
      keyResultDeleteFailed: "Failed to delete key result",
    },
    notes: {
      created: "Note created",
      createFailed: "Failed to create note",
      updated: "Note updated",
      updateFailed: "Failed to update note",
      deleted: "Note deleted",
      deleteFailed: "Failed to delete note",
    },
    ideas: {
      created: "Idea captured",
      createFailed: "Failed to create idea",
      updated: "Idea updated",
      updateFailed: "Failed to update idea",
      deleted: "Idea deleted",
      deleteFailed: "Failed to delete idea",
    },
    journal: {
      created: "Journal entry saved",
      createFailed: "Failed to save entry",
      updated: "Entry updated",
      updateFailed: "Failed to update entry",
      deleted: "Entry deleted",
      deleteFailed: "Failed to delete entry",
    },
    habits: {
      created: "Habit created",
      createFailed: "Failed to create habit",
      updated: "Habit updated",
      updateFailed: "Failed to update habit",
      deleted: "Habit deleted",
      deleteFailed: "Failed to delete habit",
      logSaved: "Log saved",
      logSaveFailed: "Failed to save log",
    },
    routines: {
      created: "Routine created",
      createFailed: "Failed to create routine",
      updated: "Routine updated",
      updateFailed: "Failed to update routine",
      deleted: "Routine deleted",
      deleteFailed: "Failed to delete routine",
      runLogged: "Routine run saved",
      runLogFailed: "Could not save routine run",
    },
    weeklyReviews: {
      created: "Weekly review saved",
      createFailed: "Failed to save review",
      updated: "Review updated",
      updateFailed: "Failed to update review",
      deleted: "Review deleted",
      deleteFailed: "Failed to delete review",
    },
    projectResources: {
      saveRelatedFailed: "Could not save related resources",
      updateFailed: "Could not update resource",
    },
    garden: {
      seedPlanted: "Seed planted!",
      seedPlantFailed: "Failed to plant seed",
      plantWatered: "Plant watered!",
      plantWaterFailed: "Failed to water plant",
      fertilizerApplied: "Fertilizer applied! Growth boosted!",
      noFertilizer: "No fertilizer available",
      fertilizerUseFailed: "Failed to use fertilizer",
      plantHarvested: "Plant harvested! Added to your collection!",
      plantHarvestFailed: "Failed to harvest plant",
      chestClaimFailed: "Failed to claim chest",
    },
    softwareVault: {
      created: "App added to vault",
      createFailed: "Failed to add entry",
      updated: "Entry updated",
      updateFailed: "Failed to update entry",
      deleted: "Entry removed",
      deleteFailed: "Failed to delete entry",
    },
    japaneseStudy: {
      created: "Session logged",
      createFailed: "Failed to create session",
      updated: "Session updated",
      updateFailed: "Failed to update session",
      deleted: "Session deleted",
      deleteFailed: "Failed to delete session",
    },
    roleModels: {
      created: "Role model added",
      createFailed: "Failed to add role model",
      updated: "Role model updated",
      updateFailed: "Failed to update role model",
      deleted: "Role model removed",
      deleteFailed: "Failed to remove role model",
    },
    finance: {
      accountCreated: "Account created",
      accountCreateFailed: "Failed to create account",
      accountUpdated: "Account updated",
      accountUpdateFailed: "Failed to update account",
      accountDeleted: "Account deleted",
      accountDeleteFailed: "Failed to delete account",
      transactionCreated: "Transaction recorded",
      transactionCreateFailed: "Failed to create transaction",
      transactionUpdated: "Transaction updated",
      transactionUpdateFailed: "Failed to update transaction",
      transactionDeleted: "Transaction deleted",
      transactionDeleteFailed: "Failed to delete transaction",
      savingsGoalCreated: "Savings goal created",
      savingsGoalCreateFailed: "Failed to create savings goal",
      savingsGoalUpdated: "Savings goal updated",
      savingsGoalUpdateFailed: "Failed to update savings goal",
      savingsGoalDeleted: "Savings goal deleted",
      savingsGoalDeleteFailed: "Failed to delete savings goal",
      budgetCreated: "Budget saved",
      budgetCreateFailed: "Failed to save budget",
      budgetUpdated: "Budget updated",
      budgetUpdateFailed: "Failed to update budget",
      budgetDeleted: "Budget removed",
      budgetDeleteFailed: "Failed to remove budget",
      categoryCreated: "Category created",
      categoryCreateFailed: "Failed to create category",
      categoryUpdated: "Category updated",
      categoryUpdateFailed: "Failed to update category",
      categoryDeleted: "Category deleted",
      categoryDeleteFailed: "Failed to delete category",
    },
    career: {
      created: "Career asset created",
      createFailed: "Failed to create asset",
      updated: "Asset updated",
      updateFailed: "Failed to update asset",
      deleted: "Asset deleted",
      deleteFailed: "Failed to delete asset",
    },
    relationships: {
      created: "Relationship created",
      createFailed: "Failed to create relationship",
      updated: "Relationship updated",
      updateFailed: "Failed to update relationship",
      deleted: "Relationship deleted",
      deleteFailed: "Failed to delete relationship",
    },
    scheduleTemplates: {
      created: "Template saved",
      createFailed: "Failed to save template",
      deleted: "Template deleted",
      deleteFailed: "Failed to delete template",
    },
    health: {
      sleepCreated: "Sleep log added",
      sleepCreateFailed: "Failed to add sleep log",
      exerciseCreated: "Exercise logged",
      exerciseCreateFailed: "Failed to add exercise",
      mealCreated: "Meal logged",
      mealCreateFailed: "Failed to add meal",
      checkInCreated: "Check-in saved",
      checkInCreateFailed: "Failed to save check-in",
      entryDeleted: "Entry removed",
      entryDeleteFailed: "Failed to remove entry",
    },
    healthV2: {
      dailyLogSaved: "Saved",
      dailyLogSaveFailed: "Failed to save",
      metricLogged: "Logged",
      metricLogFailed: "Failed to log metric",
      goalUpdated: "Goal updated",
      goalUpdateFailed: "Failed to update goal",
      syncSuccess: "Apple Health synced",
      syncFailed: "Sync failed",
    },
  },
};

const zhTWMiscUi: DeepPartial<MiscUiCopy> = {
  aboutMe: {
    profileImageDescription: "上傳太空員檔案的頭像或照片。",
    profileImageFileHint: "JPEG、PNG、WebP 或 GIF · 最大 5 MB",
    profileImageAriaLabel: "上傳個人頭像",
    profileImageInvalidType: "請選擇 JPEG、PNG、WebP 或 GIF 圖片",
    profileImageTooLarge: "圖片大小需為 5 MB 以下",
    profileImageUploadFailed: "無法上傳照片",
    toastProfileImageSaved: "已儲存個人圖片",
  },
  toasts: {
    healthV2: {
      dailyLogSaved: "已儲存",
      dailyLogSaveFailed: "儲存失敗",
      metricLogged: "已記錄",
      metricLogFailed: "記錄失敗",
      goalUpdated: "目標已更新",
      goalUpdateFailed: "目標更新失敗",
      syncSuccess: "Apple 健康已同步",
      syncFailed: "同步失敗",
    },
  },
};

const zhCNMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "已保存",
      dailyLogSaveFailed: "保存失败",
      metricLogged: "已记录",
      metricLogFailed: "记录失败",
      goalUpdated: "目标已更新",
      goalUpdateFailed: "目标更新失败",
      syncSuccess: "Apple 健康已同步",
      syncFailed: "同步失败",
    },
  },
};

const jaMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "保存しました",
      dailyLogSaveFailed: "保存に失敗しました",
      metricLogged: "記録しました",
      metricLogFailed: "記録に失敗しました",
      goalUpdated: "目標を更新しました",
      goalUpdateFailed: "目標の更新に失敗しました",
      syncSuccess: "Appleヘルスと同期しました",
      syncFailed: "同期に失敗しました",
    },
  },
};

const koMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "저장됨",
      dailyLogSaveFailed: "저장 실패",
      metricLogged: "기록됨",
      metricLogFailed: "기록 실패",
      goalUpdated: "목표 업데이트됨",
      goalUpdateFailed: "목표 업데이트 실패",
      syncSuccess: "Apple 건강 동기화됨",
      syncFailed: "동기화 실패",
    },
  },
};

const frMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "Enregistré",
      dailyLogSaveFailed: "Échec de l'enregistrement",
      metricLogged: "Consigné",
      metricLogFailed: "Échec de l'enregistrement",
      goalUpdated: "Objectif mis à jour",
      goalUpdateFailed: "Échec de la mise à jour",
      syncSuccess: "Apple Santé synchronisé",
      syncFailed: "Échec de la synchronisation",
    },
  },
};

const itMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "Salvato",
      dailyLogSaveFailed: "Salvataggio fallito",
      metricLogged: "Registrato",
      metricLogFailed: "Registrazione fallita",
      goalUpdated: "Obiettivo aggiornato",
      goalUpdateFailed: "Aggiornamento fallito",
      syncSuccess: "Apple Salute sincronizzato",
      syncFailed: "Sincronizzazione fallita",
    },
  },
};

const esMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "Guardado",
      dailyLogSaveFailed: "Error al guardar",
      metricLogged: "Registrado",
      metricLogFailed: "Error al registrar",
      goalUpdated: "Objetivo actualizado",
      goalUpdateFailed: "Error al actualizar objetivo",
      syncSuccess: "Apple Salud sincronizado",
      syncFailed: "Error de sincronización",
    },
  },
};

const viMiscUi: DeepPartial<MiscUiCopy> = {
  toasts: {
    healthV2: {
      dailyLogSaved: "Đã lưu",
      dailyLogSaveFailed: "Lưu thất bại",
      metricLogged: "Đã ghi nhận",
      metricLogFailed: "Ghi nhận thất bại",
      goalUpdated: "Mục tiêu đã cập nhật",
      goalUpdateFailed: "Cập nhật thất bại",
      syncSuccess: "Đã đồng bộ Apple Health",
      syncFailed: "Đồng bộ thất bại",
    },
  },
};

const localizedMiscUi = createLocaleCopyMap<MiscUiCopy>(en, {
  "zh-TW": zhTWMiscUi,
  "zh-CN": zhCNMiscUi,
  ja: jaMiscUi,
  ko: koMiscUi,
  fr: frMiscUi,
  it: itMiscUi,
  es: esMiscUi,
  vi: viMiscUi,
});

export function getMiscUiCopy(locale: AppLocale): MiscUiCopy {
  return localizedMiscUi[locale] ?? localizedMiscUi.en;
}
