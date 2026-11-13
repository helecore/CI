import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { Suspense } from "react";
import { connection } from "next/server";
import { Catalog } from "@/components/catalog";
import { listQuizzes } from "@/lib/quizzes-repo";

export default function Home() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogData />
    </Suspense>
  );
}

async function CatalogData() {
  await connection();
  const quizzes = await listQuizzes();
  return <Catalog initialQuizzes={quizzes} />;
}
