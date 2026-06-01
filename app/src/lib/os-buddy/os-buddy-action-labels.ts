import type { AppLocale } from "@/lib/i18n/app-locale";

export type OSBuddyActionLabelAction =
  | "fillProject"
  | "createThumbnail"
  | "projectDraft"
  | "addAsset"
  | "assetReviewDetails"
  | "projectSettingUp"
  | "projectSetupDone";

export function getOSBuddyActionLabel(params: {
  action: OSBuddyActionLabelAction;
  buddyName: string;
  locale: AppLocale;
}) {
  const name = params.buddyName.trim() || "Xiaoba";
  const zh = params.locale === "zh-TW";

  if (zh) {
    switch (params.action) {
      case "fillProject":
        return `請 ${name} 幫你設定這個專案`;
      case "createThumbnail":
        return `請 ${name} 幫你建立縮圖`;
      case "projectDraft":
        return `${name} 的專案草稿`;
      case "addAsset":
        return `使用 ${name} 新增資產`;
      case "assetReviewDetails":
        return `${name} 會先幫你檢查細節`;
      case "projectSettingUp":
        return `${name} 正在設定你的專案⋯`;
      case "projectSetupDone":
        return `${name} 已完成專案設定`;
      default:
        return `請 ${name} 幫你處理`;
    }
  }

  switch (params.action) {
    case "fillProject":
      return `Ask ${name} to set up this project`;
    case "createThumbnail":
      return `Ask ${name} to create a thumbnail`;
    case "projectDraft":
      return `${name}'s project draft`;
    case "addAsset":
      return `Add asset with ${name}`;
    case "assetReviewDetails":
      return `${name} will review the details`;
    case "projectSettingUp":
      return `${name} is setting up your project…`;
    case "projectSetupDone":
      return `${name} finished setting up your project`;
    default:
      return `Ask ${name} to help`;
  }
}
