import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddUserPage from "app/(features)/admin/add-user/page";
import toast from "react-hot-toast";

jest.mock("react-hot-toast");

describe("AddUserPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mock fetch return results
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock;
  });

  it("renders the form and handles input", () => {
    render(<AddUserPage />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
  });

  it("shows success toast and navigates on successful save", async () => {
    const push = jest.fn();
    // mock next/navigation useRouter
    jest
      .spyOn(require("next/navigation"), "useRouter")
      .mockReturnValue({ push });

    render(<AddUserPage />);
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByText(/Create User/i));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "User created and email sent successfully!"
      );
      expect(push).toHaveBeenCalledWith("/admin/users");
    });
  });

  it("shows error toast on user already exists", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "User already exists" }),
      })
    ) as jest.Mock;

    render(<AddUserPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "exists@example.com" },
    });

    fireEvent.click(screen.getByText(/Create User/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "This email already exists in the system."
      );
    });
  });
});
