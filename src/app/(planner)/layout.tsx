import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReadOnlyBanner } from "@/components/layout/ReadOnlyBanner";

// Authenticated app shell (sidebar + header). Auth-gating is wired in Phase 5;
// for now it renders the chrome so screens can be migrated against a stable layout.
export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background-standard">
      <Sidebar />
      <Header />
      <main style={{ marginLeft: 212, paddingTop: 64 }}>
        <div className="p-6">
          <ReadOnlyBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
