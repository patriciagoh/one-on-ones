// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Masthead } from "./Masthead";
import { AuthContext } from "./authContext";

describe("Masthead logout", () => {
  it("shows a Log out button and calls signOut when auth context is provided", async () => {
    const signOut = vi.fn();
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ signOut }}>
          <Masthead />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(signOut).toHaveBeenCalled();
  });

  it("renders no Log out button without auth context (demo build)", () => {
    render(<MemoryRouter><Masthead /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
  });
});
