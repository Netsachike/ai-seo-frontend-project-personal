"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useMounted } from "@/lib/hooks/use-mounted";
import { usePreferences } from "@/features/preferences/use-preferences";
import { Button } from "@/components/ui/button";

/** Sun/moon icon button: flips between light and dark. System lives in Settings → Profile. */
export function ThemeToggle({ persist = true, className }: { persist?: boolean; className?: string }) {
  const t = useTranslations("shell.theme");
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = usePreferences({ persist });
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={dark ? t("toLight") : t("toDark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
