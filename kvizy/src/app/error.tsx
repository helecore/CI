"use client";

import { useLocale } from "@/components/locale";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CatalogError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-extrabold">{t.catalogError}</h1>
      <p className="text-muted-foreground">
        {t.catalogErrorDescription}
      </p>
      <Button size="lg" onClick={() => retry()}>
        {t.retry}
      </Button>
    </main>
  );
}
