"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import CoauthorGraph from "@/components/CoauthorGraph";
import type { CoauthorData } from "@/data/coauthors";

export default function NetworkClient({ data }: { data: CoauthorData }) {
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

  return (
    <main className="px-6 lg:px-24 py-14">
      <CoauthorGraph data={data} />
    </main>
  );
}
