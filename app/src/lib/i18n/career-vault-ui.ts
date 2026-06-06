import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { CareerVaultCategory } from "@/types/career-vault";

export type CareerVaultCategoryLabels = Record<CareerVaultCategory, string>;

export type CareerVaultCopy = {
  pageTitle: string;
  pageDescription: string;
  landing: {
    title: string;
    description: string;
    vaultCardTitle: string;
    vaultCardDescription: string;
    openVault: string;
  };
  breadcrumb: {
    career: string;
    vault: string;
  };
  searchPlaceholder: string;
  uploadButton: string;
  uploadShort: string;
  stats: {
    filesCount: (count: number) => string;
    totalSize: (formattedSize: string) => string;
  };
  categories: CareerVaultCategoryLabels;
  filters: {
    all: string;
  };
  sections: {
    quickAccess: string;
    allFiles: string;
  };
  sort: {
    label: string;
    recent: string;
    name: string;
    size: string;
    category: string;
  };
  view: {
    grid: string;
    list: string;
    toggleLabel: string;
  };
  card: {
    masterBadge: string;
    starAria: string;
    unstarAria: string;
  };
  actions: {
    preview: string;
    edit: string;
    download: string;
    delete: string;
    star: string;
    unstar: string;
    openMenu: string;
    close: string;
    cancel: string;
    save: string;
    saving: string;
  };
  empty: {
    title: string;
    description: string;
    suggestionsTitle: string;
    suggestionMasterResume: string;
    suggestionPhoto: string;
    suggestionBio: string;
    noResultsTitle: string;
    noResultsDescription: string;
  };
  upload: {
    title: string;
    dragDrop: string;
    dragDropActive: string;
    or: string;
    browse: string;
    accepted: string;
    maxSize: (mb: number) => string;
    fileLabel: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    tagsLabel: string;
    tagsHint: string;
    tagsPlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    starLabel: string;
    masterLabel: string;
    masterHint: string;
    submit: string;
    submitting: string;
    uploading: (percent: number) => string;
  };
  detail: {
    filenameLabel: string;
    categoryLabel: string;
    tagsLabel: string;
    descriptionLabel: string;
    descriptionEmpty: string;
    createdAt: string;
    updatedAt: string;
    fileSize: string;
    fileType: string;
    openInNewTab: string;
    downloadToView: string;
    unsupportedPreview: string;
    starred: string;
    master: string;
  };
  deleteDialog: {
    title: string;
    description: (filename: string) => string;
    cancel: string;
    confirm: string;
  };
  errors: {
    fileTooLarge: (mb: number) => string;
    invalidType: string;
    uploadFailed: string;
    fetchFailed: string;
    fetchHint: string;
    retry: string;
    migrationTitle: string;
    migrationSteps: string;
    categoryRequired: string;
    notAuthenticated: string;
  };
  toasts: {
    uploaded: string;
    updated: string;
    deleted: string;
    starred: string;
    unstarred: string;
    updateFailed: string;
    deleteFailed: string;
  };
  versions: {
    tab: string;
    title: string;
    subtitle: string;
    currentBadge: string;
    versionLabel: (n: number) => string;
    viewBtn: string;
    downloadBtn: string;
    restoreBtn: string;
    compareBtn: string;
    loadMore: string;
    empty: string;
    retentionWarning: (limit: number) => string;
    uploadNew: {
      trigger: string;
      title: string;
      description: string;
      dropLabel: string;
      changeNoteLabel: string;
      changeNotePlaceholder: string;
      changeNoteHint: string;
      keepMetadataLabel: string;
      submit: string;
      submitting: string;
      cancel: string;
    };
    compare: {
      title: string;
      subtitle: string;
      left: string;
      right: string;
      picker: string;
      noDiff: string;
      pdfFallback: string;
      docxFallback: string;
      imageHint: string;
    };
    confirmRestore: {
      title: string;
      description: (versionNumber: number) => string;
      cancel: string;
      confirm: string;
    };
    toasts: {
      versionSaved: (n: number) => string;
      saveFailed: string;
      restored: (n: number) => string;
      restoreFailed: string;
    };
  };
  tags: {
    pageTitle: string;
    pageDescription: string;
    breadcrumb: string;
    searchPlaceholder: string;
    popular: string;
    all: string;
    totalCount: (n: number) => string;
    filesWithTag: (n: number) => string;
    emptyTitle: string;
    emptyDescription: string;
    aiBadge: string;
    actions: {
      rename: string;
      merge: string;
      delete: string;
      viewFiles: string;
    };
    rename: {
      title: string;
      label: string;
      placeholder: string;
      hint: string;
      submit: string;
      cancel: string;
    };
    merge: {
      title: string;
      description: string;
      sourcesLabel: string;
      targetLabel: string;
      targetPlaceholder: string;
      submit: string;
      cancel: string;
    };
    confirmDelete: {
      title: string;
      description: (tag: string, fileCount: number) => string;
      cancel: string;
      confirm: string;
    };
    toasts: {
      renamed: (count: number) => string;
      merged: (count: number) => string;
      deleted: (count: number) => string;
      failed: string;
    };
    autocomplete: {
      usageCount: (n: number) => string;
      createNew: (tag: string) => string;
      aiSuggested: string;
    };
  };
  smartTags: {
    analyzing: string;
    bannerTitle: string;
    bannerDescription: string;
    confidence: (pct: number) => string;
    applied: string;
    acceptAll: string;
    dismiss: string;
    privacyDisclaimer: string;
    settingsLink: string;
  };
  shares: {
    pageTitle: string;
    pageDescription: string;
    breadcrumb: string;
    createButton: string;
    empty: {
      title: string;
      description: string;
    };
    stats: {
      active: (n: number) => string;
      totalViews: (n: number) => string;
    };
    sections: {
      active: string;
      archived: string;
    };
    card: {
      recipientLabel: (label: string) => string;
      noRecipient: string;
      viewsCount: (n: number) => string;
      maxViewsLabel: (used: number, max: number) => string;
      expiresIn: (days: number) => string;
      expiresHours: (hours: number) => string;
      expired: string;
      exhausted: string;
      revokedBadge: string;
      passwordBadge: string;
      downloadAllowed: string;
      downloadBlocked: string;
      watermark: string;
      copyLink: string;
      linkCopied: string;
      viewLogs: string;
      extend: string;
      revoke: string;
      delete: string;
      forFile: (name: string) => string;
      forBundle: (name: string) => string;
    };
    create: {
      title: string;
      description: string;
      recipientLabel: string;
      recipientPlaceholder: string;
      recipientHint: string;
      passwordToggle: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      passwordHint: string;
      expirationLabel: string;
      expirationNever: string;
      expiration24h: string;
      expiration7d: string;
      expiration30d: string;
      expirationCustom: string;
      customDateLabel: string;
      maxViewsLabel: string;
      maxViewsUnlimited: string;
      maxViews1: string;
      maxViews5: string;
      maxViews10: string;
      maxViewsCustom: string;
      customViewsLabel: string;
      allowDownloadLabel: string;
      watermarkLabel: string;
      watermarkHint: string;
      submit: string;
      submitting: string;
      cancel: string;
      createdTitle: string;
      createdHint: string;
      copyLink: string;
      linkCopied: string;
      qrTitle: string;
      done: string;
    };
    accessLog: {
      title: string;
      description: string;
      empty: string;
      actions: {
        viewed: string;
        downloaded: string;
        password_failed: string;
      };
      ipHashColumn: string;
      uaColumn: string;
      whenColumn: string;
      actionColumn: string;
      clearAll: string;
      clearConfirm: string;
      close: string;
    };
    toasts: {
      created: string;
      createFailed: string;
      updated: string;
      updateFailed: string;
      revoked: string;
      deleted: string;
      linkCopied: string;
      logsCleared: string;
    };
    public: {
      sharedBy: (name: string) => string;
      anonymous: string;
      titleFile: string;
      titleBundle: string;
      fileMeta: (size: string, when: string) => string;
      download: string;
      downloadBlocked: string;
      expiresHint: (when: string) => string;
      viewsHint: (used: number, max: number) => string;
      unlimitedViews: (used: number) => string;
      watermarkNote: string;
      ctaText: string;
      ctaButton: string;
      bundleFilesHeading: string;
      errors: {
        notFound: string;
        revoked: string;
        expired: string;
        exhausted: string;
        generic: string;
      };
      password: {
        title: string;
        description: string;
        label: string;
        placeholder: string;
        submit: string;
        submitting: string;
        invalid: string;
      };
    };
  };
  bundles: {
    pageTitle: string;
    pageDescription: string;
    breadcrumb: string;
    newButton: string;
    empty: {
      title: string;
      description: string;
      cta: string;
    };
    templates: {
      grad_school: string;
      tech_job: string;
      speaking: string;
      funding: string;
      custom: string;
    };
    card: {
      fileCount: (n: number) => string;
      lastExported: (when: string) => string;
      neverExported: string;
      export: string;
      edit: string;
      duplicate: string;
      delete: string;
      share: string;
    };
    wizard: {
      title: string;
      step1: string;
      step1Title: string;
      step1Description: string;
      step2: string;
      step2Title: string;
      step2Description: string;
      step3: string;
      step3Title: string;
      step3Description: string;
      step4: string;
      step4Title: string;
      step4Description: string;
      next: string;
      back: string;
      cancel: string;
      finish: string;
      finishAndExport: string;
      saving: string;
      selectFilesHint: string;
      selectedCount: (n: number) => string;
      filterByCategory: string;
      allCategories: string;
      suggestedCategories: string;
      reorderHint: string;
      nameLabel: string;
      namePlaceholder: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      includeCoverToggle: string;
      coverTitleLabel: string;
      coverTitlePlaceholder: string;
      coverSubtitleLabel: string;
      coverSubtitlePlaceholder: string;
      coverRecipientLabel: string;
      coverRecipientPlaceholder: string;
      coverPreviewHeading: string;
      formatLabel: string;
      formatZip: string;
      formatZipHint: string;
      formatMergedPdf: string;
      formatMergedPdfHint: string;
      mergedPdfWarning: (count: number) => string;
      filenameLabel: string;
      sizeWarning: string;
    };
    detail: {
      filesHeading: string;
      coverHeading: string;
      exportHeading: string;
      noFiles: string;
    };
    templateDefaults: {
      gradSchoolCover: string;
      techJobCover: string;
      speakingCover: string;
      fundingCover: string;
      customCover: string;
    };
    toasts: {
      created: string;
      createFailed: string;
      updated: string;
      updateFailed: string;
      deleted: string;
      exported: (filename: string) => string;
      exportFailed: string;
      exportWithSkipped: (count: number) => string;
    };
    coverFilename: string;
  };
  pipeline: {
    pageTitle: string;
    pageDescription: string;
    breadcrumb: string;
    newButton: string;
    filters: {
      all: string;
    };
    stages: {
      researching: string;
      applied: string;
      phone_screen: string;
      interviewing: string;
      offer: string;
      accepted: string;
      rejected: string;
      withdrawn: string;
    };
    stageDescriptions: {
      researching: string;
      applied: string;
      phone_screen: string;
      interviewing: string;
      offer: string;
      accepted: string;
      rejected: string;
      withdrawn: string;
    };
    stageCount: (n: number) => string;
    card: {
      location: string;
      excitementScore: (n: number) => string;
      matchScore: (n: number) => string;
      appliedAgo: (days: number) => string;
      attachedFiles: (n: number) => string;
      nextAction: (when: string) => string;
    };
    detail: {
      overview: string;
      jobDescription: string;
      jobLink: string;
      attachedFiles: string;
      interactions: string;
      aiActions: string;
      nextAction: string;
      stageTimeline: string;
      addFromVault: string;
      uploadAndAttach: string;
      removeFile: string;
      noFiles: string;
      noInteractions: string;
      addInteraction: string;
      interactionTypes: {
        note: string;
        email_sent: string;
        email_received: string;
        phone_call: string;
        interview: string;
        offer_received: string;
        feedback: string;
      };
      interactionContentPlaceholder: string;
      interactionSubmit: string;
      interactionWhenLabel: string;
      aiAnalyze: string;
      aiDraft: string;
      aiPrep: string;
      salaryLabel: string;
      contactLabel: string;
      notesLabel: string;
      notesPlaceholder: string;
      stageReachedAt: (when: string) => string;
      nextActionDateLabel: string;
      nextActionDescriptionPlaceholder: string;
      excitementLabel: string;
      matchLabel: string;
      editBtn: string;
      deleteBtn: string;
      confirmDelete: {
        title: string;
        description: (name: string) => string;
        cancel: string;
        confirm: string;
      };
    };
    newModal: {
      title: string;
      description: string;
      companyLabel: string;
      companyPlaceholder: string;
      roleLabel: string;
      rolePlaceholder: string;
      locationLabel: string;
      locationPlaceholder: string;
      stageLabel: string;
      jobUrlLabel: string;
      jobUrlPlaceholder: string;
      salaryLabel: string;
      salaryPlaceholder: string;
      submit: string;
      submitting: string;
      cancel: string;
    };
    vaultFile: {
      usedInTitle: string;
      usedInEmpty: string;
      viewOpportunity: string;
    };
    toasts: {
      created: string;
      createFailed: string;
      updated: string;
      updateFailed: string;
      deleted: string;
      stageChanged: string;
      interactionAdded: string;
    };
  };
};

