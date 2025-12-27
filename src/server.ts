import Fastify from "fastify";
import cors from "@fastify/cors";
import { exportDailyBrief } from "./brief";
import { generateLeveragePlan } from "./planner";
import type { FastifyInstance } from "fastify";

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify();

  // Register CORS - allow all origins for ChatGPT Apps compatibility
  await server.register(cors, {
    origin: true, // Allow all origins for ChatGPT Apps
    methods: ["POST", "GET", "OPTIONS"],
    credentials: true
  });

  server.post("/mcp", async () => {
    return {
      tools: [
        {
          name: "generate_leverage_plan",
          description: "Generate a ranked daily plan based on leverage",
          input_schema: {
            type: "object",
            properties: {
              goals: { type: "string" },
              constraints: { type: "string" },
              backlog: { type: "string" }
            },
            required: ["goals", "constraints"]
          }
        },
        {
          name: "export_daily_brief",
          description: "Format a ranked daily plan into a clean daily brief",
          input_schema: {
            type: "object",
            properties: {
              ranked_actions: {
                type: "array",
                items: { type: "string" }
              },
              rationale_summary: { type: "string" },
              date: { type: "string" }
            },
            required: ["ranked_actions", "rationale_summary", "date"]
          }
        }
      ]
    };
  });

  server.post("/mcp/export_daily_brief", async (request) => {
    const body = request.body as any;

    return {
      brief: exportDailyBrief(
        body.ranked_actions ?? [],
        body.rationale_summary ?? "",
        body.date ?? new Date().toISOString().slice(0, 10)
      )
    };
  });

  server.post("/mcp/generate_leverage_plan", async (request) => {
    const body = request.body as any;
    return generateLeveragePlan(
      body.goals,
      body.constraints,
      body.backlog
    );
  });

  server.get("/health", async () => {
    return { status: "ok" };
  });

  return server;
}

// Vercel serverless function handler
let serverInstance: FastifyInstance | null = null;

async function getServer(): Promise<FastifyInstance> {
  if (!serverInstance) {
    serverInstance = await buildServer();
    await serverInstance.ready();
  }
  return serverInstance;
}

export function getHandler() {
  return async function handler(req: any, res: any) {
    const server = await getServer();
    // Fastify handles Node.js req/res natively through its underlying HTTP server
    server.server.emit("request", req, res);
  };
}

// Local development server - only runs when not on Vercel
if (require.main === module && !process.env.VERCEL) {
  buildServer().then((server) => {
    const port = Number(process.env.PORT) || 3000;
    server.listen({ port, host: "0.0.0.0" }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Server running at ${address}`);
    });
  });
}
