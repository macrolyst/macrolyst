import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.getSession();
  if (!session?.data?.user) redirect("/auth/sign-in");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-(--surface-0)">
      <Sidebar />
      <main className="main-content flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
