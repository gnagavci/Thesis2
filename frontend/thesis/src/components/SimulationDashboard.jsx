import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiCall } from "../utils/api";
import { usePolling } from "../hooks/usePolling";
import SimulationResultsModal from "./SimulationResultsModal";
import {
  FaPlus,
  FaSignOutAlt,
  FaTrashAlt,
  FaChartLine,
  FaSpinner,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { IoFlask } from "react-icons/io5";
import "./SimulationDashboard.css";

const SimulationDashboard = () => {
  const [simulations, setSimulations] = useState([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log(JSON.stringify(user));

  
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  
  const fetchSimulations = useCallback(async () => {
    if (!user) return null;

    try {
      const data = await apiCall("/simulations");
      return data.simulations || [];
    } catch (error) {
      console.error("Error in fetchSimulations:", error);
      throw error;
    }
  }, [user]);

  
  const manualFetch = useCallback(async () => {
    try {
      setManualLoading(true);
      setError(null);
      const data = await fetchSimulations();
      setSimulations(data);
    } catch (err) {
      setError(err.message || "Failed to fetch simulations");
      console.error("Error fetching simulations:", err);
    } finally {
      setManualLoading(false);
    }
  }, [fetchSimulations]);

  
  const {
    data: polledData,
    error: pollingError,
    loading: pollingLoading,
    refetch,
  } = usePolling(fetchSimulations);

  
  useEffect(() => {
    if (polledData) {
      setSimulations(polledData);
    }
  }, [polledData]);

  
  useEffect(() => {
    if (pollingError) {
      console.error("Polling error:", pollingError);
      setError(pollingError.message || "Polling failed");
    }
  }, [pollingError]);

  
  useEffect(() => {
    if (user) {
      manualFetch();
    }
  }, [user, manualFetch]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete simulation "${name}"?`)) {
      return;
    } else {

    try {
      await apiCall(`/simulations/${id}`, { method: "DELETE" });
      
      setSimulations((prev) => prev.filter((sim) => sim.id !== id));
      
      refetch();
    } catch (err) {
      alert(`Failed to delete simulation: ${err.message}`);
      console.error("Error deleting simulation:", err);
    }
  }
  };

  
  const handleCheckResults = (simulation) => {
    console.log("Opening modal for simulation:", simulation);
    setSelectedSimulation(simulation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSimulation(null);
  };


  if (!user) {
    return null;
  }

  const displayError = error || (pollingError ? pollingError.message : null);
  const isLoading = manualLoading;

  return (
    <div className="simulation-dashboard">
      
      <nav className="simulation-nav">
        <div className="nav-left">
          <Link to="/simulations" className="nav-link active">
            <MdDashboard className="nav-icon" />
            <span className="nav-text">Simulation Dashboard</span>
          </Link>
          <Link to="/simulations/new" className="nav-link create-new">
            <FaPlus className="nav-icon" />
            <span className="nav-text">Create New Simulation</span>
          </Link>
        </div>

        <div className="nav-right">
          <span className="user-info">
            <span className="welcome-text">Welcome, {user.username}</span>
          </span>
          <button
            onClick={logout}
            className="logout-button-nav"
            aria-label="Logout"
          >
            <FaSignOutAlt className="logout-icon" />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </nav>

      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="page-title">
            <IoFlask className="title-icon" />
            My Simulations
          </h1>
        </div>

        
        {isLoading && (
          <div className="loading-container">
            <FaSpinner className="spinner" />
            <p>Loading simulations...</p>
          </div>
        )}

        
        {displayError && !isLoading && (
          <div className="error-container">
            <FaExclamationTriangle className="error-icon" />
            <p className="error-message">Error: {displayError}</p>
            <button onClick={manualFetch} className="retry-button">
              <FaRedo className="retry-icon" />
              Try Again
            </button>
          </div>
        )}

        
        {!isLoading && !displayError && simulations.length === 0 && (
          <div className="empty-state">
            <IoFlask className="empty-icon" />
            <p>You haven't created any simulations yet.</p>
            <Link to="/simulations/new" className="create-first-link">
              <FaPlus className="create-icon" />
              Create your first simulation
            </Link>
          </div>
        )}

        
        {!isLoading && !displayError && simulations.length > 0 && (
          <div className="simulations-grid">
            {simulations.map((simulation) => (
              <div key={simulation.id} className="simulation-card">
                <div className="card-header">
                  <h3 className="simulation-name">
                    {simulation.title || "Untitled Simulation"}
                  </h3>
                  <span
                    className={`status status-${simulation.status.toLowerCase()}`}
                  >
                    {simulation.status}
                  </span>
                </div>

                <div className="simulation-details">
                  <div className="detail-row">
                    <span className="label">ID:</span>
                    <span className="value">{simulation.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Mode:</span>
                    <span className="value">{simulation.mode}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Substrate:</span>
                    <span className="value">{simulation.substrate}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Duration:</span>
                    <span className="value">{simulation.duration} minutes</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    onClick={() =>
                      handleDelete(simulation.id, simulation.title)
                    }
                    className="delete-button"
                    aria-label={`Delete ${simulation.title || "simulation"}`}
                  >
                    <FaTrashAlt className="action-icon" />
                    <span className="action-text">Delete</span>
                  </button>
                  <button
                    onClick={() => handleCheckResults(simulation)}
                    className="results-button"
                    disabled={simulation.status !== "Done"}
                    aria-label={`View results for ${
                      simulation.title || "simulation"
                    }`}
                  >
                    <FaChartLine className="action-icon" />
                    <span className="action-text">Check Results</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSimulation && (
        <SimulationResultsModal
          simulationId={selectedSimulation.id}
          simulation={selectedSimulation}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default SimulationDashboard;
