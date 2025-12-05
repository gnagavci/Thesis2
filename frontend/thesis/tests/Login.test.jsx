import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "@/components/Login";

describe("Login Component", () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it("should render login form with username and password fields", () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByPlaceholderText("USERNAME")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("PASSWORD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  
  it("successfully logs in with valid credentials", async () => {
    const testUser = { id: 1, username: "testuser" };
    const mockToken = "mock-jwt-token-12345";

    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: mockToken,
        user: testUser,
      }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText("USERNAME");
    const passwordInput = screen.getByPlaceholderText("PASSWORD");
    const loginButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "testpass" } });
    fireEvent.click(loginButton);

    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: "testuser", password: "testpass" }),
        }
      );
    });

    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith("token", mockToken);
    });
    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(testUser);
    });
  });

  it("shows error message for invalid credentials", async () => {
    const errorMessage = "Invalid credentials";

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: errorMessage }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText("USERNAME");
    const passwordInput = screen.getByPlaceholderText("PASSWORD");
    const loginButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: "wronguser" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    
    expect(localStorage.setItem).not.toHaveBeenCalledWith(
      "token",
      expect.any(String)
    );
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("should show loading state while logging in", async () => {

    global.fetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ token: "test-token", user: { id: 1 } }),
              }),
            100
          )
        )
    );

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText("USERNAME");
    const passwordInput = screen.getByPlaceholderText("PASSWORD");
    const loginButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "testpass" } });
    fireEvent.click(loginButton);


    expect(loginButton).toBeDisabled();
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();

    
    await waitFor(() => {
      expect(loginButton).not.toBeDisabled();
    });
  });

  it("displays network error message when request fails", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText("USERNAME");
    const passwordInput = screen.getByPlaceholderText("PASSWORD");
    const loginButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "testpass" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("clears previous error when resubmitting", async () => {
    
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText("USERNAME");
    const passwordInput = screen.getByPlaceholderText("PASSWORD");
    const loginButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: "wronguser" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "token", user: { id: 1 } }),
    });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "testpass" } });
    fireEvent.click(loginButton);

    
    await waitFor(() => {
      expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
    });
  });
});
