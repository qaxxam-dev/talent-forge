import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden border border-border/80 shadow-xs", className)} {...props}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/40 bg-muted/20 px-5 py-3.5">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
