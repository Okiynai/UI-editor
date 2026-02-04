import React from "react";
import { SiteSettingsProvider } from "../../core/osdl/contexts/SiteSettingsContext";
import { LocaleProvider } from "../../core/osdl/contexts/LocaleContext";
import { BreakpointProvider } from "../../core/osdl/contexts/BreakpointContext";
import { UIStateProvider } from "../../core/osdl/contexts/UIStateContext";
import GlobalStyleVariablesInjector from "../../core/osdl/utils/GlobalStyleVariablesInjector";
import type { SiteSettings } from "../../core/OSDL.types";

// Minimal layout example to wire OSDL providers in a Next.js app.
// Replace with your own site settings + locale detection as needed.
const SITE_SETTINGS: SiteSettings = {
  schemaVersion: "osdl_v3.1",
  name: "OSDL Demo",
  defaultLocale: "en-US",
  supportedLocales: ["en-US"],
  globalStyleVariables: {
    colors: {
      primary: "#0f766e",
      text: "#0f172a",
      background: "#ffffff"
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background, #fff)" }}>
      <SiteSettingsProvider settings={SITE_SETTINGS}>
        <GlobalStyleVariablesInjector />
        <LocaleProvider initialActiveLocale={SITE_SETTINGS.defaultLocale}>
          <BreakpointProvider>
            <UIStateProvider>{children}</UIStateProvider>
          </BreakpointProvider>
        </LocaleProvider>
      </SiteSettingsProvider>
    </div>
  );
}
