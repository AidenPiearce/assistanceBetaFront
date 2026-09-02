import { useState } from 'react';
import './App.css';
import { ChatInput } from './components/ChatInput.jsx';
import { ChatMessages } from './components/ChatMessages.jsx';

// Only plain-string messages may be persisted - never JSX objects
function loadSavedMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem('chatMessages')) || [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (m) => m && typeof m.message === 'string' && m.id
        )
      : [];
  } catch {
    return [];
  }
}

function App() {
  const [chatMessages, setChatMessages] = useState(loadSavedMessages);

  const handleMessagesChange = (newMessages) => {
    setChatMessages(newMessages);
    // Persist only serializable text messages (skip loading spinners etc.)
    const persistable = newMessages.filter(
      (m) => m && typeof m.message === 'string' && m.id
    );
    localStorage.setItem('chatMessages', JSON.stringify(persistable));
  };

  return (
    <div className="app-container">
      <ChatMessages
        chatMessages={chatMessages}
      />
      <ChatInput
        chatMessages={chatMessages}
        setChatMessages={handleMessagesChange}
      />
    </div>
  );
}

export default App;