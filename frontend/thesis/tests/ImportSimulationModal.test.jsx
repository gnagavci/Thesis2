import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportSimulationModal from "../src/components/ImportSimulationModal";


global.fetch = vi.fn();


const mockLocalStorage = {
  getItem: vi.fn(() => "mock-token"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});


 
const mockFileText = vi.fn();
Object.defineProperty(File.prototype, "text", {
  value: mockFileText,
  writable: true,
});

describe("ImportSimulationModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    fetch.mockImplementation((url) => {
      if (url.includes("/api/simulations/import")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              imported: 1,
              simulationData: {
                title: "Test Simulation",
                mode: "2D",
                substrate: "Oxygen",
                duration: 10,
                tumorCount: 100,
              },
            }),
        });
      }

      
      if (url.includes("/api/simulations/create-batch")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              created: 1,
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    
    mockFileText.mockResolvedValue(
      JSON.stringify({
        title: "Test Simulation",
        mode: "2D",
        substrate: "Oxygen",
        duration: 10,
        tumorCount: 100,
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  
  it("should render modal with all input fields", () => {
    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Import Simulation from File")).toBeInTheDocument();
    expect(screen.getByText("Select JSON File:")).toBeInTheDocument();

    expect(screen.getByText("Number of Simulations:")).toBeInTheDocument();
  });

  it("allows user to select a JSON file", async () => {
    const user = userEvent.setup();

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText("Select JSON File:");
    
    const file = new File(
      [JSON.stringify({ title: "Test Simulation", mode: "2D" })],
      "test.json",
      { type: "application/json" }
    );

    await user.upload(fileInput, file);

    
    expect(fileInput.files[0]).toBe(file);
  });

  it("should reject invalid simulation count", async () => {
    const user = userEvent.setup();

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    
    const fileInput = screen.getByLabelText("Select JSON File:");
    const validFile = new File(
      [
        JSON.stringify({
          title: "Test",
          mode: "2D",
          substrate: "Oxygen",
          duration: 10,
          tumorCount: 100,
        }),
      ],
      "test.json",
      { type: "application/json" }
    );
    await user.upload(fileInput, validFile);

    
    const countInput = screen.getByLabelText("Number of Simulations:");
    await user.clear(countInput);
    await user.type(countInput, "1001");

    const uploadButton = screen.getByText("Import Simulations");
    await user.click(uploadButton);

    expect(
      screen.getByText("Number of simulations must be between 1 and 1000")
    ).toBeInTheDocument();
  });

  it("successfully imports and creates simulation from file", async () => {
    const user = userEvent.setup();

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const validSim = {
      title: "Test Sim",
      mode: "2D",
      substrate: "Oxygen",
      duration: 10,
      tumorCount: 100,
    };

    const fileInput = screen.getByLabelText("Select JSON File:");
    const file = new File(
      [JSON.stringify(validSim)],
      "simulation.json",
      { type: "application/json" }
    );

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText("Import Simulations");
    await user.click(uploadButton);

    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/simulations/import", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
        },
        body: expect.any(FormData),
      });
    });

    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/simulations/create-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-token",
        },
        body: expect.stringContaining("Test Sim"),
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(1);
    });
  });

  it("shows error when validation fails", async () => {
    const user = userEvent.setup();

    
    fetch.mockImplementation((url) => {
      if (url.includes("/api/simulations/import")) {
        return Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              errors: [{ msg: "Invalid simulation data" }],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText("Select JSON File:");
    const file = new File(
      [JSON.stringify({ title: "Test", mode: "2D", substrate: "Oxygen", duration: 10, tumorCount: 100 })],
      "simulation.json",
      { type: "application/json" }
    );

    await user.upload(fileInput, file);
    await user.click(screen.getByText("Import Simulations"));

    await waitFor(() => {
      expect(screen.getByText("Invalid simulation data")).toBeInTheDocument();
    });
  });

  

  it("rejects invalid JSON files", async () => {
    const user = userEvent.setup();

    
    mockFileText.mockResolvedValue("{ invalid json");

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText("Select JSON File:");
    const file = new File(["{ invalid json"], "invalid.json", {
      type: "application/json",
    });

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText("Import Simulations");
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid JSON format")).toBeInTheDocument();
    });
  });

  it("handles missing required fields", async () => {
    const user = userEvent.setup();

    
    mockFileText.mockResolvedValue(
      JSON.stringify({
        title: "Incomplete",
        mode: "2D",
        
      })
    );

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText("Select JSON File:");
    const file = new File(
      [JSON.stringify({ title: "Incomplete", mode: "2D" })],
      "incomplete.json",
      { type: "application/json" }
    );

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText("Import Simulations");
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Missing required fields/)).toBeInTheDocument();
    });
  });

  it("should call onClose when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("disables upload button when no file is selected", () => {
    render(
      <ImportSimulationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const uploadButton = screen.getByRole("button", {
      name: /import simulations/i,
    });
    expect(uploadButton).toBeDisabled();
  });
});
