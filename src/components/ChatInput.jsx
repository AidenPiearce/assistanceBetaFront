import { useState, useEffect } from 'react';
import { getMCPClient } from '../mcp-client.js';
import { Chatbot } from '../chatbot-offline.js';
import '../App.css';
import loadingSpinner from '../assets/loading-spinner.gif';
import './ChatInput.css';
import dayjs from 'dayjs';

export function ChatInput({ chatMessages, setChatMessages }) {
  const [inputText, setInputText] = useState('');
  const [mcpReady, setMcpReady] = useState(false);
  const [mcpError, setMcpError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineNoticeShown, setOfflineNoticeShown] = useState(false);

  // Initialize: just verify backend /ask works
  useEffect(() => {
    const initBackend = async () => {
      try {
        const client = getMCPClient();
        // Light check - backend /ask with empty question to verify connectivity
        await client.ask('ping', 'health-check');
        setMcpReady(true);
        setIsOffline(false);
        console.log('Backend connection verified');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setMcpError(`Failed to connect to backend: ${error.message}`);
        setIsOffline(true);
      }
    };
    initBackend();
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
    if (!inputText.trim()) return;

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
        message: <img src={loadingSpinner} width="35px" alt="Loading..." />,
        sender: 'robot',
        id: crypto.randomUUID(),
      }
    ]);

    try {
      // If we're in offline mode, use the offline chatbot
      if (isOffline) {
        // Show offline notice once
        if (!offlineNoticeShown) {
          setOfflineNoticeShown(true);
          setChatMessages([
            ...newChatMessages,
            {
              message: "Note: Using offline mode. Responses may be limited.",
              sender: 'robot',
              id: crypto.randomUUID(),
              time: dayjs().format('h:mm a'),
            }
          ]);
        }

        // Get response from offline chatbot
        const responseText = await Chatbot.getResponseAsync(userMessage);

        setChatMessages([
          ...newChatMessages,
          {
            message: responseText,
            sender: 'robot',
            id: crypto.randomUUID(),
            time: dayjs().format('h:mm a'),
          }
        ]);
        return;
      }

      // Otherwise, use MCP (online mode)
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
      // If we were trying to use MCP and it failed, fallback to offline
      console.error('MCP ask error:', error);

      // Switch to offline mode if not already
      if (!isOffline) {
        setIsOffline(true);
        setOfflineNoticeShown(true);
        setChatMessages([
          ...newChatMessages,
          {
            message: "server appears to be offline. Switching to offline mode.",
            sender: 'robot',
            id: crypto.randomUUID(),
            time: dayjs().format('h:mm a'),
          }
        ]);
      }

      // Get response from offline chatbot
      const responseText = await Chatbot.getResponseAsync(userMessage);

      setChatMessages([
        ...newChatMessages,
        {
          message: responseText,
          sender: 'robot',
          id: crypto.randomUUID(),
          time: dayjs().format('h:mm a'),
        }
      ]);
    }
  }


  const canSend = mcpReady || isOffline;

  return (
    <div className="chat-input-container">
      <input
        placeholder={canSend ? (isOffline ? "Offline mode" : "Ask about INIF...") : "Connecting to servers..."}
        size="30"
        onChange={(e) => saveInputText(e)}
        onKeyDown={(e) => handleKeyDown(e)}
        value={inputText}
        disabled={!canSend}
      />
      <button
        onClick={sendMessage}
        disabled={!canSend || !inputText.trim()}
      >Send</button>

      {!canSend && <span className="connecting">Connecting To Servers...</span>}
    </div>
  );
}