const en: CareerVaultCopy = {
  pageTitle: "Career Vault",
  pageDescription:
    "Store, organize, version, and reuse resumes, portfolios, certificates, references, and career assets.",
  landing: {
    title: "Career",
    description:
      "Your professional command center — keep every career document in one place and ready to use.",
    vaultCardTitle: "Career Vault",
    vaultCardDescription:
      "Upload and organize resumes, bios, photos, certificates, portfolios and more.",
    openVault: "Open vault",
  },
  breadcrumb: {
    career: "Career",
    vault: "Vault",
  },
  searchPlaceholder: "Search files, tags, or descriptions…",
  uploadButton: "Upload file",
  uploadShort: "Upload",
  stats: {
    filesCount: (count) => `${count} ${count === 1 ? "file" : "files"}`,
    totalSize: (size) => size,
  },
  categories: {
    resume: "Resume",
    cover_letter: "Cover Letter",
    photo: "Photo",
    bio: "Bio",
    portfolio: "Portfolio",
    credential: "Credential",
    reference: "Reference",
    application: "Application",
  },
  filters: {
    all: "All",
  },
  sections: {
    quickAccess: "Quick access",
    allFiles: "All files",
  },
  sort: {
    label: "Sort",
    recent: "Recent",
    name: "Name A–Z",
    size: "Size",
    category: "Category",
  },
  view: {
    grid: "Grid",
    list: "List",
    toggleLabel: "View",
  },
  card: {
    masterBadge: "Master",
    starAria: "Star this file",
    unstarAria: "Remove star",
  },
  actions: {
    preview: "Preview",
    edit: "Edit",
    download: "Download",
    delete: "Delete",
    star: "Star",
    unstar: "Unstar",
    openMenu: "Open actions",
    close: "Close",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving…",
  },
  empty: {
    title: "Your vault is empty",
    description: "Upload your first file to get started.",
    suggestionsTitle: "Suggestions",
    suggestionMasterResume: "Master resume",
    suggestionPhoto: "Professional photo",
    suggestionBio: "Short bio",
    noResultsTitle: "No matching files",
    noResultsDescription: "Try a different search or category filter.",
  },
  upload: {
    title: "Upload to Career Vault",
    dragDrop: "Drag & drop a file here",
    dragDropActive: "Release to upload",
    or: "or",
    browse: "Browse files",
    accepted: "PDF, DOCX, JPG, PNG, WEBP, MD, TXT",
    maxSize: (mb) => `Up to ${mb} MB per file`,
    fileLabel: "File",
    categoryLabel: "Category",
    categoryPlaceholder: "Choose a category",
    tagsLabel: "Tags",
    tagsHint: "Comma-separated",
    tagsPlaceholder: "tech, senior, 2026",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Notes about this file (optional)",
    starLabel: "Star this file",
    masterLabel: "Mark as master file",
    masterHint: "One master per category. Replaces the existing one.",
    submit: "Upload",
    submitting: "Uploading…",
    uploading: (p) => `Uploading… ${p}%`,
  },
  detail: {
    filenameLabel: "Filename",
    categoryLabel: "Category",
    tagsLabel: "Tags",
    descriptionLabel: "Description",
    descriptionEmpty: "No description yet.",
    createdAt: "Created",
    updatedAt: "Last modified",
    fileSize: "Size",
    fileType: "Type",
    openInNewTab: "Open in new tab",
    downloadToView: "Preview not available. Download to view.",
    unsupportedPreview: "Inline preview is not supported for this file type.",
    starred: "Starred",
    master: "Master file",
  },
  deleteDialog: {
    title: "Delete this file?",
    description: (name) => `“${name}” will be permanently removed from your vault.`,
    cancel: "Cancel",
    confirm: "Delete",
  },
  errors: {
    fileTooLarge: (mb) => `File is too large. Max ${mb} MB.`,
    invalidType: "File type is not supported.",
    uploadFailed: "Upload failed. Please try again.",
    fetchFailed: "Could not load your vault.",
    fetchHint:
      "Check your connection, confirm Supabase env vars, and ensure migrations for career_vault_files are applied.",
    retry: "Try again",
    migrationTitle: "Your Supabase project does not have the Career Vault tables yet.",
    migrationSteps: `Apply the SQL migrations in this repo to the same project as NEXT_PUBLIC_SUPABASE_URL.

Option A — Supabase CLI (recommended)
1. Install the CLI: https://supabase.com/docs/guides/cli
2. From the app folder: npx supabase login
3. Link: npx supabase link --project-ref YOUR_PROJECT_REF (ref is in Dashboard → Settings → General)
4. Push: npm run db:push

Option B — SQL Editor
1. Open Supabase Dashboard → SQL → New query
2. Paste and run the file: app/supabase/migrations/20260424000000_career_vault.sql
3. Then run: app/supabase/migrations/20260426000000_career_vault_versions_and_tags.sql
4. Reload this page.`,
    categoryRequired: "Please choose a category.",
    notAuthenticated: "You must be signed in to upload files.",
  },
  toasts: {
    uploaded: "File uploaded",
    updated: "Changes saved",
    deleted: "File deleted",
    starred: "Added to quick access",
    unstarred: "Removed from quick access",
    updateFailed: "Could not save changes",
    deleteFailed: "Could not delete file",
  },
  versions: {
    tab: "History",
    title: "Version history",
    subtitle: "Every time you upload a new copy, the previous one is archived here.",
    currentBadge: "Current",
    versionLabel: (n) => `v${n}`,
    viewBtn: "View",
    downloadBtn: "Download",
    restoreBtn: "Restore",
    compareBtn: "Compare",
    loadMore: "Load more",
    empty: "No past versions yet. Upload a new copy to start tracking changes.",
    retentionWarning: (limit) =>
      `Older versions beyond the last ${limit} are auto-archived.`,
    uploadNew: {
      trigger: "Upload new version",
      title: "Upload new version",
      description:
        "The current file will be archived as a past version. Metadata (tags, description, star, master) stays the same.",
      dropLabel: "Replace file",
      changeNoteLabel: "What changed in this version?",
      changeNotePlaceholder: "e.g. Added side project section, tightened summary…",
      changeNoteHint: "Up to 200 characters",
      keepMetadataLabel: "Keep existing tags, description, and flags",
      submit: "Save as new version",
      submitting: "Saving…",
      cancel: "Cancel",
    },
    compare: {
      title: "Compare versions",
      subtitle: "Pick two versions to review side by side.",
      left: "Left",
      right: "Right",
      picker: "Choose version",
      noDiff: "No textual differences detected.",
      pdfFallback: "Visual side-by-side preview (no text diff for PDFs).",
      docxFallback: "DOCX diff is not available. Download both to compare.",
      imageHint: "Slide the divider to compare.",
    },
    confirmRestore: {
      title: "Restore this version?",
      description: (n) =>
        `Restoring v${n} will create a new version with its content. Existing versions stay intact.`,
      cancel: "Cancel",
      confirm: "Restore",
    },
    toasts: {
      versionSaved: (n) => `Version ${n} saved. Previous version archived.`,
      saveFailed: "Could not save new version.",
      restored: (n) => `Restored — now at version ${n}.`,
      restoreFailed: "Could not restore version.",
    },
  },
  tags: {
    pageTitle: "Tags",
    pageDescription: "Rename, merge, or delete the tags you've added to vault files.",
    breadcrumb: "Tags",
    searchPlaceholder: "Search tags…",
    popular: "Popular",
    all: "All",
    totalCount: (n) => `${n} tags`,
    filesWithTag: (n) => `${n} ${n === 1 ? "file" : "files"}`,
    emptyTitle: "No tags yet",
    emptyDescription: "Add tags when you upload files to see them here.",
    aiBadge: "AI",
    actions: {
      rename: "Rename",
      merge: "Merge",
      delete: "Delete",
      viewFiles: "View files",
    },
    rename: {
      title: "Rename tag",
      label: "New name",
      placeholder: "e.g. senior-level",
      hint: "Lowercase, hyphen-separated.",
      submit: "Rename",
      cancel: "Cancel",
    },
    merge: {
      title: "Merge tags",
      description:
        "Pick one or more source tags and one destination. Files holding a source will switch to the destination.",
      sourcesLabel: "Source tags",
      targetLabel: "Destination tag",
      targetPlaceholder: "e.g. tech",
      submit: "Merge",
      cancel: "Cancel",
    },
    confirmDelete: {
      title: "Delete this tag?",
      description: (tag, n) =>
        `“${tag}” will be removed from ${n} ${n === 1 ? "file" : "files"}.`,
      cancel: "Cancel",
      confirm: "Delete",
    },
    toasts: {
      renamed: (n) => `Renamed across ${n} ${n === 1 ? "file" : "files"}`,
      merged: (n) => `Merged across ${n} ${n === 1 ? "file" : "files"}`,
      deleted: (n) => `Removed from ${n} ${n === 1 ? "file" : "files"}`,
      failed: "Could not complete tag change.",
    },
    autocomplete: {
      usageCount: (n) => `${n}`,
      createNew: (tag) => `Create "${tag}"`,
      aiSuggested: "AI suggested",
    },
  },
  smartTags: {
    analyzing: "Analysing your file…",
    bannerTitle: "AI suggested these values",
    bannerDescription: "Review and adjust before uploading.",
    confidence: (pct) => `${pct}% confident`,
    applied: "Applied",
    acceptAll: "Use all",
    dismiss: "Dismiss",
    privacyDisclaimer:
      "AI analysis sends your file to Anthropic for tagging. You can disable this in settings.",
    settingsLink: "Manage in settings",
  },
  shares: {
    pageTitle: "Shared links",
    pageDescription:
      "Public links to files or bundles. You control expiration, passwords, and download permissions.",
    breadcrumb: "Shares",
    createButton: "Create share",
    empty: {
      title: "No share links yet",
      description:
        "Generate a link to show a specific file or bundle to a recruiter or collaborator.",
    },
    stats: {
      active: (n) => `${n} active`,
      totalViews: (n) => `${n} total views`,
    },
    sections: {
      active: "Active",
      archived: "Archived",
    },
    card: {
      recipientLabel: (label) => `Recipient: ${label}`,
      noRecipient: "No recipient label",
      viewsCount: (n) => `${n} ${n === 1 ? "view" : "views"}`,
      maxViewsLabel: (used, max) => `${used} / ${max} views`,
      expiresIn: (days) => `${days} ${days === 1 ? "day" : "days"} left`,
      expiresHours: (hours) => `${hours} ${hours === 1 ? "hour" : "hours"} left`,
      expired: "Expired",
      exhausted: "View limit reached",
      revokedBadge: "Revoked",
      passwordBadge: "Password",
      downloadAllowed: "Download allowed",
      downloadBlocked: "Download blocked",
      watermark: "Watermark",
      copyLink: "Copy link",
      linkCopied: "Link copied",
      viewLogs: "Access log",
      extend: "Extend expiration",
      revoke: "Revoke",
      delete: "Delete",
      forFile: (name) => `File: ${name}`,
      forBundle: (name) => `Bundle: ${name}`,
    },
    create: {
      title: "Create share link",
      description: "Pick the guardrails, then copy the link.",
      recipientLabel: "Recipient label (private)",
      recipientPlaceholder: "e.g. Google Recruiter · Sarah",
      recipientHint: "For your tracking. Never shown to the recipient.",
      passwordToggle: "Password-protect the link",
      passwordLabel: "Password",
      passwordPlaceholder: "At least 6 characters",
      passwordHint: "Recipients enter this before viewing.",
      expirationLabel: "Expiration",
      expirationNever: "Never",
      expiration24h: "24 hours",
      expiration7d: "7 days",
      expiration30d: "30 days",
      expirationCustom: "Custom",
      customDateLabel: "Expires on",
      maxViewsLabel: "Max views",
      maxViewsUnlimited: "Unlimited",
      maxViews1: "1",
      maxViews5: "5",
      maxViews10: "10",
      maxViewsCustom: "Custom",
      customViewsLabel: "Limit",
      allowDownloadLabel: "Allow download",
      watermarkLabel: "Apply watermark",
      watermarkHint:
        "Adds recipient label + timestamp to PDF previews so screenshots are traceable.",
      submit: "Create link",
      submitting: "Creating…",
      cancel: "Cancel",
      createdTitle: "Share link ready",
      createdHint: "Copy the URL below or scan the QR code.",
      copyLink: "Copy link",
      linkCopied: "Copied",
      qrTitle: "QR code",
      done: "Done",
    },
    accessLog: {
      title: "Access log",
      description: "Recent viewers of this link. IP addresses are hashed.",
      empty: "Nobody has opened this link yet.",
      actions: {
        viewed: "Viewed",
        downloaded: "Downloaded",
        password_failed: "Password failed",
      },
      ipHashColumn: "IP hash",
      uaColumn: "User agent",
      whenColumn: "When",
      actionColumn: "Action",
      clearAll: "Delete all logs",
      clearConfirm: "Delete every access log for this share?",
      close: "Close",
    },
    toasts: {
      created: "Share link created",
      createFailed: "Could not create share link",
      updated: "Share updated",
      updateFailed: "Could not update share",
      revoked: "Share revoked",
      deleted: "Share deleted",
      linkCopied: "Link copied",
      logsCleared: "Access logs deleted",
    },
    public: {
      sharedBy: (name) => `Shared by ${name}`,
      anonymous: "Shared with you",
      titleFile: "Shared file",
      titleBundle: "Shared bundle",
      fileMeta: (size, when) => `${size} · Shared ${when}`,
      download: "Download",
      downloadBlocked: "Download disabled by sender",
      expiresHint: (when) => `This link expires ${when}.`,
      viewsHint: (used, max) => `Viewed ${used} of ${max} times.`,
      unlimitedViews: (used) => `Viewed ${used} ${used === 1 ? "time" : "times"}.`,
      watermarkNote: "Preview is watermarked for tracing.",
      ctaText: "Want to build your own Career Vault?",
      ctaButton: "Try My Best Live OS",
      bundleFilesHeading: "Files in this bundle",
      errors: {
        notFound: "This share link doesn't exist or has been deleted.",
        revoked: "The sender has revoked this link.",
        expired: "This link has expired.",
        exhausted: "This link has reached its view limit.",
        generic: "Couldn't open this link. Please try again.",
      },
      password: {
        title: "Password required",
        description: "Enter the password you received to view this file.",
        label: "Password",
        placeholder: "Password",
        submit: "Unlock",
        submitting: "Unlocking…",
        invalid: "Incorrect password.",
      },
    },
  },
  bundles: {
    pageTitle: "Export bundles",
    pageDescription:
      "Package your vault files into ready-to-send application or portfolio bundles.",
    breadcrumb: "Bundles",
    newButton: "New bundle",
    empty: {
      title: "No bundles yet",
      description:
        "Start from a template or build your own package from scratch.",
      cta: "Create bundle",
    },
    templates: {
      grad_school: "Graduate School Application",
      tech_job: "Tech Job Application",
      speaking: "Speaking Engagement",
      funding: "Grant / Funding Application",
      custom: "Custom bundle",
    },
    card: {
      fileCount: (n) => `${n} ${n === 1 ? "file" : "files"}`,
      lastExported: (when) => `Exported ${when}`,
      neverExported: "Not exported yet",
      export: "Export",
      edit: "Edit",
      duplicate: "Duplicate",
      delete: "Delete",
      share: "Share",
    },
    wizard: {
      title: "New bundle",
      step1: "Template",
      step1Title: "Choose a starting point",
      step1Description: "Each template suggests categories to include.",
      step2: "Files",
      step2Title: "Select files",
      step2Description: "Drag to reorder. Numbering in the export follows this order.",
      step3: "Cover",
      step3Title: "Cover page",
      step3Description: "A simple title page added as the first page of your export.",
      step4: "Export",
      step4Title: "Export options",
      step4Description: "Pick ZIP for separate files or a single merged PDF.",
      next: "Next",
      back: "Back",
      cancel: "Cancel",
      finish: "Save bundle",
      finishAndExport: "Save & export",
      saving: "Saving…",
      selectFilesHint: "Pick the files you want in the bundle.",
      selectedCount: (n) => `${n} selected`,
      filterByCategory: "Filter by category",
      allCategories: "All categories",
      suggestedCategories: "Suggested",
      reorderHint: "Drag handles to reorder.",
      nameLabel: "Bundle name",
      namePlaceholder: "e.g. Stanford Application – Fall 2026",
      descriptionLabel: "Description (optional)",
      descriptionPlaceholder: "Short note for yourself",
      includeCoverToggle: "Include cover page",
      coverTitleLabel: "Cover title",
      coverTitlePlaceholder: "Title on the cover page",
      coverSubtitleLabel: "Cover subtitle",
      coverSubtitlePlaceholder: "Short descriptor",
      coverRecipientLabel: "Prepared for",
      coverRecipientPlaceholder: "e.g. Stanford MBA Admissions",
      coverPreviewHeading: "Preview",
      formatLabel: "Export format",
      formatZip: "ZIP (separate files)",
      formatZipHint: "Recipient unzips a folder with every file in order.",
      formatMergedPdf: "Single merged PDF",
      formatMergedPdfHint:
        "Concatenates PDFs and images into one document. DOCX files are excluded.",
      mergedPdfWarning: (count) =>
        `${count} non-PDF/non-image file${count === 1 ? "" : "s"} will be excluded.`,
      filenameLabel: "Filename",
      sizeWarning:
        "This bundle is large (>100 MB). Consider removing files or using ZIP.",
    },
    detail: {
      filesHeading: "Files",
      coverHeading: "Cover page",
      exportHeading: "Export",
      noFiles: "This bundle has no files yet.",
    },
    templateDefaults: {
      gradSchoolCover: "Graduate School Application Package",
      techJobCover: "Application Package",
      speakingCover: "Speaker Kit",
      fundingCover: "Grant Application Package",
      customCover: "Custom Bundle",
    },
    toasts: {
      created: "Bundle created",
      createFailed: "Could not create bundle",
      updated: "Bundle updated",
      updateFailed: "Could not save bundle",
      deleted: "Bundle deleted",
      exported: (filename) => `Exported ${filename}`,
      exportFailed: "Export failed",
      exportWithSkipped: (count) =>
        `Exported with ${count} file${count === 1 ? "" : "s"} skipped.`,
    },
    coverFilename: "00_Cover",
  },
  pipeline: {
    pageTitle: "Career Pipeline",
    pageDescription:
      "Track opportunities from research to offer, with follow-ups and next actions.",
    breadcrumb: "Pipeline",
    newButton: "New opportunity",
    filters: {
      all: "All stages",
    },
    stages: {
      researching: "Researching",
      applied: "Applied",
      phone_screen: "Phone screen",
      interviewing: "Interviewing",
      offer: "Offer",
      accepted: "Accepted",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
    },
    stageDescriptions: {
      researching: "Roles worth learning more about before you apply.",
      applied: "Applications sent and waiting for a response.",
      phone_screen: "Recruiter or hiring-manager screens in motion.",
      interviewing: "Active interview loops and prep work.",
      offer: "Offers, negotiations, and final decision work.",
      accepted: "Won opportunities you chose to take.",
      rejected: "Closed loops that did not move forward.",
      withdrawn: "Roles you intentionally stepped away from.",
    },
    stageCount: (n) => `${n}`,
    card: {
      location: "Location",
      excitementScore: (n) => `${n}/10 excitement`,
      matchScore: (n) => `${n}/10 match`,
      appliedAgo: (days) =>
        days === 0
          ? "Applied today"
          : `Applied ${days} ${days === 1 ? "day" : "days"} ago`,
      attachedFiles: (n) => `${n} ${n === 1 ? "file" : "files"}`,
      nextAction: (when) => `Next: ${when}`,
    },
    detail: {
      overview: "Overview",
      jobDescription: "Job description",
      jobLink: "Open posting",
      attachedFiles: "Attached files",
      interactions: "Timeline",
      aiActions: "AI actions",
      nextAction: "Next action",
      stageTimeline: "Stage history",
      addFromVault: "Add from vault",
      uploadAndAttach: "Upload & attach",
      removeFile: "Remove from opportunity",
      noFiles: "No files attached yet.",
      noInteractions: "No activity logged yet.",
      addInteraction: "Log interaction",
      interactionTypes: {
        note: "Note",
        email_sent: "Email sent",
        email_received: "Email received",
        phone_call: "Phone call",
        interview: "Interview",
        offer_received: "Offer received",
        feedback: "Feedback",
      },
      interactionContentPlaceholder: "What happened?",
      interactionSubmit: "Add entry",
      interactionWhenLabel: "When",
      aiAnalyze: "Analyze fit for this JD",
      aiDraft: "Draft cover letter for this role",
      aiPrep: "Prep for interview",
      salaryLabel: "Salary range",
      contactLabel: "Contact",
      notesLabel: "Notes",
      notesPlaceholder: "Anything you want to remember",
      stageReachedAt: (when) => `Reached ${when}`,
      nextActionDateLabel: "Next action date",
      nextActionDescriptionPlaceholder: "What's the next step?",
      excitementLabel: "Excitement (1-10)",
      matchLabel: "Match (1-10)",
      editBtn: "Edit",
      deleteBtn: "Delete",
      confirmDelete: {
        title: "Delete this opportunity?",
        description: (name) =>
          `This will permanently remove ${name} and its entire timeline. Attached vault files are not affected.`,
        cancel: "Cancel",
        confirm: "Delete",
      },
    },
    newModal: {
      title: "New opportunity",
      description: "Capture the essentials. You can add more detail later.",
      companyLabel: "Company",
      companyPlaceholder: "e.g. Stripe",
      roleLabel: "Role",
      rolePlaceholder: "e.g. Senior Backend Engineer",
      locationLabel: "Location",
      locationPlaceholder: "e.g. San Francisco / Remote",
      stageLabel: "Stage",
      jobUrlLabel: "Job posting URL",
      jobUrlPlaceholder: "https://…",
      salaryLabel: "Salary range",
      salaryPlaceholder: "e.g. $200K – $260K",
      submit: "Create opportunity",
      submitting: "Creating…",
      cancel: "Cancel",
    },
    vaultFile: {
      usedInTitle: "Used in applications",
      usedInEmpty: "This file isn't attached to any opportunity yet.",
      viewOpportunity: "Open",
    },
    toasts: {
      created: "Opportunity created",
      createFailed: "Could not create opportunity",
      updated: "Opportunity updated",
      updateFailed: "Could not update opportunity",
      deleted: "Opportunity deleted",
      stageChanged: "Stage updated",
      interactionAdded: "Interaction logged",
    },
  },
};

