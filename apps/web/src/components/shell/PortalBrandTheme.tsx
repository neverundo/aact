"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";

type Branding = {
  display_name: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  has_logo: boolean;
  logo_url: string | null;
};

type Membership = {
  id: number;
  business_id: number;
  business?: { id: number; name: string };
};

type PortalBrandValue = {
  brandName: string | null;
  logoUrl: string | null;
  accent: string | null;
};

const PortalBrandContext = createContext<PortalBrandValue>({
  brandName: null,
  logoUrl: null,
  accent: null,
});

export function usePortalBrand(): PortalBrandValue {
  return useContext(PortalBrandContext);
}

export function PortalBrandTheme({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const memberships = await apiFetch<{ data: Membership[] }>(
          "/api/v1/portal/memberships",
        );
        const first = memberships.data[0];
        if (!first) return;

        const response = await apiFetch<{ data: Branding }>(
          `/api/v1/portal/branding?business_id=${first.business_id}`,
        );
        setBranding(response.data);
        setBrandName(
          response.data.display_name ?? first.business?.name ?? null,
        );
      } catch {
        // Keep default AACT chrome when branding is unavailable.
      }
    })();
  }, []);

  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primary_color);
    root.style.setProperty("--brand-secondary", branding.secondary_color);
    root.style.setProperty("--brand-accent", branding.accent_color);
    return () => {
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-secondary");
      root.style.removeProperty("--brand-accent");
    };
  }, [branding]);

  const style = branding
    ? ({
        ["--brand-primary"]: branding.primary_color,
        ["--brand-secondary"]: branding.secondary_color,
        ["--brand-accent"]: branding.accent_color,
      } as CSSProperties)
    : undefined;

  return (
    <div data-branded={branding ? "true" : "false"} className="contents" style={style}>
      <PortalBrandContext.Provider
        value={{
          brandName,
          logoUrl: branding?.logo_url ?? null,
          accent: branding?.accent_color ?? null,
        }}
      >
        {children}
      </PortalBrandContext.Provider>
    </div>
  );
}
