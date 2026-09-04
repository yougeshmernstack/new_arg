"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setThemeToken } from "@/lib/themeApi";

/** Accepts admin "Login as" tokens via ?token=… */
export function ThemeAuthBootstrap() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token")?.trim();
    if (!token) return;

    setThemeToken(token);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("token");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return null;
}
