import { cn } from "@/lib/utils";

/** Fixed slot so every provider mark renders at the same CSS size on login buttons. */
const slot = "size-5 shrink-0 block";

type BrandIconProps = {
  className?: string;
};

/**
 * Google “G” multicolor mark (brand colors). Artboard 24×24.
 * @see https://developers.google.com/identity/branding-guidelines
 */
export function GoogleBrandIcon({ className }: BrandIconProps) {
  return (
    <svg className={cn(slot, className)} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Apple logo mark (monochrome; uses button foreground). Artboard 24×24. */
export function AppleBrandIcon({ className }: BrandIconProps) {
  return (
    <svg className={cn(slot, className)} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}

/**
 * Microsoft four-square logo (official brand colors, 21×21 grid with tile gap).
 * @see https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks
 */
export function MicrosoftBrandIcon({ className }: BrandIconProps) {
  return (
    <svg className={cn(slot, className)} viewBox="0 0 21 21" aria-hidden>
      <path fill="#f25022" d="M0 0h10v10H0z" />
      <path fill="#7fba00" d="M11 0h10v10H11z" />
      <path fill="#00a4ef" d="M0 11h10v10H0z" />
      <path fill="#ffb900" d="M11 11h10v10H11z" />
    </svg>
  );
}

/**
 * Facebook “f” on brand blue (two-layer mark; scales cleanly at small sizes).
 * Blue #1877F2 per Meta / Facebook brand; artboard matches common 36×36 asset.
 */
export function FacebookBrandIcon({ className }: BrandIconProps) {
  return (
    <svg className={cn(slot, className)} viewBox="0 0 36 36" aria-hidden>
      <path
        fill="#1877F2"
        d="M36 18C36 8.059 27.941 0 18 0S0 8.059 0 18c0 8.988 6.557 16.431 15.129 17.769V23.593h-4.535v-5.89h4.535v-4.487c0-4.477 2.666-6.952 6.746-6.952 1.956 0 3.998.349 3.998.349v4.396h-2.252c-2.222 0-2.914 1.38-2.914 2.795v3.899h4.956l-.791 5.89h-4.165v12.176C29.443 34.431 36 26.988 36 18Z"
      />
      <path
        fill="#fff"
        d="M24.227 23.593l.791-5.89h-4.956v-3.899c0-1.415.692-2.795 2.914-2.795h2.252V6.613s-2.042-.349-3.998-.349c-4.08 0-6.746 2.475-6.746 6.952v4.487h-4.535v5.89h4.535v12.176c.91.143 1.846.231 2.806.231.96 0 1.896-.088 2.806-.231V23.593h4.13Z"
      />
    </svg>
  );
}
