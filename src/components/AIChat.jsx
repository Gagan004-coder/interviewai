import { useState, useRef, useEffect } from 'react'
import { groqChat } from '../services/groq'
import './AIChat.css'

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am the InterviewAI Assistant. How can I help you prepare today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const sysMsg = { 
        role: 'system', 
        content: 'You are a friendly and extremely concise AI assistant for InterviewAI. Help the user navigate the platform, give brief interview tips, or answer quick technical questions. Keep responses under 4 sentences.' 
      }
      const apiMessages = [sysMsg, ...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const replyText = await groqChat(apiMessages, { temperature: 0.5, max_tokens: 300 })
      
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }])
    }
    setLoading(false)
  }

  return (
    <div className="ai-chat-container">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <span className="ai-chat-icon">🤖</span> AI Help
            </div>
            <button className="ai-chat-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="ai-chat-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="ai-chat-bubble assistant typing">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <form className="ai-chat-input-form" onSubmit={handleSend}>
            <input 
              type="text" 
              className="ai-chat-input" 
              placeholder="Ask me anything..." 
              value={input} 
              onChange={e => setInput(e.target.value)} 
            />
            <button type="submit" className="ai-chat-send" disabled={!input.trim() || loading}>➤</button>
          </form>
        </div>
      )}
      
      <button className={`ai-chat-fab ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(true)}>
        🤖
      </button>
    </div>
  )
}
