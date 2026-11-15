"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isAuthenticated } from "@/utils/auth";

export default function NavNetwork() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  if (!authed) return null;

  return (
    <Link href="/network" className="text-gray-300 transition-colors hover:text-accent">
      Network
    </Link>
  );
}
