import Fastify from "fastify";
import cors from "@fastify/cors";
import { generateLeveragePlan } from "../src/planner";
import { exportDailyBrief } from "../src/brief";

// MCP Scanner Requirements:
// - Node.js runtime (Vercel defaults to nodejs for /api/*.ts files)
// - Immediate static response (no async initialization for scans)
// - Proper headers (Cache-Control: no-store, Content-Type: application/json)
// - Exact MCP schema format
// - Zero redirects, auth, or middleware

let serverInstance: any = null;

// Tool definitions for MCP discovery - STATIC, no dynamic loading
// This must be available synchronously for cold start scans
const TOOL_DEFINITIONS = [
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
];

async function getServer() {
  if (!serverInstance) {
    const server = Fastify();
    await server.register(cors, { origin: true });

    // Handle /mcp (tool definitions) - both GET and POST
    server.get("/mcp", async (request) => {
      return {
        tools: TOOL_DEFINITIONS
      };
    });
    
    server.post("/mcp", async (request) => {
      return {
        tools: TOOL_DEFINITIONS
      };
    });

    // Handle /mcp/generate_leverage_plan
    server.post("/mcp/generate_leverage_plan", async (request) => {
      const body = request.body as any;
      return generateLeveragePlan(body.goals, body.constraints, body.backlog);
    });

    // Handle /mcp/export_daily_brief
    server.post("/mcp/export_daily_brief", async (request) => {
      const body = request.body as any;
      return {
        brief: exportDailyBrief(
          body.ranked_actions,
          body.rationale_summary,
          body.date
        )
      };
    });

    // Catch-all for any other /mcp paths (handles Vercel rewrite edge cases)
    server.all("/mcp/*", async (request, reply) => {
      const path = request.url;
      if (path === "/mcp/generate_leverage_plan" || path.endsWith("/mcp/generate_leverage_plan")) {
        const body = request.body as any;
        return generateLeveragePlan(body.goals, body.constraints, body.backlog);
      }
      if (path === "/mcp/export_daily_brief" || path.endsWith("/mcp/export_daily_brief")) {
        const body = request.body as any;
        return {
          brief: exportDailyBrief(
            body.ranked_actions,
            body.rationale_summary,
            body.date
          )
        };
      }
      return reply.code(404).send({ error: "Not found" });
    });

    await server.ready();
    serverInstance = server;
  }
  return serverInstance;
}

export default async function handler(req: any, res: any) {
  // MCP SCANNER REQUIREMENTS:
  // 1. Immediate static response (no async initialization)
  // 2. Proper headers (Cache-Control, Content-Type)
  // 3. Exact MCP schema format
  // 4. Zero redirects, auth, or middleware
  
  // Set required headers for MCP scanner (must be set before any response)
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  
  // Top-level error handler - ensure we always return a valid response
  try {
  
  const method = req.method || "GET";
  const requestUrl = req.url || "/";
  
  // Safely parse URL - handle errors gracefully
  let pathParam: string | null = null;
  let normalizedPath = requestUrl;
  try {
    const host = req.headers?.host || "localhost";
    const url = new URL(requestUrl, `http://${host}`);
    pathParam = url.searchParams.get("path");
    normalizedPath = url.pathname;
  } catch (error) {
    // If URL parsing fails, try to extract path manually
    const pathMatch = requestUrl.match(/^([^?#]+)/);
    if (pathMatch) {
      normalizedPath = pathMatch[1];
    }
    pathParam = null;
  }
  
  // If pathParam exists from Vercel rewrite, use it
  if (pathParam) {
    normalizedPath = pathParam;
  }
  
  // Normalize path: remove leading/trailing slashes for comparison
  const cleanPath = normalizedPath.replace(/^\/+|\/+$/g, '');
  
  // Check if this is a request to the base /mcp endpoint (not a sub-path like /mcp/tool_name)
  // This catches ALL variations: /mcp, /api/mcp, /mcp?, /api/mcp?path=/, etc.
  const isBaseMcpPath = cleanPath === "mcp" || cleanPath === "api/mcp" || cleanPath === "";
  
  // GET requests: always return tool definitions immediately (SYNCHRONOUS, no async)
  if (method === "GET" && isBaseMcpPath) {
    // Return MCP-compliant response immediately - no async operations
    return res.status(200).json({
      tools: TOOL_DEFINITIONS
    });
  }
  
  // POST requests to /mcp: handle tool invocations or return tool definitions
  if (method === "POST" && isBaseMcpPath) {
    // Safely get body - handle cases where it might not be parsed yet
    let body: any = {};
    try {
      body = req.body || {};
      // If body is a string, try to parse it
      if (typeof body === "string" && body.length > 0) {
        body = JSON.parse(body);
      }
    } catch (e) {
      // Body parsing failed or not available - treat as empty (scan request)
      body = {};
    }
    
    const toolName = body?.tool || body?.name;
    
    // Only execute tools if explicitly requested with ALL required parameters
    // This ensures scan requests (empty/minimal body) always return tool definitions
    if (toolName === "generate_leverage_plan" && body?.goals && body?.constraints) {
      try {
        const result = await generateLeveragePlan(body.goals, body.constraints, body.backlog);
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json(result);
      } catch (error: any) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        return res.status(500).json({ error: error.message || "Tool execution failed" });
      }
    }
    
    if (toolName === "export_daily_brief" && body?.ranked_actions && body?.rationale_summary && body?.date) {
      try {
        const result = {
          brief: exportDailyBrief(
            body.ranked_actions,
            body.rationale_summary,
            body.date
          )
        };
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json(result);
      } catch (error: any) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        return res.status(500).json({ error: error.message || "Tool execution failed" });
      }
    }
    
    // All other POST requests to /mcp are scan/discovery requests
    // Return MCP-compliant response immediately - SYNCHRONOUS, no async operations
    return res.status(200).json({
      tools: TOOL_DEFINITIONS
    });
  }
  
  // Safety check: If request looks like it might be a base /mcp request but didn't match above,
  // return tools immediately to avoid timeout (better safe than sorry for scanner)
  if ((method === "GET" || method === "POST") && 
      (requestUrl.includes("/mcp") && !requestUrl.includes("/mcp/") && !cleanPath.includes("/"))) {
    return res.status(200).json({
      tools: TOOL_DEFINITIONS
    });
  }
  
  // For all other requests (sub-paths like /mcp/generate_leverage_plan), use the Fastify server
  // This only happens for actual tool invocations via sub-paths
  try {
    const server = await getServer();
    
    // Vercel rewrites: restore original path from query parameter or headers
    if (pathParam) {
      req.url = `/mcp${pathParam}`;
    }
    // Otherwise, check if req.url already has the correct path
    else if (!requestUrl.startsWith("/mcp")) {
      // If it's the rewritten /api/mcp, set to /mcp
      // The original path should be preserved, but if not, default to /mcp
      req.url = "/mcp";
    }
    
    server.server.emit("request", req, res);
  } catch (error: any) {
    // If Fastify server fails, return error response
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ 
      error: error.message || "Server error",
      tools: TOOL_DEFINITIONS // Still return tools in case of error
    });
  }
  
  } catch (error: any) {
    // Ultimate fallback - if anything goes wrong, return tool definitions
    // This ensures the MCP scanner always gets a valid response
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      tools: TOOL_DEFINITIONS
    });
  }
}
