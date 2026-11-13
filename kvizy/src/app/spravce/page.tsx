import type { Metadata } from "next";
import { AdminReports } from "@/components/admin-reports";

export const metadata: Metadata = {
  title: "Hlášení kvízů – správa",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminReports />;
}
