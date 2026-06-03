// @vitest-environment happy-dom
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router-dom";
import { Summary } from "./Summary";
import { seedData } from "../storage/seed";

it("Summary has no axe violations (person with meetings)", async () => {
  // Maya (p-maya) has a rich meeting history including the summary screen's
  // characteristic 22% low-talk-share meeting.
  const { container } = render(
    <MemoryRouter>
      <Summary data={seedData()} personId="p-maya" now="2026-06-04" />
    </MemoryRouter>,
  );
  expect(await axe(container)).toHaveNoViolations();
});

it("Summary renders a graceful state when person has no meetings", async () => {
  const data = seedData();
  // Clear Maya's meetings to test the empty state
  const mayaIdx = data.people.findIndex((p) => p.id === "p-maya");
  data.people[mayaIdx] = { ...data.people[mayaIdx], meetings: [] };

  const { container, getByText } = render(
    <MemoryRouter>
      <Summary data={data} personId="p-maya" now="2026-06-04" />
    </MemoryRouter>,
  );
  // Graceful empty state renders without axe violations
  expect(await axe(container)).toHaveNoViolations();
  // Back link is present
  expect(getByText(/Back to Maya/i)).toBeTruthy();
});

it("Summary renders a graceful state when person is not found", async () => {
  const { container } = render(
    <MemoryRouter>
      <Summary data={seedData()} personId="p-nonexistent" now="2026-06-04" />
    </MemoryRouter>,
  );
  expect(await axe(container)).toHaveNoViolations();
});
