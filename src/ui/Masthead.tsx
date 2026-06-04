// Masthead — shared sticky top bar used by Overview, Person, Summary, and MeetingMode.
// MeetingMode uses it for the wordmark only; its Discard/End&save controls stay
// inside the meeting header card (per the design).
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./authContext";

interface MastheadProps {
  /**
   * Optional slot rendered on the right side of the bar (e.g. "N reports" text).
   * For interactive meeting controls, keep them in the screen's own header card.
   */
  rightSlot?: React.ReactNode;
}

/**
 * Sticky top masthead with the one-on-ones wordmark and an optional right slot / back link.
 *
 * All screens share this component so the wordmark is never duplicated inline.
 */
export function Masthead({ rightSlot }: MastheadProps) {
  const auth = useContext(AuthContext);
  return (
    <header
      className="sticky top-0 z-10 bg-oat border-b border-line"
      style={{ borderBottomColor: "var(--line)" }}
    >
      <div className="max-w-content mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left side: wordmark + subtitle */}
        <div className="flex items-center gap-3">
          {/* Wordmark — decorative link to root */}
          <Link
            to="/"
            className="font-mono font-bold text-sm text-ink tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm"
            aria-label="one-on-ones — home"
          >
            one-on-<span className="text-matcha-deep" aria-hidden="true">ones</span>
          </Link>
          <span className="font-mono text-xs text-muted hidden sm:inline" aria-hidden="true">
            · meaningful 1:1s
          </span>
        </div>

        {/* Right side: passed-in slot + optional logout (supabase build only) */}
        <div className="flex items-center gap-3">
          {rightSlot}
          {auth && (
            <button
              type="button"
              onClick={auth.signOut}
              className="font-mono text-xs text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
