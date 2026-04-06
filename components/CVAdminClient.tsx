"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import CVBuilder, { CVData } from "@/components/CVBuilder";

interface CVAdminClientProps {
  initialData: CVData;
}

export default function CVAdminClient({ initialData }: CVAdminClientProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fffe" }}>
        <div className="text-gray-500 text-sm">Checking authentication…</div>
      </div>
    );
  }

  return <CVBuilder cvData={initialData} />;
}
