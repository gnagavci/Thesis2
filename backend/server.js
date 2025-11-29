import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authenticationRoutes from "./routes/auth.js";
import simulationsRoutes from "./routes/simulations.js";
import importRoutes from "./routes/import.js"; 



dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());


app.use("/api/auth", authenticationRoutes);
app.use("/api/simulations", simulationsRoutes);
app.use("/api/simulations", importRoutes); 



app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ message: "Internal server error" });
});



app.get("/health", (req, res) => {

  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});



const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;

