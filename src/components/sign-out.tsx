"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { request } from "./client-api";
export function SignOut() {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="text-button"
        onClick={async () => {
          try {
            await request("/api/auth/sign-out", {});
            window.location.assign("/login");
          } catch {
            setError("Unable to sign out. Please retry.");
          }
        }}
      >
        <LogOut size={16} /> Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
