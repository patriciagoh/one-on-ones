// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("submits the entered email and password", async () => {
    const onSubmit = vi.fn(async () => {});
    render(<LoginScreen onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(onSubmit).toHaveBeenCalledWith("a@b.co", "secret");
  });

  it("shows an error when sign-in fails", async () => {
    const onSubmit = vi.fn(async () => { throw new Error("bad"); });
    render(<LoginScreen onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/wrong email or password/i),
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<LoginScreen onSubmit={async () => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
