import { ChatMessage } from './ChatMessage.jsx';
import { useRef, useEffect } from 'react'
import './ChatMessages.css'
import background from "../assets/background.jpg";


export function ChatMessages({ chatMessages }) {
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    const containerElem = chatMessagesRef.current;
    if (containerElem) {
      containerElem.scrollTop = containerElem.scrollHeight;
    }
  }, [chatMessages]);

  if (chatMessages.length === 0) {
    return (
      <p className="chat-container welcome-message" >Welcome to Aiden's Chatbot Project, Send a message to start</p>
    )
  }

  return (
    <div className="chat-container"
      ref={chatMessagesRef}
      style={{ backgroundImage: `url(${background})` }}
    >
      {
        chatMessages.map((chatMessage) => {
          return (
            <ChatMessage
              message={chatMessage.message}
              sender={chatMessage.sender}
              time={chatMessage.time}
              key={chatMessage.id}
            />
          )
        })
      }
    </div>
  )
}