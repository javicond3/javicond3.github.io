"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";
import LoginModal from "@/components/LoginModal";

export default function NavAuthButton() {
  const [showModal, setShowModal] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const handleClick = () => {
    if (isAuthenticated()) {
      router.push("/admin");
    } else {
      setShowModal(true);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    // Re-check auth after modal closes (might have just logged in)
    setAuthed(isAuthenticated());
  };

  return (
    <>
      <button
        onClick={handleClick}
        aria-label={authed ? "Go to Admin" : "Admin Login"}
        title={authed ? "Go to Admin" : "Admin Login"}
        className="text-gray-300 transition-colors hover:text-[#2ecfba] flex items-center"
      >
        {/* Simple person silhouette SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {showModal && <LoginModal onClose={handleModalClose} />}
    </>
  );
}
