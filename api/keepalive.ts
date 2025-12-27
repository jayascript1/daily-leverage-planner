// Keep-alive endpoint to prevent cold starts
// Call this periodically to keep the MCP server function warm
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ status: "ok", timestamp: Date.now() });
}

