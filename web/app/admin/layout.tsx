// app/admin/layout.tsx
import { ReactNode } from "react";
import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />

<main className="w-full min-w-[50vw] md:ml-64 md:ps-10 md:pt-5 p-5 mt-20 md:mt-0">
  {children}
      </main>
    </div>
  );
}