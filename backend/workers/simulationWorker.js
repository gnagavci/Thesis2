import amqp from "amqplib";
import dotenv from "dotenv";
import pool from "../config/database.js";


dotenv.config();


function generateSimulationResults(parameters) {
  const {tumorCount, immuneCount, stemCount, fibroblastCount, drugCarrierCount, decayRate, divisionRate, duration, mode} = parameters;

  

  function randomFactor(){
    return 0.9 + Math.random() * 0.2;
  }


   
  const growthFactor = divisionRate - decayRate;
  const timeSteps = duration * 10; 

  let currentTumorCount = tumorCount;
  let killedByImmune = 0;
  let drugEffectiveness = 0;

  
  for (let i = 0; i < timeSteps; i++) {

    
    currentTumorCount *= (1 + growthFactor / timeSteps) * randomFactor();

    
    if (immuneCount > 0) {
      

      let immuneEffect = (immuneCount / 1000) * 0.01 * randomFactor();
      let killed = Math.floor(currentTumorCount * immuneEffect);
      killedByImmune += killed;
      currentTumorCount -= killed;
    }

  
    if (drugCarrierCount > 0) {
      
      let drugEffect = (drugCarrierCount / 100) * 0.005 * randomFactor();
      currentTumorCount *= 1 - drugEffect;
      drugEffectiveness += drugEffect;
    }
  }

  
  const finalTumorCount = Math.max(0, Math.floor(currentTumorCount));
  const survivalRate = Math.max(0, Math.min(1, 1 - finalTumorCount / (tumorCount * 10)));
  
  let immuneEfficiency;
  if(immuneCount > 0){
    immuneEfficiency = killedByImmune / (tumorCount + killedByImmune);
  } else {
    immuneEfficiency = 0;
  }

  

  
  let volumeFactor;
  if (mode === "3D"){
    volumeFactor = 1.5;
  } else {
    volumeFactor = 1.0;
  }

  return {
    initialTumorCount: tumorCount,
    
    finalTumorCount: Math.floor(finalTumorCount * volumeFactor),
    tumorGrowthRate: ((finalTumorCount - tumorCount) / tumorCount) * 100,
    immuneCellsDeployed: immuneCount,
    tumorCellsKilledByImmune: Math.floor(killedByImmune),
    immuneEfficiency: (immuneEfficiency * 100).toFixed(2),
    
    
    stemCellsActivated: Math.floor(stemCount * 0.3 * randomFactor()),
    fibroblastActivity:
      fibroblastCount > 0 ? (Math.random() * 50 + 25).toFixed(2) : 0,
    drugCarriersUsed: drugCarrierCount,
    drugEffectiveness: ((drugEffectiveness * 100) / timeSteps).toFixed(2),
    survivalRate: (survivalRate * 100).toFixed(2),
    simulationDuration: duration,
    mode: mode,

    substrate: parameters.substrate,
    timestamp: new Date().toISOString(),
  };
}


async function startWorker() {
  try {
    
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    const queueName = "simulation_jobs";
    await channel.assertQueue(queueName, {durable: true});

    
    channel.prefetch(1);

    console.log("Simulation worker started");
    console.log(`Waiting for messages in ${queueName} queue...`);

    channel.consume(queueName, async (msg) => {
    if (!msg){

      return;
    } 

    let simulation = null;

    try {
        
      const messageString = msg.content.toString();
      simulation = JSON.parse(messageString);
      console.log(`Received simulation job: ${simulation.simulationId} - "${simulation.title}"`);

        
      await pool.execute("UPDATE simulations SET status = ? WHERE id = ? AND status = ?", 
      ["Running", simulation.simulationId, "Submitted"]);
      console.log(`Simulation ${simulation.simulationId} status updated to Running`);

    
      const processingTime = simulation.duration * 1000; 
      console.log(`Processing for ${simulation.duration} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, processingTime));

    
      const results = generateSimulationResults(simulation);
      console.log(`Simulation ${simulation.simulationId} completed`);

    
      await pool.execute("UPDATE simulations SET status = ?, result = ? WHERE id = ?",
          ["Done", JSON.stringify(results), simulation.simulationId]
        );

    
      console.log(`Results saved for simulation ${simulation.simulationId}`);

      
      channel.ack(msg);
    } catch (error) {
        console.error("Error processing simulation:", error);

        
        channel.nack(msg, false, false);
      }
    });

    
    process.on("SIGINT", async () => {
      console.log("Shutting down worker...");
      await channel.close();
      await connection.close();
      await pool.end();
      
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start worker:", error);
    
    process.exit(1);
  }
}


startWorker();
