import express from 'express';
import type { Server } from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const PORT = 29170;

export async function startMcpTransport(createServer: () => McpServer): Promise<Server> {
  const app = express();
  app.use(express.json());

  // Track SSE transports for cleanup
  const sseTransports = new Map<string, SSEServerTransport>();

  // --- Streamable HTTP transport (modern) ---
  // Stateless: each request gets its own server + transport pair
  const handleStreamableHttp = async (req: express.Request, res: express.Response) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  };

  app.post('/mcp', handleStreamableHttp);
  app.get('/mcp', handleStreamableHttp);
  app.delete('/mcp', handleStreamableHttp);

  // --- SSE transport (legacy, for KurisuAssistant compatibility) ---
  app.get('/sse', async (_req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);

    res.on('close', () => {
      sseTransports.delete(sessionId);
    });

    const server = createServer();
    await server.connect(transport);
  });

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(400).json({ error: 'Unknown session' });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  // --- Health check ---
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', name: 'Maestro', version: '1.0.0' });
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Maestro MCP server listening on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}
