import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [appState, setAppState] = useState('empty'); // 'empty', 'uploading', 'ready'
  const [fileInfo, setFileInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = 'https://rag-chat-bd0f.onrender.com';

  useEffect(() => {
    fetch(`${API_URL}/status`)
      .then(res => res.json())
      .then(data => {
        if (data.documents_loaded) {
          setFileInfo({ filename: 'Persisted Document', chunks: data.chunk_count });
          setAppState('ready');
        }
      })
      .catch(err => console.log('Backend not ready or no internet connection.', err));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    setErrorMsg(null);
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setErrorMsg('Invalid file type. Only PDF, DOCX, and TXT are supported.');
      return;
    }
    
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File too large. Maximum size is 25 MB.');
      return;
    }

    setAppState('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setFileInfo({ filename: file.name, chunks: data.chunks });
      setAppState('ready');
      setMessages([]);
    } catch (err) {
      setErrorMsg(err.message);
      setAppState('empty');
    }
  };

  const handleClear = async () => {
    try {
      await fetch(`${API_URL}/clear`, { method: 'DELETE' });
      setAppState('empty');
      setFileInfo(null);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const askQuestion = async (query) => {
    if (!query.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: query.trim() }];
    setMessages(newMsgs);
    setInputValue('');
    setIsAsking(true);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query.trim() })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Error getting answer');

      setMessages([...newMsgs, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setMessages([...newMsgs, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsAsking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion(inputValue);
    }
  };

  const suggestQuestion = (q) => {
    setInputValue(q);
    askQuestion(q);
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <div className="logo-text">DocMind</div>
        </div>

        <div className="upload-section">
          <div className="section-title">Knowledge Base</div>
          
          {appState === 'empty' && (
            <div 
              className={`upload-panel ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <svg className="upload-icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div>
                <div className="upload-text">Click to upload or drag and drop</div>
                <div className="upload-hint">PDF, DOCX, or TXT (Max: 25MB)</div>
              </div>
              {errorMsg && <div className="error-msg">{errorMsg}</div>}
              <input 
                type="file" id="file-upload" style={{ display: 'none' }} 
                accept=".pdf,.docx,.txt" onChange={handleFileInput}
              />
            </div>
          )}

          {appState === 'uploading' && (
            <div className="upload-panel">
              <div className="spinner"></div>
              <div className="upload-text">Processing Document...</div>
              <div className="upload-hint">Extracting text and building vector index.</div>
            </div>
          )}

          {appState === 'ready' && fileInfo && (
            <>
              <div className="doc-card">
                <div className="doc-header">
                  <svg className="doc-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  <div className="doc-info">
                    <div className="doc-name">{fileInfo.filename}</div>
                    <div className="doc-meta">
                      <span className="chunk-badge">{fileInfo.chunks} blocks</span>
                      <span>Indexed & Ready</span>
                    </div>
                  </div>
                </div>
              </div>
              <button className="clear-btn" onClick={handleClear}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Clear Document
              </button>
            </>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="chat-container">
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <h2 className="empty-title">How can I help you today?</h2>
                <p className="empty-subtitle">Upload a document to the knowledge base to get started, or try asking one of these questions.</p>
                
                <div className="hint-grid">
                  <div className="hint-card" onClick={() => suggestQuestion('Summarize the main points of this document.')}>
                    <strong>Summarize</strong>
                    <div>Get a quick overview of the key concepts</div>
                  </div>
                  <div className="hint-card" onClick={() => suggestQuestion('What are the key takeaways from the conclusion?')}>
                    <strong>Key Takeaways</strong>
                    <div>Extract the most important findings</div>
                  </div>
                  <div className="hint-card" onClick={() => suggestQuestion('Extract all numerical data and statistics.')}>
                    <strong>Data Extraction</strong>
                    <div>Find specific numbers and metrics</div>
                  </div>
                  <div className="hint-card" onClick={() => suggestQuestion('List the main action items mentioned.')}>
                    <strong>Action Items</strong>
                    <div>Identify tasks and recommendations</div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.role}`}>
                  <div className={`avatar ${msg.role}`}>
                    {msg.role === 'user' ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
                    )}
                  </div>
                  <div className="message-bubble">{msg.content}</div>
                </div>
              ))
            )}
            {isAsking && (
               <div className="message-wrapper assistant">
                 <div className="avatar assistant">
                   <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
                 </div>
                 <div className="message-bubble">
                   <div className="thinking-dots">
                     <div className="dot"></div>
                     <div className="dot"></div>
                     <div className="dot"></div>
                   </div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="input-box">
              <textarea
                ref={inputRef}
                placeholder={appState === 'ready' ? "Ask a question about your document..." : "Upload a document to ask questions..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAsking || appState !== 'ready'}
                rows={1}
              />
              <button 
                className="send-btn" 
                onClick={() => askQuestion(inputValue)}
                disabled={!inputValue.trim() || isAsking || appState !== 'ready'}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
