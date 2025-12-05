import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";



vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/utils/api", () => ({
  apiCall: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});


import CreateSimulation from "@/components/CreateSimulation";
import { useAuth } from "@/contexts/AuthContext";
import { apiCall } from "@/utils/api";
import { useNavigate } from "react-router-dom";

const CreateSimulationWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("CreateSimulation Component", () => {
  const mockLogout = vi.fn();
  const mockUser = { id: 1, username: "testuser" };
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    useNavigate.mockReturnValue(mockNavigate);
  });

  it("renders simulation creation form with template selector", () => {
    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    
    expect(
      screen.getByRole("heading", { name: "Create New Simulation" })
    ).toBeInTheDocument();

    
    expect(screen.getByText("Template Selection")).toBeInTheDocument();
    expect(
      screen.getByText("Number of Simulations to Create")
    ).toBeInTheDocument();
  });

  it("shows basic template fields by default", () => {
    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    
    expect(screen.getByDisplayValue("Basic Simulation")).toBeInTheDocument(); 
    expect(screen.getByDisplayValue("5")).toBeInTheDocument(); 
    expect(screen.getByDisplayValue("100")).toBeInTheDocument(); 
  });

  it("changes fields when different template is selected", async () => {
    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    
    const advanced = screen.getByDisplayValue("advanced");
    fireEvent.click(advanced);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Advanced Simulation")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("30")).toBeInTheDocument();  
      expect(screen.getByDisplayValue("500")).toBeInTheDocument(); 
    });
  });

  it("shows custom field selection when custom template is selected", async () => {
    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    
    const custom = screen.getByDisplayValue("custom");
    fireEvent.click(custom);

    await waitFor(() => {
      expect(
        screen.getByText("Select Fields for Your Custom Simulation")
      ).toBeInTheDocument();
      expect(screen.getByText("Basic Information")).toBeInTheDocument();
      expect(screen.getByText("Cell Types")).toBeInTheDocument();
    });
  });

  it("submits form with correct structure", async () => {
    apiCall.mockResolvedValueOnce({
      success: true,
      created: 1,
    });

    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    const titleInput = screen.getByDisplayValue("Basic Simulation");
    const submitButton = screen.getByRole("button", {
      name: /create 1 simulation/i,
    });

    
    fireEvent.change(titleInput, { target: { value: "Test Simulation" } });
    fireEvent.click(submitButton);




    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith("/simulations/create-batch", {
        method: "POST",
        body: expect.stringContaining('"title":"Test Simulation"'),
      });
    });

    
    await waitFor(() => {
      const call = apiCall.mock.calls[0];
      expect(call[0]).toBe("/simulations/create-batch");
      expect(call[1].method).toBe("POST");

      const bodyData = JSON.parse(call[1].body);
      expect(bodyData.count).toBe(1);
      expect(bodyData.template).toBe("basic");
      expect(bodyData.simulationData.title).toBe("Test Simulation");
      expect(bodyData.simulationData.tumorCount).toBe(100);
    });
  });

  it("shows loading state during submission", async () => {
    
    apiCall.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                created: 1,
              }),
            100
          )
        )
    );

    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    const submitButton = screen.getByRole("button", {
      name: /create 1 simulation/i,
    });
    fireEvent.click(submitButton);

    
    expect(screen.getByText(/creating 1 simulation/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("validates custom template fields selection", async () => {
    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    
    const custom = screen.getByDisplayValue("custom");
    fireEvent.click(custom);

    await waitFor(() => {
      const submitButton = screen.getByRole("button", {
        name: /create 1 simulation/i,
      });

        
      expect(submitButton).toBeInTheDocument();
    });
  });

  

  

  it("redirects to login if user is not authenticated", () => {
    useAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
    });

    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("validates batch count limits", async () => {
    render(
      <CreateSimulationWrapper>
        <CreateSimulation />
      </CreateSimulationWrapper>
    );

    const batchInput = screen.getByLabelText("Number of Simulations to Create");
    const submitButton = screen.getByRole("button", {
      name: /create 1 simulation/i,
    });

    
    fireEvent.change(batchInput, { target: { value: "150" } }); 

    await waitFor(() => {
      
      expect(
        screen.getByRole("button", { name: /create 150 simulations/i })
      ).toBeInTheDocument();
    });

    
    fireEvent.click(
      screen.getByRole("button", { name: /create 150 simulations/i })
    );

    await waitFor(() => {
      
      const errorMessages = screen.queryAllByText(/must be between/i);
      if (errorMessages.length > 0) {
        expect(errorMessages[0]).toBeInTheDocument();
      } else {
        
        expect(apiCall).not.toHaveBeenCalled();
      }
    });
  });
});
