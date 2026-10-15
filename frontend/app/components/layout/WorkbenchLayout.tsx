import * as React from "react";
import { Toaster } from "sonner";
import { WorkbenchHeader } from "./WorkbenchHeader";

interface WorkbenchLayoutProps {
  children: React.ReactNode;
}

export function WorkbenchLayout({ children }: WorkbenchLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <WorkbenchHeader />
      <main className="flex-1 px-4 py-6 sm:px-6 md:py-8">
        {children}
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
