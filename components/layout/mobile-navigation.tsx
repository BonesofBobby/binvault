"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]"),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen(true)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dialogRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="relative h-full w-[min(18rem,85vw)]"
          >
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <AppSidebar className="h-full w-full" onNavigate={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
