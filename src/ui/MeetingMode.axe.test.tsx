// @vitest-environment happy-dom
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router-dom";
import { MeetingMode } from "./MeetingMode";
import { seedData } from "../storage/seed";

// Note: no fake timers needed here. The setInterval in MeetingMode only starts
// when a user taps a talk-time button (holder !== null && running), so the
// interval never fires during a render-only axe test. This avoids the common
// vitest-axe + fake-timers conflict where frozen timers hang the axe async run.

function renderMeeting(personId = "p-maya") {
  return render(
    <MemoryRouter initialEntries={[`/person/${personId}/meeting`]}>
      <MeetingMode
        data={seedData()}
        personId={personId}
        now="2026-06-04"
        onSave={() => {}}
      />
    </MemoryRouter>,
  );
}

it("MeetingMode has no axe violations", async () => {
  const { container } = renderMeeting();
  expect(await axe(container)).toHaveNoViolations();
});

it("moves focus to the meeting heading on entry", () => {
  renderMeeting();
  // The h1 should receive focus via the useEffect on mount.
  // We check the active element has an aria-label containing "1:1 with".
  expect(document.activeElement).toHaveAttribute(
    "aria-label",
    expect.stringContaining("1:1 with"),
  );
});

it("renders the person name in the heading", () => {
  const { getByRole } = renderMeeting();
  const heading = getByRole("heading", { level: 1 });
  expect(heading.textContent).toMatch(/1:1 with/);
});

it("shows a graceful not-found state for an unknown person", async () => {
  const { getByText, container } = renderMeeting("p-nonexistent");
  getByText("Person not found.");
  expect(await axe(container)).toHaveNoViolations();
});
