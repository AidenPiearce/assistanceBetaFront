import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPClient, getMCPClient } from '../mcp-client';

describe('MCPClient', () => {
  let client: MCPClient;
  const mockFetch = vi.mocked(fetch);

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MCPClient('http://localhost:8000');
  });

  describe('request', () => {
    it('sends JSON-RPC request and returns parsed response', async () => {
      const mockResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [] },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      } as Response);

      const result = await client.request('tools/list', {});
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/mcp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
          }),
        })
      );
    });

    it('handles SSE response', async () => {
      const sseData = `data: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n\n`;
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: { getReader: () => mockReader },
      } as unknown as Response);

      const result = await client.request('tools/list', {});
      expect(result).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [] },
      });
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(client.request('tools/list', {})).rejects.toThrow('MCP request failed: 500 Internal Server Error');
    });

    it('includes session ID in headers when set', async () => {
      client.sessionId = 'test-session-id';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }),
      } as Response);

      await client.request('tools/list', {});
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Mcp-Session-Id': 'test-session-id',
          }),
        })
      );
    });
  });

  describe('initialize', () => {
    it('initializes session and sends initialized notification', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: { protocolVersion: '2025-03-26', capabilities: {} },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
        } as Response);

      const result = await client.initialize();
      expect(result.result.protocolVersion).toBe('2025-03-26');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('listTools', () => {
    it('returns list of tools', async () => {
      const tools = [
        { name: 'search_notes', description: 'Search notes' },
        { name: 'lookup_page', description: 'Lookup page' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ jsonrpc: '2.0', id: 1, result: { tools } }),
      } as Response);

      const result = await client.listTools();
      expect(result).toEqual(tools);
    });
  });

  describe('callTool', () => {
    it('calls tool and returns result', async () => {
      const toolResult = { content: [{ type: 'text', text: 'Tool result' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ jsonrpc: '2.0', id: 1, result: toolResult }),
      } as Response);

      const result = await client.callTool('search_notes', { query: 'test' });
      expect(result).toEqual(toolResult);
    });
  });

  describe('searchNotes', () => {
    it('calls search_notes tool with correct params', async () => {
      const toolResult = { content: [{ type: 'text', text: 'Search results' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ jsonrpc: '2.0', id: 1, result: toolResult }),
      } as Response);

      const result = await client.searchNotes('FPGA', 5);
      expect(result).toEqual(toolResult);
    });
  });

  describe('ask', () => {
    it('calls /ask endpoint and returns answer', async () => {
      const answer = { answer: 'Test answer', session_id: 'sess-1' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => answer,
      } as Response);

      const result = await client.ask('What is FPGA?', 'sess-1');
      expect(result).toEqual(answer);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/ask',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ question: 'What is FPGA?', session_id: 'sess-1' }),
        })
      );
    });

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      } as Response);

      await expect(client.ask('test', 'sess-1')).rejects.toThrow('Ask failed: 500 Server error');
    });
  });
});

describe('getMCPClient', () => {
  it('returns singleton instance', () => {
    const client1 = getMCPClient();
    const client2 = getMCPClient();
    expect(client1).toBe(client2);
  });
});