import type { Metadata } from "next";
import AdminPreview from "./AdminPreview";

export const metadata: Metadata = {
  title: "Admin preview | Splashy Cam",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPreview />;
}
