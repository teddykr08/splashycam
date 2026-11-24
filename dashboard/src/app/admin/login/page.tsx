import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { adminConfigured } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Admin · Splashy Cam", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="sc-section sc-admin-login">
      <div className="sc-wrap sc-stack">
        <h1 className="sc-title sc-pitch">admin</h1>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="sc-text">Set ADMIN_PASSWORD (12+ characters) in Vercel to turn on the admin dashboard.</p>
        )}
      </div>
    </main>
  );
}
