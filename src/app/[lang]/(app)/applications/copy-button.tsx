"use client";

import { useState } from "react";

/** Copies the textarea just before this button's row. */
export function CopyButton({ label, done }: { label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-cta"
      onClick={async (e) => {
        const box = e.currentTarget.closest(".reminder")?.querySelector("textarea");
        if (!box) return;
        try {
          await navigator.clipboard.writeText(box.value);
        } catch {
          box.select();
        }
        setCopied(true);
      }}
    >
      {copied ? done : label}
    </button>
  );
}
