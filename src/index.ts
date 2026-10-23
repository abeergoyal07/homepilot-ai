
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from
  "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json());

const devices: Record<string, { type: string; on: boolean }> = {
  "living-room-light": { type: "light", on: true },
  "bedroom-light": { type: "light", on: true },
  "living-room-tv": { type: "tv", on: true }
};

function createServer() {
  const server = new McpServer({
    name: "homepilot-ai",
    version: "1.0.0"
  });

  server.registerTool(
    "get_home_status",
    {
      description: "Show the status of all simulated home devices",
      inputSchema: {}
    },
    async () => ({
      content: [{
        type: "text",
        text: JSON.stringify(devices, null, 2)
      }]
    })
  );

  server.registerTool(
    "set_device_state",
    {
      description: "Turn a supported simulated device on or off",
      inputSchema: {
        device: z.enum([
          "living-room-light",
          "bedroom-light",
          "living-room-tv"
        ]),
        on: z.boolean()
      }
    },
    async ({ device, on }) => {
      devices[device].on = on;

      return {
        content: [{
          type: "text",
          text: `${device} is now ${on ? "ON" : "OFF"}`
        }]
      };
    }
  );

  server.registerTool(
    "prepare_sleep",
    {
      description: "Turn off the simulated lights and TV",
      inputSchema: {}
    },
    async () => {
      for (const device of Object.values(devices)) {
        device.on = false;
      }

      return {
        content: [{
          type: "text",
          text: "Bedtime routine completed. Current device states: " +
            JSON.stringify(devices)
        }]
      };
    }
  );

  return server;
}

app.get("/", (_req, res) => {
  res.json({
    name: "HomePilot AI",
    status: "running",
    description: "Smart home automation prototype",
    mcpEndpoint: "/mcp"
  });
});

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Request failed" });
    }
  } finally {
    await transport.close();
    await server.close();
  }
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`HomePilot AI running on port ${port}`);
});
