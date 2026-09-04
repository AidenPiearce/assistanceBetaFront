import { useState, useEffect } from 'react';
import { getMCPClient } from '../mcp-client.js';
import '../App.css';
import loadingSpinner from '../assets/loading-spinner.gif';
import './ChatInput.css';
import dayjs from 'dayjs';

export function ChatInput({ chatMessages, setChatMessages }) {
  const [inputText, setInputText] = useState('');
  const [mcpReady, setMcpReady] = useState(false);
  const [mcpError, setMcpError] = useState(null);

  // Initialize MCP client on mount
  useEffect(() => {
    const initMCP = async () => {
      try {
        const client = getMCPClient();
        await client.initialize();
        setMcpReady(true);
        console.log('MCP client initialized');
      } catch (error) {
        console.error('MCP initialization failed:', error);
        setMcpError(`Failed to connect to MCP server: ${error.message}`);
      }
    };
    initMCP();
  }, []);

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      sendMessage();
    } else if (event.key === 'Escape') {
      setInputText('');
    }
  }

  function saveInputText(event) {
    setInputText(event.target.value);
  }

  async function sendMessage() {
    if (!inputText.trim() || !mcpReady) return;

    const userMessage = inputText.trim();

    // Add user message
    const userMessageObj = {
      message: userMessage,
      sender: 'user',
      id: crypto.randomUUID(),
      time: dayjs().format('h:mm a'),
    };

    const newChatMessages = [...chatMessages, userMessageObj];
    setChatMessages(newChatMessages);
    setInputText('');

    // Add loading indicator
    setChatMessages([
      ...newChatMessages,
      {
        message: <img src={loadingSpinner} width="35px" alt="بارگداری..." />,
        sender: 'robot',
        id: crypto.randomUUID(),
      }
    ]);

    try {
      const client = getMCPClient();

      // Persistent session so follow-up questions keep context
      let sessionId = localStorage.getItem('chatSessionId');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('chatSessionId', sessionId);
      }

      const data = await client.ask(userMessage, sessionId);
      const responseText = (data.answer || '').trim() || 'No answer received.';

      setChatMessages([
        ...newChatMessages,
        {
          message: responseText,
          sender: 'robot',
          id: crypto.randomUUID(),
          time: dayjs().format('h:mm a'),
        }
      ]);
    } catch (error) {
      // Never show raw LLM errors to users
      console.error('MCP ask error:', error);
      setChatMessages([
        ...newChatMessages,
        {
          message:
            "Sorry, something went wrong. Please try again in a moment.\nمتاسفم، مشکلی پیش آمد. لطفاً چند لحظه بعد دوباره تلاش کن.",
          sender: 'robot',
          id: crypto.randomUUID(),
          time: dayjs().format('h:mm a'),
        }
      ]);
    }
  }


  // Show connection status
  if (mcpError) {
    return (
      <div className="chat-input-container">
        <div className="mcp-error">
          Connection error: {mcpError}
          <br />
          <small>Check that the server is running.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-input-container">
      <input
        placeholder={mcpReady ? "سوال بپرسید ..." : "  ...درحال اتصال به سرور  "}
        size="30"
        onChange={(e) => saveInputText(e)}
        onKeyDown={(e) => handleKeyDown(e)}
        value={inputText}
        disabled={!mcpReady}
      />
      <button
        onClick={sendMessage}
        disabled={!mcpReady || !inputText.trim()}
      >Send</button>
    </div>
  );
}