// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ReportForm } from "./ReportForm";

describe("ReportForm", () => {
  it("submits entered fields (add mode)", async () => {
    const onSubmit = vi.fn();
    render(<ReportForm mode="add" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Maya Chen");
    await userEvent.click(screen.getByRole("button", { name: /add report/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Maya Chen", cadenceDays: expect.any(Number) }),
    );
  });

  it("blocks submit when name is blank", async () => {
    const onSubmit = vi.fn();
    render(<ReportForm mode="add" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /add report/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/name/i));
  });

  it("pre-fills in edit mode", () => {
    render(
      <ReportForm
        mode="edit"
        initial={{ name: "Dana", pronouns: "they/them", cadenceDays: 7, seniority: "Staff",
          team: "Infra", location: "New York", timezone: "America/New_York", onCall: false, joinedDate: "2024-01-01" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("Dana");
    expect(screen.getByLabelText(/team/i)).toHaveValue("Infra");
  });

  it("derives timezone from the selected location", async () => {
    const onSubmit = vi.fn();
    render(<ReportForm mode="add" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/name/i), "X");
    await userEvent.selectOptions(screen.getByLabelText(/location/i), "Ontario");
    await userEvent.click(screen.getByRole("button", { name: /add report/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ location: "Ontario", timezone: "America/Toronto" }),
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<ReportForm mode="add" onSubmit={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
