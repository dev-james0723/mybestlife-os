import packageJson from "../../../package.json";

/** @deprecated Use {@link getAppDisplayName} from `@/lib/i18n/app-brand` for UI that follows the user's language. */
export const APP_DISPLAY_NAME = "My Best Life OS";

export const APP_VERSION: string = packageJson.version;
