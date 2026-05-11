import { LocaleShell } from "@/components/locale-shell";

export default function LocaleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocaleShell />
      {children}
    </>
  );
}
