import amqp from "amqplib";


let connection = null;
let channel = null;

export const connectToRabbitMQ = async () => {
  try {

    
    if (connection !== null && channel !== null) {
      return channel;
    }

    
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://admin:admin@rabbitmq:5672"; 
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    
    await channel.assertQueue("simulation_jobs", {durable: true});

    
    console.log("Connected to RabbitMQ");

    
    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err);
      connection = null;
      channel = null;
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed");
      connection = null;
      channel = null;
    });

    return channel;

  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    throw error;
  }
};



export const publishSimulationJob = async (queueName, data) => {
  try {
    
    
    const channel = await connectToRabbitMQ();




    const message = JSON.stringify(data);

    return channel.sendToQueue(queueName, Buffer.from(message));

  } catch (error) {
    console.error("Failed to publish to RabbitMQ queue:", error);
    throw error;
  }
};
