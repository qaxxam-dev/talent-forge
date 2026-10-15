import * as React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { LinksFunction } from "react-router";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { WorkbenchLayout } from "@/components/layout/WorkbenchLayout";

import stylesheet from "./global.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#090d16" />
        <title>TalentForge — Quiet Compliance Desk</title>
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <WorkbenchLayout>
      <Outlet />
    </WorkbenchLayout>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "An unexpected application error occurred.";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive shadow-xs">
        <h2 className="text-lg font-semibold">Application Error</h2>
        <p className="mt-2 text-xs font-mono text-muted-foreground">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
        >
          Reload Workbench
        </button>
      </div>
    </div>
  );
}
