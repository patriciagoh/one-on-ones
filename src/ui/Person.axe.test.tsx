// @vitest-environment happy-dom
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router-dom";
import { Person } from "./Person";
import { seedData } from "../storage/seed";

it("Person has no axe violations", async () => {
  const data = seedData();
  const { container } = render(
    <MemoryRouter>
      <Person
        data={data}
        personId="p-maya"
        now="2026-06-04"
        onToggleRaise={() => {}}
        onToggleAction={() => {}}
        onAddAsync={() => {}}
      />
    </MemoryRouter>,
  );
  expect(await axe(container)).toHaveNoViolations();
});

it("Person renders a graceful not-found state", async () => {
  const data = seedData();
  const { container, getByText } = render(
    <MemoryRouter>
      <Person
        data={data}
        personId="p-nonexistent"
        now="2026-06-04"
        onToggleRaise={() => {}}
        onToggleAction={() => {}}
        onAddAsync={() => {}}
      />
    </MemoryRouter>,
  );
  getByText("Person not found.");
  expect(await axe(container)).toHaveNoViolations();
});
