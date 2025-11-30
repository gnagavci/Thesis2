import express from "express";
import db from "../config/database.js";
import { authenticateJWTToken } from "../middleware/auth.js";
import { publishSimulationJob } from "../config/rabbitmq.js";

const router = express.Router();




router.get("/", authenticateJWTToken, async (req, res) => {
  try {
    
    const userId = req.user.id;

    

    const [simulations] = await db.execute(
      "SELECT id, userId, title, status, createdAt, mode, substrate, duration, decayRate, divisionRate, x, y, z, tumorCount, tumorMovement, immuneCount, immuneMovement, stemCount, stemMovement, fibroblastCount, fibroblastMovement, drugCarrierCount, drugCarrierMovement FROM simulations WHERE userId = ? ORDER BY createdAt DESC",
      [userId]
    );


  
    res.json({
      success: true,
      simulations: simulations,
    });

  } catch (error) {

    console.error("Error fetching simulations:", error);

    
    res.status(500).json({
      success: false,
      error: "Failed to fetch simulations",
    });
  }
});


router.delete("/:id", authenticateJWTToken, async (req, res) => {
  try {
    
    const userId = req.user.id;
    const simulationId = req.params.id;

    
    const [existing] = await db.execute(
      "SELECT id FROM simulations WHERE id = ? AND userId = ?",
      [simulationId, userId]
    );

    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Simulation not found or access denied",
      });
    }

    
    await db.execute("DELETE FROM simulations WHERE id = ? AND userId = ?", [simulationId, userId]);

    
    res.json({
      success: true,
      message: "Simulation deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting simulation:", error);
    
    
    res.status(500).json({
      success: false,
      error: "Failed to delete simulation",
    });
  }
});





router.post("/create-batch", authenticateJWTToken, async (req, res) => {
  



  const connection = await db.getConnection();

  try {
    const { simulationData, count } = req.body;
    const userId = req.user.id;

    
    if (!simulationData || !count || count < 1 || count > 100) {
      return res.status(400).json({
        success: false,
        error: "Invalid request. Count must be between 1 and 100.",
      });
    }

    
    await connection.beginTransaction();

    const createdSimulations = [];

    
    for (let i = 0; i < count; i++) {
     
      

      let title;
      if(simulationData.title){
        title = `${simulationData.title} `;
      } else{
        title = "Untitled Simulation "
      }

      if(count>1){
        title += `#${i + 1}`;
      } else{
        title += ""
      }

      
      const cleanData = {
        ...simulationData,
        z: simulationData.z === undefined ? null : simulationData.z,
        decayRate: simulationData.decayRate === undefined ? null : simulationData.decayRate,
        divisionRate: simulationData.divisionRate === undefined ? null : simulationData.divisionRate,
        immuneCount: simulationData.immuneCount === undefined ? null : simulationData.immuneCount,
        stemCount: simulationData.stemCount === undefined ? null : simulationData.stemCount,
        fibroblastCount: simulationData.fibroblastCount === undefined ? null : simulationData.fibroblastCount,
        drugCarrierCount: simulationData.drugCarrierCount === undefined ? null : simulationData.drugCarrierCount,
        tumorMovement: simulationData.tumorMovement === undefined ? null : simulationData.tumorMovement,
        immuneMovement: simulationData.immuneMovement === undefined ? null : simulationData.immuneMovement,
        stemMovement: simulationData.stemMovement === undefined ? null : simulationData.stemMovement,
        fibroblastMovement: simulationData.fibroblastMovement === undefined ? null : simulationData.fibroblastMovement,
        drugCarrierMovement: simulationData.drugCarrierMovement === undefined ? null : simulationData.drugCarrierMovement,
        x: simulationData.x === undefined ? null : simulationData.x,
        y: simulationData.y === undefined ? null : simulationData.y
      };

      const [result] = await connection.execute(
        `INSERT INTO simulations (
          userId, title, mode, substrate, duration, decayRate, divisionRate,
          x, y, z, tumorCount, tumorMovement, immuneCount, immuneMovement,
          stemCount, stemMovement, fibroblastCount, fibroblastMovement,
          drugCarrierCount, drugCarrierMovement, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
        [
          userId,
          title,
          cleanData.mode,
          cleanData.substrate,
          cleanData.duration,
          cleanData.decayRate,
          cleanData.divisionRate,
          cleanData.x,
          cleanData.y,
          cleanData.z,
          cleanData.tumorCount,
          cleanData.tumorMovement,
          cleanData.immuneCount,
          cleanData.immuneMovement,
          cleanData.stemCount,
          cleanData.stemMovement,
          cleanData.fibroblastCount,
          cleanData.fibroblastMovement,
          cleanData.drugCarrierCount,
          cleanData.drugCarrierMovement,
        ]
      );

      
      const simulationId = result.insertId;
     

      
      const message = {
        simulationId,
        userId,
        title,
        mode: simulationData.mode || "2D",
        substrate: simulationData.substrate || "Oxygen",
        duration: simulationData.duration || 5,
        decayRate: simulationData.decayRate || 0.1,
        divisionRate: simulationData.divisionRate || 0.1,
        x: simulationData.x || 1,
        y: simulationData.y || 1,
        z: simulationData.z || null,
        tumorCount: simulationData.tumorCount,
        tumorMovement: simulationData.tumorMovement || null,
        immuneCount: simulationData.immuneCount || 0,
        immuneMovement: simulationData.immuneMovement || null,
        stemCount: simulationData.stemCount || 0,
        stemMovement: simulationData.stemMovement || null,
        fibroblastCount: simulationData.fibroblastCount || 0,
        fibroblastMovement: simulationData.fibroblastMovement || null,
        drugCarrierCount: simulationData.drugCarrierCount || 0,
        drugCarrierMovement: simulationData.drugCarrierMovement || null,
      };

      
      await publishSimulationJob("simulation_jobs", message);

      
      createdSimulations.push({id: simulationId, title: title,});
    }

    
    await connection.commit();

    res.json({
      success: true,
      message: `Successfully created and queued ${count} simulation(s)`,
      simulations: createdSimulations,
    });

  } catch (error) {
    
    await connection.rollback();
    console.error("Batch creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create simulations",
    });
  } finally {
    

    connection.release();
  }
});


router.get("/:id/results", authenticateJWTToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const simulationId = req.params.id;

     
    const [simulations] = await db.execute(
      `SELECT id, userId, title, status, result, mode, substrate, duration,
              tumorCount, immuneCount, stemCount, fibroblastCount, drugCarrierCount
       FROM simulations 
       WHERE id = ? AND userId = ?`,
      [simulationId, userId]
    );

    if (simulations.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Simulation not found or access denied",
      });
    }

    const simulation = simulations[0];

    if (simulation.status !== "Done") {
      return res.status(400).json({
        success: false,
        error: "Results not available - simulation not complete",
      });
    }

    res.json({
      success: true,
      id: simulation.id,
      title: simulation.title,
      status: simulation.status,
      result: simulation.result,
      parameters: {
        mode: simulation.mode,
        substrate: simulation.substrate,
        duration: simulation.duration,
        tumorCount: simulation.tumorCount,
        immuneCount: simulation.immuneCount,
        stemCount: simulation.stemCount,
        fibroblastCount: simulation.fibroblastCount,
        drugCarrierCount: simulation.drugCarrierCount,
      },
    });
    
  } catch (error) {
    console.error("Error fetching simulation results:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch simulation results",
    });
  }
});

export default router;



