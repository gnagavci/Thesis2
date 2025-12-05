import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";


vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/utils/api", () => ({
  apiCall: vi.fn(),
}));

vi.mock("@/hooks/usePolling", () => ({
  usePolling: vi.fn(),
}));


vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});


vi.mock("@/components/SimulationResultsModal", () => ({
  default: ({ isOpen, onClose, simulation }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="results-modal">
        <h2>Simulation Results</h2>
        <p>Results for: {simulation?.title}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));


import SimulationDashboard from "@/components/SimulationDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { apiCall } from "@/utils/api";
import { usePolling } from "@/hooks/usePolling";
import { useNavigate } from "react-router-dom";

const DashboardWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("SimulationDashboard Component", () => {
  
  const mockLogout = vi.fn();
  const mockNavigate = vi.fn();
  const testUser = { id: 1, username: "testuser" };
  const mockRefetch = vi.fn();

  const mockSimulations = [
    {
      id: 1,
      title: "Test Sim 1",
      mode: "3D",
      substrate: "Oxygen",
      duration: 30,
      status: "Done",
      tumorCount: 500,
      immuneCount: 200,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      title: "Running Simulation",
      mode: "2D",
      substrate: "Glucose",
      duration: 45,
      status: "Running",
      tumorCount: 300,
      immuneCount: 150,
      createdAt: "2024-01-15T11:00:00Z",
    },
    {
      id: 3,
      title: "Another Test",
      mode: "3D",
      substrate: "Nutrients",
      duration: 60,
      status: "Submitted",
      tumorCount: 1000,
      immuneCount: 500,
      createdAt: "2024-01-15T12:00:00Z",
    },
  ];

  
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);

    useAuth.mockReturnValue({
      user: testUser,
      logout: mockLogout,
    });

    useNavigate.mockReturnValue(mockNavigate);

    usePolling.mockReturnValue({
      data: null,
      error: null,
      loading: false,
      refetch: mockRefetch,
    });

    apiCall.mockResolvedValue({
      simulations: mockSimulations,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  it("should render dashboard with navigation and controls", async () => {
    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    expect(screen.getByText("Simulation Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Create New Simulation")).toBeInTheDocument();
    expect(screen.getByText("Welcome, testuser")).toBeInTheDocument();

    
    await waitFor(() => {
      expect(screen.getByText("Test Sim 1")).toBeInTheDocument();
    });
  });

  
  it("displays list of simulations from API", async () => {
    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Sim 1")).toBeInTheDocument();
      expect(screen.getByText("Running Simulation")).toBeInTheDocument();
      expect(screen.getByText("Another Test")).toBeInTheDocument();
    });

    
    const doneStatus = screen.getByText("Done");
    expect(doneStatus).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });


  it("should show loading state while fetching", () => {
    apiCall.mockImplementation(() => new Promise(() => {}));

    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    expect(screen.getByText(/loading simulations/i)).toBeInTheDocument();
  });


  
  it("only enables Check Results for completed simulations", async () => {
    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Sim 1")).toBeInTheDocument();
    });

    const checkResultsButtons = screen.getAllByText(/check results/i);
    expect(checkResultsButtons).toHaveLength(3);

    
    const doneSim = screen
      .getByText("Test Sim 1")
      .closest(".simulation-card");
    const doneButton = doneSim.querySelector("button.results-button");
    expect(doneButton).not.toBeDisabled();

    const runningSim = screen
      .getByText("Running Simulation")
      .closest(".simulation-card");
    const runningButton = runningSim.querySelector("button.results-button");
    expect(runningButton).toBeDisabled();
  });

  it("opens results modal when clicking Check Results", async () => {
    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Sim 1")).toBeInTheDocument();
    });

    const doneSimCard = screen
      .getByText("Test Sim 1")
      .closest(".simulation-card");
    const checkResultsButton = doneSimCard.querySelector(
      "button.results-button"
    );

    fireEvent.click(checkResultsButton);
    
    
    await waitFor(() => {
      expect(screen.getByTestId("results-modal")).toBeInTheDocument();
      expect(
        screen.getByText("Results for: Test Sim 1")
      ).toBeInTheDocument();
    });
  });

  it("deletes simulation after user confirms", async () => {
 
    apiCall.mockResolvedValueOnce({ simulations: mockSimulations });
    apiCall.mockResolvedValueOnce({ success: true });

    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Sim 1")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete simulation "Test Sim 1"?'
    );

   
    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith("/simulations/1", {
        method: "DELETE",
      });
    });
  });

  
  it("shows error message when API fails", async () => {
    apiCall.mockRejectedValueOnce(new Error("Network error")); 

    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error: network error/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });
  });

  it("should display empty state when no simulations exist", async () => {
    apiCall.mockResolvedValueOnce({ simulations: [] });

    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByText("You haven't created any simulations yet.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Create your first simulation")
      ).toBeInTheDocument();
    });
  });

  
  it("should redirect to login when not authenticated", () => {
    useAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
    });

    render(
      <DashboardWrapper>
        <SimulationDashboard />
      </DashboardWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
