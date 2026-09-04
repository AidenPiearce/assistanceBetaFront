import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import robotImage from '../assets/robot.png'
import userImage from '../assets/user.png'
import './ChatMessage.css'



export function ChatMessage({ message, sender, time }) {
  return (
    <div className={
      sender === 'user'
        ? 'chat-message-user'
        : 'chat-message-robot'
    } >

      {sender === 'robot' && (
        <img src={robotImage} className="chat-message-profile" />
      )}

      <div className="chat-messages-text" dir="auto">
        {typeof message === 'string' && sender !== 'user' ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message}
            </ReactMarkdown>
          </div>
        ) : (
          message
        )}
        <div className="time">{time}</div>
      </div>




      {sender === 'user' && (
        <img src={userImage} className="chat-message-profile" />
      )}
    </div>
  )
}