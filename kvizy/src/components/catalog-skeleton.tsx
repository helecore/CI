"use client";

import { useLocale } from "@/components/locale";
export function CatalogSkeleton() {
  const { t } = useLocale();
  return (
    <div aria-busy="true" aria-label={t.catalogLoading} className="flex flex-1 flex-col">
      <div className="h-80 border-b border-violet-200/70 bg-lavender" />
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
