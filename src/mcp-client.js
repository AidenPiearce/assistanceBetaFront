// MCP Client for connecting to the Railway MCP server via Streamable HTTP
// Uses JSON-RPC 2.0 over HTTP (Streamable HTTP transport)

class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.sessionId = null;
    this.requestId = 0;
  }

  // Generate unique request ID
  nextId() {
    return ++this.requestId;
  }

  // Send JSON-RPC request
  async request(method, params = {}) {
    const id = this.nextId();
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };

    // Add session ID if we have one
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    // Capture session ID from response headers
    const sessionId = response.headers.get('mcp-session-id');
    if (sessionId) {
      this.sessionId = sessionId;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP request failed: ${response.status} ${errorText}`);
    }

    // Handle SSE response (Streamable HTTP)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return this.parseSSEResponse(response);
    }

    return response.json();
  }

  // Parse SSE (Server-Sent Events) response
  async parseSSEResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.id !== undefined) {
              return data; // Return the JSON-RPC response
            }
          } catch (e) {
            // Ignore parse errors for non-JSON data
          }
        }
      }
    }

    throw new Error('No valid JSON-RPC response received from SSE stream');
  }

  // Initialize the MCP session
  async initialize() {
    const result = await this.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'fpga-web-ui',
        version: '1.0.0'
      }
    });

    // Send initialized notification
    await this.notify('notifications/initialized', {});
    
    return result;
  }

  // Send notification (no response expected)
  async notify(method, params = {}) {
    const payload = {
      jsonrpc: '2.0',
      method,
      params
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };

    // Add session ID if we have one
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    // 202 Accepted is the normal response for notifications
    if (!response.ok && response.status !== 202) {
      const errorText = await response.text();
      throw new Error(`MCP notification failed: ${response.status} ${errorText}`);
    }
  }

  // List available tools
  async listTools() {
    const result = await this.request('tools/list', {});
    return result.result?.tools || [];
  }

  // Call a tool
  async callTool(name, arguments_) {
    const result = await this.request('tools/call', {
      name,
      arguments: arguments_
    });
    return result.result;
  }

  // Search notes using the MCP tool
  async searchNotes(query, topK = 8) {
    return this.callTool('search_notes', { query, top_k: topK });
  }

  // Lookup a specific page
  async lookupPage(filename, page) {
    return this.callTool('lookup_page', { filename, page });
  }

  // List all documents
  async listDocuments() {
    return this.callTool('list_documents', {});
  }

  // Reindex
  async reindex(force = false) {
    return this.callTool('reindex', { force });
  }

  // Ask the web-gateway (Gemini + notes tools) for a composed answer
  async ask(question, sessionId) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(`${this.baseUrl}/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, session_id: sessionId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ask failed: ${response.status} ${errorText}`);
    }

    return response.json(); // { answer, session_id }
  }
}

// Export singleton instance
let mcpClientInstance = null;

export function getMCPClient() {
  if (!mcpClientInstance) {
    const baseUrl = import.meta.env.VITE_MCP_URL || 'http://localhost:8000';
    mcpClientInstance = new MCPClient(baseUrl);
  }
  return mcpClientInstance;
}

export { MCPClient };