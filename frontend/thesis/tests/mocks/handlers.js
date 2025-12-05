import { http, HttpResponse } from "msw";


export const handlers = [
  


  http.post("/api/auth/login", async ({ request }) => {
    const { username, password } = await request.json();

    if (username === "testuser" && password === "testpass") {
      return HttpResponse.json({
        token: "mock-jwt-token-12345",
        user: {
          id: 1,
          username: "testuser",}
      });
    } else{

      return HttpResponse.json({ error: "Invalid login credentials" }, { status: 401 });
    }

  }),

  
  http.get("/api/auth/verify", ({ request }) => {
    const authHeader = request.headers.get("authorization");
    
    if (authHeader === "Bearer mock-jwt-token-12345") {
      return HttpResponse.json({
        user: {
          id: 1,
          username: "testuser",
        },
      });
    }

    return HttpResponse.json({ error: "Invalid token" }, { status: 401 });
  }),

  
  

  http.get("/api/simulations", ({ request }) => {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.includes("mock-jwt-token-12345")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        title: "Cancer Simulation",
        input1: 1.5,
        input2: 2.0,
        duration: 30,
        status: "Done",
        result: {
          finalPopulation: 1250,
          growthRate: 0.85,
          dataPoints: [
            { time: 0, population: 100 },
            { time: 10, population: 450 },
            { time: 20, population: 850 },
            { time: 30, population: 1250 },
          ],
        },
        created_at: "2025-07-15T10:00:00Z",
      },
      {
        id: 2,
        title: "Immune simulation",
        input1: 2.5,
        input2: 1.8,
        duration: 45,
        status: "Running",
        result: null,
        created_at: "2025-07-15T11:00:00Z",
      },
      {
        id: 3,
        title: "Drug Simulation",
        input1: 3.2,
        input2: 2.7,
        duration: 60,
        status: "Submitted",
        result: null,
        created_at: "2025-07-15T12:00:00Z",
      },
    ]);
  }),

  
  
  
  http.delete("/api/simulations/:id", ({ params, request }) => {
    const authHeader = request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.includes("mock-jwt-token")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return HttpResponse.json({ message: "Simulation deleted successfully" });
  }),

];
  
