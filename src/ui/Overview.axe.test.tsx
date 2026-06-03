// @vitest-environment happy-dom
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router-dom";
import { Overview } from "./Overview";
import { seedData } from "../storage/seed";

it("Overview has no axe violations", async () => {
  const { container } = render(
    <MemoryRouter>
      <Overview data={seedData()} now="2026-06-04" />
    </MemoryRouter>,
  );
  expect(await axe(container)).toHaveNoViolations();
});