const overrides: Partial<Record<AppLocale, DeepPartial<CareerVaultCopy>>> = {
  "zh-TW": {
    pageTitle: "職涯檔案庫",
    pageDescription: "集中管理履歷、簡介、大頭照、作品集與其他職涯文件。",
    landing: {
      title: "職涯",
      description: "你的職涯指揮中心——把每份職涯文件都放在隨手可用的地方。",
      vaultCardTitle: "職涯檔案庫",
      vaultCardDescription: "上傳並整理履歷、簡介、大頭照、證書、作品集等。",
      openVault: "開啟檔案庫",
    },
    breadcrumb: { career: "職涯", vault: "檔案庫" },
    searchPlaceholder: "搜尋檔名、標籤或描述…",
    uploadButton: "上傳檔案",
    uploadShort: "上傳",
    stats: {
      filesCount: (count) => `${count} 個檔案`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "履歷",
      cover_letter: "求職信",
      photo: "大頭照",
      bio: "個人簡介",
      portfolio: "作品集",
      credential: "證照",
      reference: "推薦",
      application: "申請文件",
    },
    filters: { all: "全部" },
    sections: { quickAccess: "快速存取", allFiles: "所有檔案" },
    sort: {
      label: "排序",
      recent: "最近",
      name: "檔名 A–Z",
      size: "大小",
      category: "分類",
    },
    view: { grid: "方格", list: "列表", toggleLabel: "檢視" },
    card: {
      masterBadge: "主要",
      starAria: "加入收藏",
      unstarAria: "取消收藏",
    },
    actions: {
      preview: "預覽",
      edit: "編輯",
      download: "下載",
      delete: "刪除",
      star: "收藏",
      unstar: "取消收藏",
      openMenu: "開啟動作選單",
      close: "關閉",
      cancel: "取消",
      save: "儲存變更",
      saving: "儲存中…",
    },
    empty: {
      title: "檔案庫還是空的",
      description: "上傳第一份檔案開始整理你的職涯。",
      suggestionsTitle: "建議",
      suggestionMasterResume: "主要履歷",
      suggestionPhoto: "專業大頭照",
      suggestionBio: "簡短個人簡介",
      noResultsTitle: "沒有符合的檔案",
      noResultsDescription: "試試其他搜尋關鍵字或分類。",
    },
    upload: {
      title: "上傳至職涯檔案庫",
      dragDrop: "將檔案拖放到這裡",
      dragDropActive: "放開以上傳",
      or: "或",
      browse: "選擇檔案",
      accepted: "PDF、DOCX、JPG、PNG、WEBP、MD、TXT",
      maxSize: (mb) => `單檔最多 ${mb} MB`,
      fileLabel: "檔案",
      categoryLabel: "分類",
      categoryPlaceholder: "選擇分類",
      tagsLabel: "標籤",
      tagsHint: "以逗號分隔",
      tagsPlaceholder: "科技、資深、2026",
      descriptionLabel: "描述",
      descriptionPlaceholder: "關於這份檔案的備註（選填）",
      starLabel: "加入收藏",
      masterLabel: "設為主要檔案",
      masterHint: "每個分類只會有一份主要檔案，會取代既有的。",
      submit: "上傳",
      submitting: "上傳中…",
      uploading: (p) => `上傳中… ${p}%`,
    },
    detail: {
      filenameLabel: "檔名",
      categoryLabel: "分類",
      tagsLabel: "標籤",
      descriptionLabel: "描述",
      descriptionEmpty: "尚未填寫描述。",
      createdAt: "建立時間",
      updatedAt: "最後修改",
      fileSize: "大小",
      fileType: "類型",
      openInNewTab: "以新分頁開啟",
      downloadToView: "此格式無法線上預覽，請下載後檢視。",
      unsupportedPreview: "這個檔案格式不支援線上預覽。",
      starred: "已收藏",
      master: "主要檔案",
    },
    deleteDialog: {
      title: "刪除這份檔案？",
      description: (name) => `「${name}」將會從檔案庫永久刪除。`,
      cancel: "取消",
      confirm: "刪除",
    },
    errors: {
      fileTooLarge: (mb) => `檔案太大，最多 ${mb} MB。`,
      invalidType: "不支援此檔案格式。",
      uploadFailed: "上傳失敗，請再試一次。",
      fetchFailed: "無法載入檔案庫。",
      categoryRequired: "請選擇一個分類。",
      notAuthenticated: "需要先登入才能上傳。",
    },
    toasts: {
      uploaded: "檔案已上傳",
      updated: "變更已儲存",
      deleted: "檔案已刪除",
      starred: "已加入快速存取",
      unstarred: "已從快速存取移除",
      updateFailed: "無法儲存變更",
      deleteFailed: "無法刪除檔案",
    },
    versions: {
      tab: "歷史版本",
      title: "版本記錄",
      subtitle: "每當你上傳新版本，舊檔案會被封存在這裡。",
      currentBadge: "目前版本",
      versionLabel: (n) => `第 ${n} 版`,
      viewBtn: "檢視",
      downloadBtn: "下載",
      restoreBtn: "還原",
      compareBtn: "比較",
      loadMore: "載入更多",
      empty: "還沒有舊版本。上傳新版檔案即可開始追蹤變更。",
      retentionWarning: (limit) => `保留最近 ${limit} 份，更舊的版本會自動封存。`,
      uploadNew: {
        trigger: "上傳新版本",
        title: "上傳新版本",
        description:
          "目前檔案會被封存為舊版本；標籤、描述、收藏與主要檔案旗標會保留不變。",
        dropLabel: "替換檔案",
        changeNoteLabel: "這個版本改了什麼？",
        changeNotePlaceholder: "例如：新增個人作品段落、精簡自我介紹…",
        changeNoteHint: "最多 200 字",
        keepMetadataLabel: "保留現有的標籤、描述與旗標",
        submit: "儲存為新版本",
        submitting: "儲存中…",
        cancel: "取消",
      },
      compare: {
        title: "版本比較",
        subtitle: "選擇兩個版本並排檢視。",
        left: "左側",
        right: "右側",
        picker: "選擇版本",
        noDiff: "沒有文字差異。",
        pdfFallback: "以視覺並排方式比較（PDF 不支援文字差異比對）。",
        docxFallback: "DOCX 目前不支援差異比對，請下載後比較。",
        imageHint: "拖動分隔線比較兩張圖。",
      },
      confirmRestore: {
        title: "還原這個版本？",
        description: (n) =>
          `還原第 ${n} 版會建立一份以這個版本內容的新版本；原有版本不會被刪除。`,
        cancel: "取消",
        confirm: "還原",
      },
      toasts: {
        versionSaved: (n) => `已儲存第 ${n} 版，舊版本已封存。`,
        saveFailed: "無法儲存新版本。",
        restored: (n) => `已還原，目前為第 ${n} 版。`,
        restoreFailed: "無法還原該版本。",
      },
    },
    tags: {
      pageTitle: "標籤",
      pageDescription: "重新命名、合併或刪除你為檔案加上的標籤。",
      breadcrumb: "標籤",
      searchPlaceholder: "搜尋標籤…",
      popular: "常用",
      all: "全部",
      totalCount: (n) => `${n} 個標籤`,
      filesWithTag: (n) => `${n} 個檔案`,
      emptyTitle: "還沒有標籤",
      emptyDescription: "上傳檔案時加上標籤，就會顯示在這裡。",
      aiBadge: "AI",
      actions: {
        rename: "重新命名",
        merge: "合併",
        delete: "刪除",
        viewFiles: "查看檔案",
      },
      rename: {
        title: "重新命名標籤",
        label: "新名稱",
        placeholder: "例如：senior-level",
        hint: "請使用小寫與連字號。",
        submit: "重新命名",
        cancel: "取消",
      },
      merge: {
        title: "合併標籤",
        description:
          "選擇一個或多個來源標籤，以及一個目標標籤。擁有來源標籤的檔案會改用目標標籤。",
        sourcesLabel: "來源標籤",
        targetLabel: "目標標籤",
        targetPlaceholder: "例如：tech",
        submit: "合併",
        cancel: "取消",
      },
      confirmDelete: {
        title: "刪除這個標籤？",
        description: (tag, n) => `「${tag}」將從 ${n} 個檔案中移除。`,
        cancel: "取消",
        confirm: "刪除",
      },
      toasts: {
        renamed: (n) => `已在 ${n} 個檔案中重新命名`,
        merged: (n) => `已在 ${n} 個檔案中合併`,
        deleted: (n) => `已從 ${n} 個檔案中移除`,
        failed: "無法完成標籤變更。",
      },
      autocomplete: {
        usageCount: (n) => `${n}`,
        createNew: (tag) => `建立「${tag}」`,
        aiSuggested: "AI 建議",
      },
    },
    smartTags: {
      analyzing: "正在分析你的檔案…",
      bannerTitle: "AI 幫你填好了這些欄位",
      bannerDescription: "上傳前再次檢查、需要時可以調整。",
      confidence: (pct) => `信心值 ${pct}%`,
      applied: "已套用",
      acceptAll: "全部採用",
      dismiss: "關閉",
      privacyDisclaimer:
        "AI 分析會將檔案內容傳送到 Anthropic，可以在設定中關閉。",
      settingsLink: "前往設定",
    },
    shares: {
      pageTitle: "分享連結",
      pageDescription: "公開連結可分享單一檔案或整個套件，你可以設定有效期、密碼與下載權限。",
      breadcrumb: "分享",
      createButton: "建立分享",
      empty: {
        title: "還沒有分享連結",
        description: "產生連結讓招聘者或合作對象看到特定檔案或套件。",
      },
      stats: {
        active: (n) => `${n} 個生效中`,
        totalViews: (n) => `共 ${n} 次瀏覽`,
      },
      sections: { active: "生效中", archived: "已封存" },
      card: {
        recipientLabel: (label) => `對象：${label}`,
        noRecipient: "未標記對象",
        viewsCount: (n) => `${n} 次瀏覽`,
        maxViewsLabel: (used, max) => `${used} / ${max} 次瀏覽`,
        expiresIn: (days) => `剩 ${days} 天`,
        expiresHours: (hours) => `剩 ${hours} 小時`,
        expired: "已過期",
        exhausted: "已達瀏覽上限",
        revokedBadge: "已撤銷",
        passwordBadge: "密碼保護",
        downloadAllowed: "可下載",
        downloadBlocked: "不可下載",
        watermark: "浮水印",
        copyLink: "複製連結",
        linkCopied: "已複製",
        viewLogs: "查看紀錄",
        extend: "延長有效期",
        revoke: "撤銷",
        delete: "刪除",
        forFile: (name) => `檔案：${name}`,
        forBundle: (name) => `套件：${name}`,
      },
      create: {
        title: "建立分享連結",
        description: "設定條件後再複製連結。",
        recipientLabel: "對象標籤（僅自用）",
        recipientPlaceholder: "例如 Google 招聘 · Sarah",
        recipientHint: "僅供你自己追蹤，不會顯示給對方。",
        passwordToggle: "啟用密碼保護",
        passwordLabel: "密碼",
        passwordPlaceholder: "至少 6 個字元",
        passwordHint: "瀏覽前會要求輸入密碼。",
        expirationLabel: "有效期",
        expirationNever: "永不過期",
        expiration24h: "24 小時",
        expiration7d: "7 天",
        expiration30d: "30 天",
        expirationCustom: "自訂日期",
        customDateLabel: "到期日",
        maxViewsLabel: "瀏覽次數上限",
        maxViewsUnlimited: "不限",
        maxViews1: "1",
        maxViews5: "5",
        maxViews10: "10",
        maxViewsCustom: "自訂",
        customViewsLabel: "上限",
        allowDownloadLabel: "允許下載",
        watermarkLabel: "加入浮水印",
        watermarkHint: "在 PDF 預覽加上對象標籤與時間戳，截圖也可追溯。",
        submit: "建立連結",
        submitting: "建立中…",
        cancel: "取消",
        createdTitle: "連結已產生",
        createdHint: "複製下方網址或掃描 QR Code。",
        copyLink: "複製連結",
        linkCopied: "已複製",
        qrTitle: "QR Code",
        done: "完成",
      },
      accessLog: {
        title: "存取紀錄",
        description: "最近開啟此連結的紀錄，IP 皆經過雜湊處理。",
        empty: "目前還沒有人打開此連結。",
        actions: {
          viewed: "已瀏覽",
          downloaded: "已下載",
          password_failed: "密碼錯誤",
        },
        ipHashColumn: "IP 雜湊",
        uaColumn: "User agent",
        whenColumn: "時間",
        actionColumn: "動作",
        clearAll: "清空紀錄",
        clearConfirm: "確定要刪除此分享的所有存取紀錄嗎？",
        close: "關閉",
      },
      toasts: {
        created: "分享連結已建立",
        createFailed: "無法建立分享連結",
        updated: "已更新",
        updateFailed: "更新失敗",
        revoked: "連結已撤銷",
        deleted: "連結已刪除",
        linkCopied: "連結已複製",
        logsCleared: "存取紀錄已刪除",
      },
      public: {
        sharedBy: (name) => `由 ${name} 分享`,
        anonymous: "有人把這份檔案分享給你",
        titleFile: "共享檔案",
        titleBundle: "共享套件",
        fileMeta: (size, when) => `${size}・${when} 分享`,
        download: "下載",
        downloadBlocked: "對方已關閉下載",
        expiresHint: (when) => `此連結將於 ${when} 過期。`,
        viewsHint: (used, max) => `已瀏覽 ${used} / ${max} 次。`,
        unlimitedViews: (used) => `已瀏覽 ${used} 次。`,
        watermarkNote: "預覽已加上浮水印以便追溯。",
        ctaText: "也想打造自己的職涯檔案庫？",
        ctaButton: "試試 My Best Live OS",
        bundleFilesHeading: "套件內的檔案",
        errors: {
          notFound: "連結不存在或已被刪除。",
          revoked: "對方已撤銷此連結。",
          expired: "此連結已過期。",
          exhausted: "已達瀏覽次數上限。",
          generic: "無法打開此連結，請稍後再試。",
        },
        password: {
          title: "需要密碼",
          description: "輸入對方提供的密碼以查看檔案。",
          label: "密碼",
          placeholder: "密碼",
          submit: "解鎖",
          submitting: "解鎖中…",
          invalid: "密碼錯誤。",
        },
      },
    },
    bundles: {
      pageTitle: "匯出套件",
      pageDescription: "把檔案庫中的文件打包成準備寄出的申請或作品套件。",
      breadcrumb: "套件",
      newButton: "新套件",
      empty: {
        title: "還沒有套件",
        description: "可從範本開始，也可自訂打造。",
        cta: "建立套件",
      },
      templates: {
        grad_school: "研究所申請",
        tech_job: "科技業求職",
        speaking: "演講邀約",
        funding: "資助／補助申請",
        custom: "自訂套件",
      },
      card: {
        fileCount: (n) => `${n} 個檔案`,
        lastExported: (when) => `${when} 匯出`,
        neverExported: "尚未匯出",
        export: "匯出",
        edit: "編輯",
        duplicate: "複製",
        delete: "刪除",
        share: "分享",
      },
      wizard: {
        title: "新增套件",
        step1: "範本",
        step1Title: "選擇起點",
        step1Description: "每個範本都附帶建議納入的類別。",
        step2: "選擇檔案",
        step2Title: "選擇檔案",
        step2Description: "拖曳排序。匯出時依此順序編號。",
        step3: "封面",
        step3Title: "封面頁",
        step3Description: "簡單的標題頁，會加在匯出的第一頁。",
        step4: "匯出",
        step4Title: "匯出選項",
        step4Description: "選擇 ZIP 或合併成單一 PDF。",
        next: "下一步",
        back: "上一步",
        cancel: "取消",
        finish: "儲存套件",
        finishAndExport: "儲存並匯出",
        saving: "儲存中…",
        selectFilesHint: "挑選要放進套件的檔案。",
        selectedCount: (n) => `已選 ${n} 個`,
        filterByCategory: "依類別篩選",
        allCategories: "全部類別",
        suggestedCategories: "建議",
        reorderHint: "拖曳把手即可排序。",
        nameLabel: "套件名稱",
        namePlaceholder: "例如：Stanford 申請 – 2026 秋",
        descriptionLabel: "描述（選填）",
        descriptionPlaceholder: "寫給自己的提醒",
        includeCoverToggle: "包含封面頁",
        coverTitleLabel: "封面標題",
        coverTitlePlaceholder: "顯示於封面的標題",
        coverSubtitleLabel: "副標題",
        coverSubtitlePlaceholder: "簡短說明",
        coverRecipientLabel: "對象",
        coverRecipientPlaceholder: "例如：Stanford MBA 招生委員會",
        coverPreviewHeading: "預覽",
        formatLabel: "匯出格式",
        formatZip: "ZIP（獨立檔案）",
        formatZipHint: "對方解壓縮後依序看到每個檔案。",
        formatMergedPdf: "合併單一 PDF",
        formatMergedPdfHint: "把 PDF 與圖片合為一份，DOCX 檔會被略過。",
        mergedPdfWarning: (count) => `${count} 個非 PDF／非圖片檔案將被排除。`,
        filenameLabel: "檔案名稱",
        sizeWarning: "此套件超過 100 MB，建議移除檔案或改用 ZIP。",
      },
      detail: {
        filesHeading: "檔案",
        coverHeading: "封面頁",
        exportHeading: "匯出",
        noFiles: "這個套件還沒有檔案。",
      },
      templateDefaults: {
        gradSchoolCover: "研究所申請資料包",
        techJobCover: "求職資料包",
        speakingCover: "講者資料包",
        fundingCover: "補助申請資料包",
        customCover: "自訂套件",
      },
      toasts: {
        created: "套件已建立",
        createFailed: "無法建立套件",
        updated: "已儲存",
        updateFailed: "儲存失敗",
        deleted: "套件已刪除",
        exported: (filename) => `已匯出 ${filename}`,
        exportFailed: "匯出失敗",
        exportWithSkipped: (count) => `已匯出，略過 ${count} 個檔案。`,
      },
      coverFilename: "00_封面",
    },
    pipeline: {
      pageTitle: "機會管線",
      pageDescription: "追蹤從研究到錄取的每個角色，並直接連結檔案庫。",
      breadcrumb: "管線",
      newButton: "新增機會",
      filters: { all: "所有階段" },
      stages: {
        researching: "研究中",
        applied: "已投遞",
        phone_screen: "初步面談",
        interviewing: "面試中",
        offer: "Offer",
        accepted: "已接受",
        rejected: "被婉拒",
        withdrawn: "已撤回",
      },
      stageCount: (n) => `${n}`,
      card: {
        location: "地點",
        excitementScore: (n) => `興奮度 ${n}/10`,
        matchScore: (n) => `匹配度 ${n}/10`,
        appliedAgo: (days) => (days === 0 ? "今天投遞" : `${days} 天前投遞`),
        attachedFiles: (n) => `${n} 個檔案`,
        nextAction: (when) => `下一步：${when}`,
      },
      detail: {
        overview: "概覽",
        jobDescription: "職缺描述",
        jobLink: "打開職缺連結",
        attachedFiles: "關聯檔案",
        interactions: "互動時間軸",
        aiActions: "AI 動作",
        nextAction: "下一步",
        stageTimeline: "階段紀錄",
        addFromVault: "從檔案庫加入",
        uploadAndAttach: "上傳並加入",
        removeFile: "從機會中移除",
        noFiles: "還沒有關聯任何檔案。",
        noInteractions: "還沒有紀錄。",
        addInteraction: "新增紀錄",
        interactionTypes: {
          note: "筆記",
          email_sent: "寄出信件",
          email_received: "收到信件",
          phone_call: "電話",
          interview: "面試",
          offer_received: "收到 Offer",
          feedback: "回饋",
        },
        interactionContentPlaceholder: "發生了什麼事？",
        interactionSubmit: "加入",
        interactionWhenLabel: "時間",
        aiAnalyze: "分析此職缺的契合度",
        aiDraft: "草擬求職信",
        aiPrep: "面試準備",
        salaryLabel: "薪資範圍",
        contactLabel: "聯絡人",
        notesLabel: "備註",
        notesPlaceholder: "想記錄的任何事",
        stageReachedAt: (when) => `${when} 進入`,
        nextActionDateLabel: "下一步日期",
        nextActionDescriptionPlaceholder: "下一步是什麼？",
        excitementLabel: "興奮度（1-10）",
        matchLabel: "匹配度（1-10）",
        editBtn: "編輯",
        deleteBtn: "刪除",
        confirmDelete: {
          title: "要刪除這個機會嗎？",
          description: (name) => `將永久刪除 ${name} 及其所有時間軸。檔案庫中的檔案不會受影響。`,
          cancel: "取消",
          confirm: "刪除",
        },
      },
      newModal: {
        title: "新增機會",
        description: "先捕捉重點資訊，稍後再補齊細節。",
        companyLabel: "公司",
        companyPlaceholder: "例如：Stripe",
        roleLabel: "職位",
        rolePlaceholder: "例如：資深後端工程師",
        locationLabel: "地點",
        locationPlaceholder: "例如：舊金山／遠端",
        stageLabel: "階段",
        jobUrlLabel: "職缺連結",
        jobUrlPlaceholder: "https://…",
        salaryLabel: "薪資範圍",
        salaryPlaceholder: "例如：$200K – $260K",
        submit: "建立機會",
        submitting: "建立中…",
        cancel: "取消",
      },
      vaultFile: {
        usedInTitle: "被哪些申請使用",
        usedInEmpty: "此檔案還沒有被任何機會引用。",
        viewOpportunity: "打開",
      },
      toasts: {
        created: "機會已建立",
        createFailed: "無法建立",
        updated: "已更新",
        updateFailed: "更新失敗",
        deleted: "機會已刪除",
        stageChanged: "階段已更新",
        interactionAdded: "紀錄已加入",
      },
    },
  },
  "zh-CN": {
    pageTitle: "职涯档案库",
    pageDescription: "集中管理简历、简介、照片、作品集与其他职涯文件。",
    landing: {
      title: "职业",
      description: "你的职涯指挥中心——把每份职涯文件都放在随时可用的地方。",
      vaultCardTitle: "职涯档案库",
      vaultCardDescription: "上传并整理简历、简介、照片、证书、作品集等。",
      openVault: "打开档案库",
    },
    breadcrumb: { career: "职业", vault: "档案库" },
    searchPlaceholder: "搜索文件名、标签或描述…",
    uploadButton: "上传文件",
    uploadShort: "上传",
    stats: {
      filesCount: (count) => `${count} 个文件`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "简历",
      cover_letter: "求职信",
      photo: "照片",
      bio: "个人简介",
      portfolio: "作品集",
      credential: "证书",
      reference: "推荐",
      application: "申请文件",
    },
    filters: { all: "全部" },
    sections: { quickAccess: "快速访问", allFiles: "全部文件" },
    sort: {
      label: "排序",
      recent: "最近",
      name: "名称 A–Z",
      size: "大小",
      category: "分类",
    },
    view: { grid: "网格", list: "列表", toggleLabel: "视图" },
    card: {
      masterBadge: "主文件",
      starAria: "收藏此文件",
      unstarAria: "取消收藏",
    },
    actions: {
      preview: "预览",
      edit: "编辑",
      download: "下载",
      delete: "删除",
      star: "收藏",
      unstar: "取消收藏",
      openMenu: "打开操作菜单",
      close: "关闭",
      cancel: "取消",
      save: "保存更改",
      saving: "保存中…",
    },
    empty: {
      title: "档案库还是空的",
      description: "上传第一份文件开始整理你的职涯。",
      suggestionsTitle: "建议",
      suggestionMasterResume: "主简历",
      suggestionPhoto: "专业照片",
      suggestionBio: "简短个人简介",
      noResultsTitle: "没有匹配的文件",
      noResultsDescription: "试试其他搜索关键字或分类。",
    },
    upload: {
      title: "上传到职涯档案库",
      dragDrop: "拖放文件到此处",
      dragDropActive: "松开以上传",
      or: "或",
      browse: "选择文件",
      accepted: "PDF、DOCX、JPG、PNG、WEBP、MD、TXT",
      maxSize: (mb) => `单个文件最多 ${mb} MB`,
      fileLabel: "文件",
      categoryLabel: "分类",
      categoryPlaceholder: "选择分类",
      tagsLabel: "标签",
      tagsHint: "使用逗号分隔",
      tagsPlaceholder: "技术, 资深, 2026",
      descriptionLabel: "描述",
      descriptionPlaceholder: "关于此文件的备注（可选）",
      starLabel: "加入收藏",
      masterLabel: "设为主文件",
      masterHint: "每个分类只有一个主文件，会替换已有的。",
      submit: "上传",
      submitting: "上传中…",
      uploading: (p) => `上传中… ${p}%`,
    },
    detail: {
      filenameLabel: "文件名",
      categoryLabel: "分类",
      tagsLabel: "标签",
      descriptionLabel: "描述",
      descriptionEmpty: "还没有描述。",
      createdAt: "创建时间",
      updatedAt: "最后修改",
      fileSize: "大小",
      fileType: "类型",
      openInNewTab: "在新标签页打开",
      downloadToView: "此格式无法在线预览，请下载查看。",
      unsupportedPreview: "此文件格式不支持在线预览。",
      starred: "已收藏",
      master: "主文件",
    },
    deleteDialog: {
      title: "删除此文件？",
      description: (name) => `"${name}" 将从档案库永久删除。`,
      cancel: "取消",
      confirm: "删除",
    },
    errors: {
      fileTooLarge: (mb) => `文件过大，最多 ${mb} MB。`,
      invalidType: "不支持此文件格式。",
      uploadFailed: "上传失败，请重试。",
      fetchFailed: "无法加载档案库。",
      categoryRequired: "请选择一个分类。",
      notAuthenticated: "需要先登录才能上传。",
    },
    toasts: {
      uploaded: "文件已上传",
      updated: "更改已保存",
      deleted: "文件已删除",
      starred: "已加入快速访问",
      unstarred: "已从快速访问移除",
      updateFailed: "无法保存更改",
      deleteFailed: "无法删除文件",
    },
    versions: {
      tab: "历史版本",
      title: "版本记录",
      subtitle: "每次上传新文件，旧文件会被归档在这里。",
      currentBadge: "当前版本",
      versionLabel: (n) => `第 ${n} 版`,
      viewBtn: "查看",
      downloadBtn: "下载",
      restoreBtn: "还原",
      compareBtn: "比较",
      loadMore: "加载更多",
      empty: "还没有旧版本。上传新文件即可开始跟踪变更。",
      retentionWarning: (limit) => `仅保留最近 ${limit} 份，更旧的版本会自动归档。`,
      uploadNew: {
        trigger: "上传新版本",
        title: "上传新版本",
        description:
          "当前文件会被归档为旧版本；标签、描述、收藏与主文件标记保持不变。",
        dropLabel: "替换文件",
        changeNoteLabel: "这次更新了什么？",
        changeNotePlaceholder: "例如：新增项目经验、精简概述…",
        changeNoteHint: "最多 200 字",
        keepMetadataLabel: "保留现有标签、描述与标记",
        submit: "保存为新版本",
        submitting: "保存中…",
        cancel: "取消",
      },
      compare: {
        title: "版本比较",
        subtitle: "选两个版本并排查看。",
        left: "左侧",
        right: "右侧",
        picker: "选择版本",
        noDiff: "未检测到文本差异。",
        pdfFallback: "以视觉方式并排比较（PDF 不支持文本差异）。",
        docxFallback: "DOCX 暂不支持差异比较，请下载后再对比。",
        imageHint: "拖动分割线比较两张图片。",
      },
      confirmRestore: {
        title: "还原此版本?",
        description: (n) =>
          `还原第 ${n} 版会以其内容创建新版本，不会删除已有版本。`,
        cancel: "取消",
        confirm: "还原",
      },
      toasts: {
        versionSaved: (n) => `已保存第 ${n} 版,旧版本已归档。`,
        saveFailed: "无法保存新版本。",
        restored: (n) => `已还原,当前为第 ${n} 版。`,
        restoreFailed: "无法还原该版本。",
      },
    },
    tags: {
      pageTitle: "标签",
      pageDescription: "对你在档案库中使用的标签进行重命名、合并或删除。",
      breadcrumb: "标签",
      searchPlaceholder: "搜索标签…",
      popular: "常用",
      all: "全部",
      totalCount: (n) => `${n} 个标签`,
      filesWithTag: (n) => `${n} 个文件`,
      emptyTitle: "还没有标签",
      emptyDescription: "上传文件时添加标签即可在此看到。",
      aiBadge: "AI",
      actions: {
        rename: "重命名",
        merge: "合并",
        delete: "删除",
        viewFiles: "查看文件",
      },
      rename: {
        title: "重命名标签",
        label: "新名称",
        placeholder: "例如:senior-level",
        hint: "请使用小写并以连字符分隔。",
        submit: "重命名",
        cancel: "取消",
      },
      merge: {
        title: "合并标签",
        description:
          "选择一个或多个源标签和一个目标标签。持有源标签的文件会改为目标标签。",
        sourcesLabel: "源标签",
        targetLabel: "目标标签",
        targetPlaceholder: "例如:tech",
        submit: "合并",
        cancel: "取消",
      },
      confirmDelete: {
        title: "删除此标签?",
        description: (tag, n) => `"${tag}" 将从 ${n} 个文件中移除。`,
        cancel: "取消",
        confirm: "删除",
      },
      toasts: {
        renamed: (n) => `已在 ${n} 个文件中重命名`,
        merged: (n) => `已在 ${n} 个文件中合并`,
        deleted: (n) => `已从 ${n} 个文件中移除`,
        failed: "无法完成标签变更。",
      },
      autocomplete: {
        usageCount: (n) => `${n}`,
        createNew: (tag) => `创建 "${tag}"`,
        aiSuggested: "AI 建议",
      },
    },
    smartTags: {
      analyzing: "正在分析你的文件…",
      bannerTitle: "AI 已帮你填好这些值",
      bannerDescription: "上传前可以再检查和调整。",
      confidence: (pct) => `置信度 ${pct}%`,
      applied: "已应用",
      acceptAll: "全部采用",
      dismiss: "关闭",
      privacyDisclaimer:
        "AI 分析会将文件内容发送到 Anthropic,可在设置中关闭。",
      settingsLink: "前往设置",
    },
  },
  ja: {
    pageTitle: "キャリアヴォルト",
    pageDescription:
      "履歴書、自己紹介、写真、ポートフォリオなど、キャリア関連の書類を一元管理。",
    landing: {
      title: "キャリア",
      description: "キャリアのコマンドセンター。あらゆるキャリア書類をまとめて管理しましょう。",
      vaultCardTitle: "キャリアヴォルト",
      vaultCardDescription:
        "履歴書、自己紹介、写真、資格証、ポートフォリオなどをアップロード・整理。",
      openVault: "ヴォルトを開く",
    },
    breadcrumb: { career: "キャリア", vault: "ヴォルト" },
    searchPlaceholder: "ファイル名、タグ、説明を検索…",
    uploadButton: "ファイルをアップロード",
    uploadShort: "アップロード",
    stats: {
      filesCount: (count) => `${count} 件`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "履歴書",
      cover_letter: "カバーレター",
      photo: "写真",
      bio: "自己紹介",
      portfolio: "ポートフォリオ",
      credential: "資格",
      reference: "推薦状",
      application: "応募書類",
    },
    filters: { all: "すべて" },
    sections: { quickAccess: "クイックアクセス", allFiles: "すべてのファイル" },
    sort: {
      label: "並び替え",
      recent: "最近",
      name: "名前 A–Z",
      size: "サイズ",
      category: "カテゴリー",
    },
    view: { grid: "グリッド", list: "リスト", toggleLabel: "表示" },
    card: {
      masterBadge: "マスター",
      starAria: "スターを付ける",
      unstarAria: "スターを外す",
    },
    actions: {
      preview: "プレビュー",
      edit: "編集",
      download: "ダウンロード",
      delete: "削除",
      star: "スター",
      unstar: "スター解除",
      openMenu: "操作メニューを開く",
      close: "閉じる",
      cancel: "キャンセル",
      save: "変更を保存",
      saving: "保存中…",
    },
    empty: {
      title: "ヴォルトは空です",
      description: "最初のファイルをアップロードして始めましょう。",
      suggestionsTitle: "おすすめ",
      suggestionMasterResume: "マスター履歴書",
      suggestionPhoto: "プロフェッショナル写真",
      suggestionBio: "短い自己紹介",
      noResultsTitle: "該当するファイルがありません",
      noResultsDescription: "別のキーワードやカテゴリーで試してください。",
    },
    upload: {
      title: "キャリアヴォルトにアップロード",
      dragDrop: "ここにファイルをドラッグ＆ドロップ",
      dragDropActive: "離してアップロード",
      or: "または",
      browse: "ファイルを選択",
      accepted: "PDF、DOCX、JPG、PNG、WEBP、MD、TXT",
      maxSize: (mb) => `1 ファイル最大 ${mb} MB`,
      fileLabel: "ファイル",
      categoryLabel: "カテゴリー",
      categoryPlaceholder: "カテゴリーを選択",
      tagsLabel: "タグ",
      tagsHint: "カンマ区切り",
      tagsPlaceholder: "技術、シニア、2026",
      descriptionLabel: "説明",
      descriptionPlaceholder: "このファイルに関するメモ（任意）",
      starLabel: "スターを付ける",
      masterLabel: "マスターファイルに指定",
      masterHint: "カテゴリーごとに 1 つだけ。既存を置き換えます。",
      submit: "アップロード",
      submitting: "アップロード中…",
      uploading: (p) => `アップロード中… ${p}%`,
    },
    detail: {
      filenameLabel: "ファイル名",
      categoryLabel: "カテゴリー",
      tagsLabel: "タグ",
      descriptionLabel: "説明",
      descriptionEmpty: "説明はまだありません。",
      createdAt: "作成日",
      updatedAt: "最終更新",
      fileSize: "サイズ",
      fileType: "種類",
      openInNewTab: "新しいタブで開く",
      downloadToView: "オンライン表示不可。ダウンロードして表示してください。",
      unsupportedPreview: "この形式はインラインプレビュー非対応です。",
      starred: "スター済み",
      master: "マスターファイル",
    },
    deleteDialog: {
      title: "このファイルを削除しますか？",
      description: (name) => `「${name}」はヴォルトから完全に削除されます。`,
      cancel: "キャンセル",
      confirm: "削除",
    },
    errors: {
      fileTooLarge: (mb) => `ファイルが大きすぎます（最大 ${mb} MB）。`,
      invalidType: "この形式には対応していません。",
      uploadFailed: "アップロードに失敗しました。",
      fetchFailed: "ヴォルトを読み込めませんでした。",
      categoryRequired: "カテゴリーを選択してください。",
      notAuthenticated: "アップロードにはログインが必要です。",
    },
    toasts: {
      uploaded: "アップロードしました",
      updated: "変更を保存しました",
      deleted: "ファイルを削除しました",
      starred: "クイックアクセスに追加",
      unstarred: "クイックアクセスから削除",
      updateFailed: "変更を保存できませんでした",
      deleteFailed: "ファイルを削除できませんでした",
    },
  },
  ko: {
    pageTitle: "커리어 볼트",
    pageDescription: "이력서, 자기소개, 사진, 포트폴리오 등 커리어 문서를 한 곳에서 관리.",
    landing: {
      title: "커리어",
      description: "커리어의 지휘 본부 — 모든 커리어 문서를 한 곳에 준비해 두세요.",
      vaultCardTitle: "커리어 볼트",
      vaultCardDescription:
        "이력서, 자기소개, 사진, 자격증, 포트폴리오를 업로드하고 정리하세요.",
      openVault: "볼트 열기",
    },
    breadcrumb: { career: "커리어", vault: "볼트" },
    searchPlaceholder: "파일명, 태그, 설명 검색…",
    uploadButton: "파일 업로드",
    uploadShort: "업로드",
    stats: {
      filesCount: (count) => `${count}개 파일`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "이력서",
      cover_letter: "커버레터",
      photo: "사진",
      bio: "자기소개",
      portfolio: "포트폴리오",
      credential: "자격증",
      reference: "추천서",
      application: "지원 서류",
    },
    filters: { all: "전체" },
    sections: { quickAccess: "빠른 접근", allFiles: "모든 파일" },
    sort: {
      label: "정렬",
      recent: "최근",
      name: "이름 A–Z",
      size: "크기",
      category: "분류",
    },
    view: { grid: "그리드", list: "리스트", toggleLabel: "보기" },
    card: {
      masterBadge: "마스터",
      starAria: "별표 추가",
      unstarAria: "별표 제거",
    },
    actions: {
      preview: "미리보기",
      edit: "편집",
      download: "다운로드",
      delete: "삭제",
      star: "별표",
      unstar: "별표 해제",
      openMenu: "동작 메뉴 열기",
      close: "닫기",
      cancel: "취소",
      save: "변경사항 저장",
      saving: "저장 중…",
    },
    empty: {
      title: "볼트가 비어 있습니다",
      description: "첫 번째 파일을 업로드해 시작하세요.",
      suggestionsTitle: "제안",
      suggestionMasterResume: "마스터 이력서",
      suggestionPhoto: "프로페셔널 사진",
      suggestionBio: "짧은 자기소개",
      noResultsTitle: "일치하는 파일이 없습니다",
      noResultsDescription: "다른 검색어나 분류로 시도해 보세요.",
    },
    upload: {
      title: "커리어 볼트에 업로드",
      dragDrop: "여기에 파일을 끌어다 놓으세요",
      dragDropActive: "놓으면 업로드",
      or: "또는",
      browse: "파일 선택",
      accepted: "PDF, DOCX, JPG, PNG, WEBP, MD, TXT",
      maxSize: (mb) => `파일당 최대 ${mb} MB`,
      fileLabel: "파일",
      categoryLabel: "분류",
      categoryPlaceholder: "분류 선택",
      tagsLabel: "태그",
      tagsHint: "쉼표로 구분",
      tagsPlaceholder: "기술, 시니어, 2026",
      descriptionLabel: "설명",
      descriptionPlaceholder: "이 파일에 대한 메모 (선택)",
      starLabel: "별표 표시",
      masterLabel: "마스터 파일로 설정",
      masterHint: "분류당 1개만. 기존 파일을 대체합니다.",
      submit: "업로드",
      submitting: "업로드 중…",
      uploading: (p) => `업로드 중… ${p}%`,
    },
    detail: {
      filenameLabel: "파일명",
      categoryLabel: "분류",
      tagsLabel: "태그",
      descriptionLabel: "설명",
      descriptionEmpty: "설명이 없습니다.",
      createdAt: "생성일",
      updatedAt: "최종 수정",
      fileSize: "크기",
      fileType: "유형",
      openInNewTab: "새 탭에서 열기",
      downloadToView: "온라인 미리보기 불가. 다운로드해서 확인하세요.",
      unsupportedPreview: "이 형식은 인라인 미리보기를 지원하지 않습니다.",
      starred: "별표 있음",
      master: "마스터 파일",
    },
    deleteDialog: {
      title: "이 파일을 삭제할까요?",
      description: (name) => `"${name}"이(가) 볼트에서 영구적으로 삭제됩니다.`,
      cancel: "취소",
      confirm: "삭제",
    },
    errors: {
      fileTooLarge: (mb) => `파일이 너무 큽니다. 최대 ${mb} MB.`,
      invalidType: "지원하지 않는 파일 형식입니다.",
      uploadFailed: "업로드에 실패했습니다.",
      fetchFailed: "볼트를 불러오지 못했습니다.",
      categoryRequired: "분류를 선택하세요.",
      notAuthenticated: "업로드하려면 로그인해야 합니다.",
    },
    toasts: {
      uploaded: "업로드 완료",
      updated: "변경사항 저장됨",
      deleted: "파일 삭제됨",
      starred: "빠른 접근에 추가",
      unstarred: "빠른 접근에서 제거",
      updateFailed: "변경사항을 저장할 수 없습니다",
      deleteFailed: "파일을 삭제할 수 없습니다",
    },
  },
  fr: {
    pageTitle: "Coffre Carrière",
    pageDescription:
      "Stockage centralisé pour CV, bios, photos, portfolios et autres documents de carrière.",
    landing: {
      title: "Carrière",
      description:
        "Votre centre de commande professionnel — tous vos documents de carrière au même endroit.",
      vaultCardTitle: "Coffre Carrière",
      vaultCardDescription:
        "Téléversez et organisez CV, bios, photos, certificats, portfolios et plus.",
      openVault: "Ouvrir le coffre",
    },
    breadcrumb: { career: "Carrière", vault: "Coffre" },
    searchPlaceholder: "Rechercher fichiers, tags, descriptions…",
    uploadButton: "Téléverser un fichier",
    uploadShort: "Téléverser",
    stats: {
      filesCount: (count) => `${count} ${count === 1 ? "fichier" : "fichiers"}`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "CV",
      cover_letter: "Lettre de motivation",
      photo: "Photo",
      bio: "Bio",
      portfolio: "Portfolio",
      credential: "Diplôme / Certif.",
      reference: "Référence",
      application: "Candidature",
    },
    filters: { all: "Tous" },
    sections: { quickAccess: "Accès rapide", allFiles: "Tous les fichiers" },
    sort: {
      label: "Trier",
      recent: "Récent",
      name: "Nom A–Z",
      size: "Taille",
      category: "Catégorie",
    },
    view: { grid: "Grille", list: "Liste", toggleLabel: "Affichage" },
    card: {
      masterBadge: "Principal",
      starAria: "Ajouter aux favoris",
      unstarAria: "Retirer des favoris",
    },
    actions: {
      preview: "Aperçu",
      edit: "Modifier",
      download: "Télécharger",
      delete: "Supprimer",
      star: "Favori",
      unstar: "Retirer",
      openMenu: "Ouvrir le menu",
      close: "Fermer",
      cancel: "Annuler",
      save: "Enregistrer",
      saving: "Enregistrement…",
    },
    empty: {
      title: "Votre coffre est vide",
      description: "Téléversez votre premier fichier pour commencer.",
      suggestionsTitle: "Suggestions",
      suggestionMasterResume: "CV principal",
      suggestionPhoto: "Photo professionnelle",
      suggestionBio: "Bio courte",
      noResultsTitle: "Aucun fichier correspondant",
      noResultsDescription: "Essayez une autre recherche ou catégorie.",
    },
    upload: {
      title: "Téléverser dans le Coffre Carrière",
      dragDrop: "Glissez-déposez un fichier ici",
      dragDropActive: "Relâchez pour téléverser",
      or: "ou",
      browse: "Parcourir",
      accepted: "PDF, DOCX, JPG, PNG, WEBP, MD, TXT",
      maxSize: (mb) => `Jusqu'à ${mb} Mo par fichier`,
      fileLabel: "Fichier",
      categoryLabel: "Catégorie",
      categoryPlaceholder: "Choisir une catégorie",
      tagsLabel: "Tags",
      tagsHint: "Séparés par des virgules",
      tagsPlaceholder: "tech, senior, 2026",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Notes sur ce fichier (facultatif)",
      starLabel: "Ajouter aux favoris",
      masterLabel: "Définir comme principal",
      masterHint: "Un principal par catégorie. Remplace l'existant.",
      submit: "Téléverser",
      submitting: "Téléversement…",
      uploading: (p) => `Téléversement… ${p}%`,
    },
    detail: {
      filenameLabel: "Nom du fichier",
      categoryLabel: "Catégorie",
      tagsLabel: "Tags",
      descriptionLabel: "Description",
      descriptionEmpty: "Aucune description.",
      createdAt: "Créé le",
      updatedAt: "Dernière modification",
      fileSize: "Taille",
      fileType: "Type",
      openInNewTab: "Ouvrir dans un nouvel onglet",
      downloadToView: "Aperçu indisponible. Téléchargez pour voir.",
      unsupportedPreview: "Aperçu en ligne non pris en charge.",
      starred: "Favori",
      master: "Fichier principal",
    },
    deleteDialog: {
      title: "Supprimer ce fichier ?",
      description: (name) => `« ${name} » sera supprimé définitivement du coffre.`,
      cancel: "Annuler",
      confirm: "Supprimer",
    },
    errors: {
      fileTooLarge: (mb) => `Fichier trop volumineux. Max ${mb} Mo.`,
      invalidType: "Type de fichier non pris en charge.",
      uploadFailed: "Échec du téléversement.",
      fetchFailed: "Impossible de charger le coffre.",
      categoryRequired: "Veuillez choisir une catégorie.",
      notAuthenticated: "Vous devez être connecté pour téléverser.",
    },
    toasts: {
      uploaded: "Fichier téléversé",
      updated: "Modifications enregistrées",
      deleted: "Fichier supprimé",
      starred: "Ajouté à l'accès rapide",
      unstarred: "Retiré de l'accès rapide",
      updateFailed: "Impossible d'enregistrer",
      deleteFailed: "Impossible de supprimer",
    },
  },
  it: {
    pageTitle: "Cassaforte Carriera",
    pageDescription:
      "Archivio centralizzato per CV, bio, foto, portfolio e altri documenti di carriera.",
    landing: {
      title: "Carriera",
      description:
        "Il tuo centro di comando professionale — ogni documento di carriera sempre a portata di mano.",
      vaultCardTitle: "Cassaforte Carriera",
      vaultCardDescription:
        "Carica e organizza CV, bio, foto, certificati e portfolio.",
      openVault: "Apri la cassaforte",
    },
    breadcrumb: { career: "Carriera", vault: "Cassaforte" },
    searchPlaceholder: "Cerca file, tag o descrizioni…",
    uploadButton: "Carica file",
    uploadShort: "Carica",
    stats: {
      filesCount: (count) => `${count} ${count === 1 ? "file" : "file"}`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "CV",
      cover_letter: "Lettera di presentazione",
      photo: "Foto",
      bio: "Bio",
      portfolio: "Portfolio",
      credential: "Certificazione",
      reference: "Referenza",
      application: "Candidatura",
    },
    filters: { all: "Tutti" },
    sections: { quickAccess: "Accesso rapido", allFiles: "Tutti i file" },
    sort: {
      label: "Ordina",
      recent: "Recenti",
      name: "Nome A–Z",
      size: "Dimensione",
      category: "Categoria",
    },
    view: { grid: "Griglia", list: "Elenco", toggleLabel: "Vista" },
    card: {
      masterBadge: "Principale",
      starAria: "Aggiungi ai preferiti",
      unstarAria: "Rimuovi dai preferiti",
    },
    actions: {
      preview: "Anteprima",
      edit: "Modifica",
      download: "Scarica",
      delete: "Elimina",
      star: "Preferito",
      unstar: "Rimuovi",
      openMenu: "Apri menu",
      close: "Chiudi",
      cancel: "Annulla",
      save: "Salva modifiche",
      saving: "Salvataggio…",
    },
    empty: {
      title: "La tua cassaforte è vuota",
      description: "Carica il tuo primo file per iniziare.",
      suggestionsTitle: "Suggerimenti",
      suggestionMasterResume: "CV principale",
      suggestionPhoto: "Foto professionale",
      suggestionBio: "Bio breve",
      noResultsTitle: "Nessun file corrispondente",
      noResultsDescription: "Prova una ricerca o categoria diversa.",
    },
    upload: {
      title: "Carica nella Cassaforte",
      dragDrop: "Trascina qui un file",
      dragDropActive: "Rilascia per caricare",
      or: "oppure",
      browse: "Sfoglia",
      accepted: "PDF, DOCX, JPG, PNG, WEBP, MD, TXT",
      maxSize: (mb) => `Max ${mb} MB per file`,
      fileLabel: "File",
      categoryLabel: "Categoria",
      categoryPlaceholder: "Scegli categoria",
      tagsLabel: "Tag",
      tagsHint: "Separati da virgola",
      tagsPlaceholder: "tech, senior, 2026",
      descriptionLabel: "Descrizione",
      descriptionPlaceholder: "Note su questo file (facoltativo)",
      starLabel: "Aggiungi ai preferiti",
      masterLabel: "Imposta come principale",
      masterHint: "Un principale per categoria. Sostituisce l'esistente.",
      submit: "Carica",
      submitting: "Caricamento…",
      uploading: (p) => `Caricamento… ${p}%`,
    },
    detail: {
      filenameLabel: "Nome file",
      categoryLabel: "Categoria",
      tagsLabel: "Tag",
      descriptionLabel: "Descrizione",
      descriptionEmpty: "Nessuna descrizione.",
      createdAt: "Creato il",
      updatedAt: "Ultima modifica",
      fileSize: "Dimensione",
      fileType: "Tipo",
      openInNewTab: "Apri in una nuova scheda",
      downloadToView: "Anteprima non disponibile. Scarica per vedere.",
      unsupportedPreview: "Anteprima non supportata per questo tipo.",
      starred: "Preferito",
      master: "File principale",
    },
    deleteDialog: {
      title: "Eliminare questo file?",
      description: (name) => `"${name}" verrà eliminato definitivamente.`,
      cancel: "Annulla",
      confirm: "Elimina",
    },
    errors: {
      fileTooLarge: (mb) => `File troppo grande. Max ${mb} MB.`,
      invalidType: "Tipo di file non supportato.",
      uploadFailed: "Caricamento non riuscito.",
      fetchFailed: "Impossibile caricare la cassaforte.",
      categoryRequired: "Scegli una categoria.",
      notAuthenticated: "Devi essere autenticato per caricare.",
    },
    toasts: {
      uploaded: "File caricato",
      updated: "Modifiche salvate",
      deleted: "File eliminato",
      starred: "Aggiunto all'accesso rapido",
      unstarred: "Rimosso dall'accesso rapido",
      updateFailed: "Impossibile salvare le modifiche",
      deleteFailed: "Impossibile eliminare il file",
    },
  },
  es: {
    pageTitle: "Bóveda de Carrera",
    pageDescription:
      "Almacenamiento centralizado para CVs, bios, fotos, portafolios y otros documentos de carrera.",
    landing: {
      title: "Carrera",
      description:
        "Tu centro de mando profesional — todos tus documentos de carrera listos en un solo lugar.",
      vaultCardTitle: "Bóveda de Carrera",
      vaultCardDescription:
        "Sube y organiza CVs, bios, fotos, certificados, portafolios y más.",
      openVault: "Abrir bóveda",
    },
    breadcrumb: { career: "Carrera", vault: "Bóveda" },
    searchPlaceholder: "Buscar archivos, etiquetas o descripciones…",
    uploadButton: "Subir archivo",
    uploadShort: "Subir",
    stats: {
      filesCount: (count) => `${count} ${count === 1 ? "archivo" : "archivos"}`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "CV",
      cover_letter: "Carta de presentación",
      photo: "Foto",
      bio: "Bio",
      portfolio: "Portafolio",
      credential: "Credencial",
      reference: "Referencia",
      application: "Solicitud",
    },
    filters: { all: "Todos" },
    sections: { quickAccess: "Acceso rápido", allFiles: "Todos los archivos" },
    sort: {
      label: "Ordenar",
      recent: "Recientes",
      name: "Nombre A–Z",
      size: "Tamaño",
      category: "Categoría",
    },
    view: { grid: "Cuadrícula", list: "Lista", toggleLabel: "Vista" },
    card: {
      masterBadge: "Principal",
      starAria: "Marcar favorito",
      unstarAria: "Quitar favorito",
    },
    actions: {
      preview: "Vista previa",
      edit: "Editar",
      download: "Descargar",
      delete: "Eliminar",
      star: "Favorito",
      unstar: "Quitar favorito",
      openMenu: "Abrir acciones",
      close: "Cerrar",
      cancel: "Cancelar",
      save: "Guardar cambios",
      saving: "Guardando…",
    },
    empty: {
      title: "Tu bóveda está vacía",
      description: "Sube tu primer archivo para empezar.",
      suggestionsTitle: "Sugerencias",
      suggestionMasterResume: "CV principal",
      suggestionPhoto: "Foto profesional",
      suggestionBio: "Bio breve",
      noResultsTitle: "Sin archivos coincidentes",
      noResultsDescription: "Prueba otra búsqueda o categoría.",
    },
    upload: {
      title: "Subir a la Bóveda de Carrera",
      dragDrop: "Arrastra y suelta un archivo aquí",
      dragDropActive: "Suelta para subir",
      or: "o",
      browse: "Elegir archivo",
      accepted: "PDF, DOCX, JPG, PNG, WEBP, MD, TXT",
      maxSize: (mb) => `Hasta ${mb} MB por archivo`,
      fileLabel: "Archivo",
      categoryLabel: "Categoría",
      categoryPlaceholder: "Elige una categoría",
      tagsLabel: "Etiquetas",
      tagsHint: "Separadas por comas",
      tagsPlaceholder: "tech, senior, 2026",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "Notas sobre este archivo (opcional)",
      starLabel: "Marcar como favorito",
      masterLabel: "Marcar como principal",
      masterHint: "Uno principal por categoría. Reemplaza al existente.",
      submit: "Subir",
      submitting: "Subiendo…",
      uploading: (p) => `Subiendo… ${p}%`,
    },
    detail: {
      filenameLabel: "Nombre",
      categoryLabel: "Categoría",
      tagsLabel: "Etiquetas",
      descriptionLabel: "Descripción",
      descriptionEmpty: "Sin descripción.",
      createdAt: "Creado",
      updatedAt: "Última modificación",
      fileSize: "Tamaño",
      fileType: "Tipo",
      openInNewTab: "Abrir en una pestaña nueva",
      downloadToView: "Vista previa no disponible. Descarga para ver.",
      unsupportedPreview: "Tipo de archivo sin vista previa en línea.",
      starred: "Favorito",
      master: "Archivo principal",
    },
    deleteDialog: {
      title: "¿Eliminar este archivo?",
      description: (name) => `"${name}" se eliminará permanentemente de tu bóveda.`,
      cancel: "Cancelar",
      confirm: "Eliminar",
    },
    errors: {
      fileTooLarge: (mb) => `Archivo demasiado grande. Máx ${mb} MB.`,
      invalidType: "Tipo de archivo no compatible.",
      uploadFailed: "Error al subir. Intenta de nuevo.",
      fetchFailed: "No se pudo cargar la bóveda.",
      categoryRequired: "Elige una categoría.",
      notAuthenticated: "Debes iniciar sesión para subir.",
    },
    toasts: {
      uploaded: "Archivo subido",
      updated: "Cambios guardados",
      deleted: "Archivo eliminado",
      starred: "Añadido a acceso rápido",
      unstarred: "Quitado de acceso rápido",
      updateFailed: "No se pudieron guardar los cambios",
      deleteFailed: "No se pudo eliminar",
    },
  },
  vi: {
    pageTitle: "Kho Sự Nghiệp",
    pageDescription:
      "Lưu trữ tập trung CV, giới thiệu, ảnh, portfolio và các tài liệu sự nghiệp khác.",
    landing: {
      title: "Sự nghiệp",
      description:
        "Trung tâm chỉ huy nghề nghiệp của bạn — mọi tài liệu sẵn sàng ở một nơi.",
      vaultCardTitle: "Kho Sự Nghiệp",
      vaultCardDescription:
        "Tải lên và sắp xếp CV, giới thiệu, ảnh, chứng chỉ, portfolio và hơn nữa.",
      openVault: "Mở kho",
    },
    breadcrumb: { career: "Sự nghiệp", vault: "Kho" },
    searchPlaceholder: "Tìm tệp, thẻ hoặc mô tả…",
    uploadButton: "Tải tệp lên",
    uploadShort: "Tải lên",
    stats: {
      filesCount: (count) => `${count} tệp`,
      totalSize: (size) => size,
    },
    categories: {
      resume: "CV",
      cover_letter: "Thư xin việc",
      photo: "Ảnh",
      bio: "Giới thiệu",
      portfolio: "Portfolio",
      credential: "Chứng chỉ",
      reference: "Thư giới thiệu",
      application: "Hồ sơ ứng tuyển",
    },
    filters: { all: "Tất cả" },
    sections: { quickAccess: "Truy cập nhanh", allFiles: "Tất cả tệp" },
    sort: {
      label: "Sắp xếp",
      recent: "Gần đây",
      name: "Tên A–Z",
      size: "Kích thước",
      category: "Danh mục",
    },
    view: { grid: "Lưới", list: "Danh sách", toggleLabel: "Chế độ xem" },
    card: {
      masterBadge: "Chính",
      starAria: "Đánh dấu sao",
      unstarAria: "Bỏ dấu sao",
    },
    actions: {
      preview: "Xem trước",
      edit: "Chỉnh sửa",
      download: "Tải xuống",
      delete: "Xoá",
      star: "Đánh dấu",
      unstar: "Bỏ dấu",
      openMenu: "Mở menu",
      close: "Đóng",
      cancel: "Huỷ",
      save: "Lưu thay đổi",
      saving: "Đang lưu…",
    },
    empty: {
      title: "Kho của bạn đang trống",
      description: "Tải lên tệp đầu tiên để bắt đầu.",
      suggestionsTitle: "Gợi ý",
      suggestionMasterResume: "CV chính",
      suggestionPhoto: "Ảnh chuyên nghiệp",
      suggestionBio: "Giới thiệu ngắn",
      noResultsTitle: "Không tìm thấy tệp",
      noResultsDescription: "Thử tìm kiếm khác hoặc chọn danh mục khác.",
    },
    upload: {
      title: "Tải lên Kho Sự Nghiệp",
      dragDrop: "Kéo và thả tệp vào đây",
      dragDropActive: "Thả để tải lên",
      or: "hoặc",
      browse: "Chọn tệp",
      accepted: "PDF, DOCX, JPG, PNG, WEBP, MD, TXT",
      maxSize: (mb) => `Tối đa ${mb} MB mỗi tệp`,
      fileLabel: "Tệp",
      categoryLabel: "Danh mục",
      categoryPlaceholder: "Chọn danh mục",
      tagsLabel: "Thẻ",
      tagsHint: "Cách nhau bằng dấu phẩy",
      tagsPlaceholder: "tech, senior, 2026",
      descriptionLabel: "Mô tả",
      descriptionPlaceholder: "Ghi chú về tệp này (tuỳ chọn)",
      starLabel: "Đánh dấu sao",
      masterLabel: "Đặt làm tệp chính",
      masterHint: "Mỗi danh mục chỉ một tệp chính. Sẽ thay thế tệp cũ.",
      submit: "Tải lên",
      submitting: "Đang tải lên…",
      uploading: (p) => `Đang tải lên… ${p}%`,
    },
    detail: {
      filenameLabel: "Tên tệp",
      categoryLabel: "Danh mục",
      tagsLabel: "Thẻ",
      descriptionLabel: "Mô tả",
      descriptionEmpty: "Chưa có mô tả.",
      createdAt: "Tạo lúc",
      updatedAt: "Sửa lần cuối",
      fileSize: "Kích thước",
      fileType: "Loại",
      openInNewTab: "Mở trong tab mới",
      downloadToView: "Không xem trước được. Hãy tải xuống.",
      unsupportedPreview: "Định dạng này không hỗ trợ xem trước.",
      starred: "Đã đánh dấu",
      master: "Tệp chính",
    },
    deleteDialog: {
      title: "Xoá tệp này?",
      description: (name) => `"${name}" sẽ bị xoá vĩnh viễn khỏi kho.`,
      cancel: "Huỷ",
      confirm: "Xoá",
    },
    errors: {
      fileTooLarge: (mb) => `Tệp quá lớn. Tối đa ${mb} MB.`,
      invalidType: "Định dạng tệp không được hỗ trợ.",
      uploadFailed: "Tải lên thất bại.",
      fetchFailed: "Không tải được kho.",
      categoryRequired: "Hãy chọn một danh mục.",
      notAuthenticated: "Bạn cần đăng nhập để tải lên.",
    },
    toasts: {
      uploaded: "Đã tải lên",
      updated: "Đã lưu thay đổi",
      deleted: "Đã xoá tệp",
      starred: "Đã thêm vào truy cập nhanh",
      unstarred: "Đã bỏ khỏi truy cập nhanh",
      updateFailed: "Không lưu được thay đổi",
      deleteFailed: "Không xoá được tệp",
    },
  },
};

const COPY_MAP = createLocaleCopyMap<CareerVaultCopy>(en, overrides);

export function getCareerVaultCopy(locale: AppLocale): CareerVaultCopy {
  return COPY_MAP[locale];
}
