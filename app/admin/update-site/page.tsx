"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpdateSiteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/investor-pulse/update-site");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
      <p className="text-sm text-[#a3a3a3]">Redirecting...</p>
    </div>
  );
}
