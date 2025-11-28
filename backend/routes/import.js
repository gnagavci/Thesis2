import express from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { z } from "zod";
import { authenticateJWTToken } from "../middleware/auth.js";

const router = express.Router();


const upload = multer({

  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024, 
    files: 1, 
  },
  fileFilter: (req, file, cb) => {
    

    if (
      file.mimetype === "application/json" ||
      file.originalname.endsWith(".json")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JSON files are allowed"), false);
    }
  },
});


function changeMovementValue(value){
  value = value.toLowerCase().trim();
  switch (value) {
    case "static":
      return "None"
    
    case "random":
      return "Random"

    case "directed":
      return "Directed"

    case "collective":
      return "Collective"

    case "flow":
      return "Flow"
    default:
      return "Random"
  }
}


const SimulationSchema = z
  .object({
    title: z.string().min(1).max(255),
    mode: z.enum(["2D", "3D"]),
    substrate: z.string().min(1).max(100),
    duration: z.number().positive().max(1000),
    tumorCount: z.number().int().min(1).max(10000),
  
    decayRate: z.number().min(0).max(1).optional().default(0.1),
    divisionRate: z.number().min(0).max(10).optional().default(0.05),
    x: z.number().int().min(0).max(1000).optional().default(100),
    y: z.number().int().min(0).max(1000).optional().default(100),
    z: z.number().int().min(0).max(1000).optional(),
    immuneCount: z.number().int().min(0).max(10000).optional().default(50),
    stemCount: z.number().int().min(0).max(10000).optional().default(25),
    fibroblastCount: z.number().int().min(0).max(10000).optional().default(75),
    drugCarrierCount: z.number().int().min(0).max(10000).optional().default(30),

    tumorMovement: z
      .enum(["static", "random", "directed", "collective", "flow", "none"])
      .optional()
      .default("random"),
    immuneMovement: z
      .enum(["static", "random", "directed", "collective", "flow", "none"])
      .optional()
      .default("directed"),
    stemMovement: z
      .enum(["static", "random", "directed", "collective", "flow", "none"])
      .optional()
      .default("static"),
    fibroblastMovement: z
      .enum(["static", "random", "directed", "collective", "flow", "none"])
      .optional()
      .default("random"),
    drugCarrierMovement: z
      .enum(["static", "random", "directed", "collective", "flow", "none"])
      .optional()
      .default("directed"),
  })
  .refine(
    
    (data) => {
      
      if (data.mode === "2D" && data.z && data.z !== 0){

        return false;
      } 
      
      if (data.mode === "3D" && (data.z === undefined || data.z === null)){

        return false;
      }
      return true;
    },
    
    {
      message:"Z coordinate is required for 3D mode and should be 0 or omitted for 2D mode",
    }
  );




router.post("/import", authenticateJWTToken, upload.single("file"),
  body("count").isInt({ min: 1, max: 1000 }).withMessage("Count must be between 1 and 1000"),
  async (req, res) => {
    try {
      console.log("Import request received");

      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

     
      if (!req.file) {
        return res.status(400).json({ errors: [{ msg: "No file uploaded" }] });
      }

    
      let simulationSpecs;

      try {
        
        const fileContent = req.file.buffer.toString("utf8");

       
        simulationSpecs = JSON.parse(fileContent);
       
      } catch (error) {

        console.log("JSON Parse Error:", error.message);
        return res.status(400).json({ errors: [{ msg: "Invalid JSON format" }] });
      }

     
      try {
        simulationSpecs = SimulationSchema.parse(simulationSpecs);
        console.log("validation good");

       
        simulationSpecs.tumorMovement = changeMovementValue(simulationSpecs.tumorMovement);

        simulationSpecs.immuneMovement = changeMovementValue(simulationSpecs.immuneMovement);
        simulationSpecs.stemMovement = changeMovementValue(
          simulationSpecs.stemMovement
        );
        simulationSpecs.fibroblastMovement = changeMovementValue(
          simulationSpecs.fibroblastMovement
        );
        simulationSpecs.drugCarrierMovement = changeMovementValue(
          simulationSpecs.drugCarrierMovement
        );

        console.log("Processed data with DB enum values:", simulationSpecs);

      } catch (error) {

        console.log("Schema validation error:", error.errors);
        const validationErrors = error.errors.map((err) => ({
          message: `${err.message}`,
          parameter: err.path.join("."), 
        }));

        return res.status(400).json({ errors: validationErrors });
      }

      const count = parseInt(req.body.count);

      
      console.log(`Validation successful for ${count} simulations`);

      res.json({
        success: true,
        imported: count,
        simulationData: simulationSpecs,
        message: `Successfully validated simulation data for ${count} simulation(s)`});

    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({
        errors: [{ msg: "Internal server error: " + error.message }],
      });
    }
  }
);


export default router;
