import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useConfig } from '../../context/ConfigContext';
import '../styles/QABuddy.css';

const BASE_URL    = 'https://api.groq.com/openai/v1';
const TEXT_MODEL  = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const FALLBACK_MODEL = 'gemma2-9b-it';

const SYSTEM_PROMPT = `You are QA Buddy, an expert QA engineer, automation specialist, and AI testing mentor built into Qualia — an AI-powered Quality Engineering platform.

You have deep expertise in:
• Manual Testing — test cases, test plans, exploratory testing, UAT, regression, smoke/sanity, boundary value analysis, equivalence partitioning, decision tables
• Automation Testing — Playwright, Cypress, Selenium (Java/Python), WebdriverIO, Appium, REST Assured, TestNG, JUnit, pytest
• API Testing — REST, GraphQL, gRPC, Postman, Newman, contract testing, schema validation, OWASP API Top 10
• Performance Testing — k6, JMeter, Gatling, Locust; load, stress, spike, soak testing
• Security Testing — OWASP Top 10, API security, pen testing basics, vulnerability assessment
• CI/CD for QA — GitHub Actions, Jenkins, Docker, parallel test execution, test pipelines
• Prompt Engineering — crafting effective prompts for test generation, AI-assisted QA
• AI in Testing — LLMs for QA, AI agents, autonomous testing, model evaluation
• Career Guidance — QA roadmaps, interview prep, SDET skills, certifications (ISTQB, etc.)

Answering philosophy:
- Beginners: explain concepts clearly with analogies and examples
- Intermediate: show practical patterns and code
- Advanced: discuss trade-offs, architecture, edge cases
- Always: be specific, include code snippets where helpful, give actionable advice
- When reviewing code/files: identify issues, suggest improvements, explain why

You have no topic restrictions within QA, testing, and software quality.`;

const STARTERS = [
  { icon: '🧪', text: 'How do I write effective test cases for a login feature?' },
  { icon: '🎭', text: 'Get me started with Playwright automation from scratch' },
  { icon: '🔌', text: 'How to test REST APIs — complete guide for beginners?' },
  { icon: '🐛', text: 'How to write a bug report that developers actually fix?' },
  { icon: '🧠', text: 'What is prompt engineering and how do I use it for QA?' },
  { icon: '🤖', text: 'How are AI agents used in software testing today?' },
  { icon: '⚡', text: 'Explain load testing with k6 — from zero to running tests' },
  { icon: '📋', text: 'What is the difference between smoke, sanity and regression testing?' },
];

const TEXT_EXTS = new Set([
  'js','jsx','ts','tsx','java','py','cs','rb','go','php','swift','kt',
  'html','css','scss','less','json','xml','yaml','yml','md','txt',
  'sh','bash','sql','graphql','tf','dockerfile','env','properties','conf','ini',
]);

function isTextFile(name) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return TEXT_EXTS.has(ext) || !name.includes('.');
}

function isImageFile(name) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function fileToText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}

/* ── Simple markdown renderer ────────────────────────────── */
function RenderMessage({ content }) {
  const segments = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;

  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: 'text', value: content.slice(last, m.index) });
    segments.push({ type: 'code', lang: m[1] || '', value: m[2].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: 'text', value: content.slice(last) });

  return (
    <div className="qab-msg-body">
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return (
            <div key={i} className="qab-code-block">
              {seg.lang && <span className="qab-code-lang">{seg.lang}</span>}
              <button
                className="qab-code-copy"
                onClick={() => navigator.clipboard.writeText(seg.value)}
                title="Copy code"
              >📋</button>
              <pre><code>{seg.value}</code></pre>
            </div>
          );
        }
        return (
          <div key={i} className="qab-text-seg">
            {seg.value.split('\n').map((line, j, arr) => (
              <React.Fragment key={j}>
                <TextLine line={line} />
                {j < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TextLine({ line }) {
  const parts = line.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} className="qab-ic">{p.slice(1, -1)}</code>;
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        return p;
      })}
    </>
  );
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ══════════════════════════════════════════════════════════
   QA Buddy Panel
   ══════════════════════════════════════════════════════════ */
export default function QABuddyPanel() {
  const { config: appConfig } = useConfig();
  const apiKey = appConfig.groq?.apiKey;

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [error, setError]             = useState('');
  const [isRateLimit, setIsRateLimit] = useState(false);

  const bottomRef    = useRef(null);
  const fileRef      = useRef(null);
  const folderRef    = useRef(null);
  const textareaRef  = useRef(null);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* auto-resize textarea */
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  /* ── File processing ───────────────────────────────────── */
  const processFiles = useCallback(async (files, fromFolder = false) => {
    const results = [];
    const limited = files.slice(0, 20);

    for (const file of limited) {
      const name = fromFolder ? (file.webkitRelativePath || file.name) : file.name;

      if (isImageFile(name)) {
        const base64  = await fileToBase64(file);
        const dataUrl = await fileToDataUrl(file);
        results.push({ id: genId(), type: 'image', name, base64, dataUrl, mimeType: file.type });
        continue;
      }

      if (isTextFile(name)) {
        const raw   = await fileToText(file);
        const trunc = raw.length > 4000;
        results.push({
          id: genId(), type: 'file', name,
          content: trunc ? raw.slice(0, 4000) + '\n\n[...truncated]' : raw,
          size: file.size, trunc,
        });
      }
    }

    return results;
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const processed = await processFiles(files);
    setAttachments(prev => [...prev, ...processed]);
    e.target.value = '';
  }, [processFiles]);

  const handleFolderChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const processed = await processFiles(files, true);
    setAttachments(prev => [...prev, ...processed]);
    e.target.value = '';
  }, [processFiles]);

  const removeAttachment = useCallback((id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  /* ── Build context string from file/folder attachments ── */
  const buildFileContext = useCallback((atts) => {
    const files = atts.filter(a => a.type === 'file');
    if (!files.length) return '';
    return '\n\n--- Attached Files ---\n' + files.map(f =>
      `\n### ${f.name}${f.trunc ? ' (truncated to 4000 chars)' : ''}\n\`\`\`\n${f.content}\n\`\`\``
    ).join('\n');
  }, []);

  /* ── Send message ──────────────────────────────────────── */
  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text && attachments.length === 0) return;
    if (loading) return;

    if (!apiKey) {
      setError('No API key configured. Please go to Settings and add your GROQ API key.');
      return;
    }

    const userMsg = {
      id:          genId(),
      role:        'user',
      text,
      attachments: [...attachments],
      timestamp:   new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);
    setError('');
    setIsRateLimit(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const imageAtt = userMsg.attachments.find(a => a.type === 'image');
    const fileCtx  = buildFileContext(userMsg.attachments);
    const fullText = text + fileCtx;

    // History: last 8 messages (no image data in history to save tokens)
    const history = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.role === 'user'
        ? (m.text + buildFileContext(m.attachments || []))
        : m.content,
    }));

    try {
      let response;
      if (imageAtt) {
        response = await callVision(apiKey, fullText, imageAtt, history);
      } else {
        response = await callText(apiKey, fullText, history);
      }

      if (!response.success) {
        setError(response.error);
        setIsRateLimit(!!response.isRateLimit);
        setLoading(false);
        return;
      }

      setMessages(prev => [...prev, {
        id:        genId(),
        role:      'assistant',
        content:   response.content,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setError(`Request failed: ${err.message}`);
    }

    setLoading(false);
  }, [input, attachments, loading, apiKey, messages, buildFileContext]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError('');
    setIsRateLimit(false);
    setAttachments([]);
    setInput('');
  }, []);

  /* ── Render ─────────────────────────────────────────────── */
  const isEmpty = messages.length === 0;

  return (
    <div className="qab-panel">

      {/* Header */}
      <div className="qab-header">
        <div className="qab-header-left">
          <div className="qab-avatar-lg">🤖</div>
          <div>
            <h2 className="qab-title">QA Buddy</h2>
            <p className="qab-subtitle">Your AI-powered QA mentor — ask anything</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="qab-new-chat-btn" onClick={clearChat}>
            ✦ New Chat
          </button>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className="qab-error-bar">
          <span>⚠️ {error}</span>
          <div className="qab-error-actions">
            {isRateLimit && (
              <button className="qab-retry-btn" onClick={() => handleSend()} disabled={loading}>
                ↺ Retry
              </button>
            )}
            <button className="qab-error-close" onClick={() => { setError(''); setIsRateLimit(false); }}>✕</button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="qab-messages">

        {/* Welcome / starter questions */}
        {isEmpty && (
          <div className="qab-welcome">
            <div className="qab-welcome-avatar">🤖</div>
            <h3>Hi! I'm QA Buddy</h3>
            <p>Ask me anything about manual testing, automation, API testing, performance, AI agents, prompt engineering, or your QA career. I can also review your code and files.</p>
            <div className="qab-starters">
              {STARTERS.map((s, i) => (
                <button
                  key={i}
                  className="qab-starter-btn"
                  onClick={() => handleSend(s.text)}
                  disabled={loading}
                >
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {messages.map(msg => (
          <div key={msg.id} className={`qab-msg-row qab-msg-${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="qab-msg-avatar">🤖</div>
            )}
            <div className="qab-msg-bubble">
              {/* User image attachments */}
              {msg.role === 'user' && msg.attachments?.filter(a => a.type === 'image').map(a => (
                <img key={a.id} src={a.dataUrl} alt={a.name} className="qab-msg-img" />
              ))}
              {/* User file attachments */}
              {msg.role === 'user' && msg.attachments?.filter(a => a.type === 'file').length > 0 && (
                <div className="qab-msg-files">
                  {msg.attachments.filter(a => a.type === 'file').map(a => (
                    <span key={a.id} className="qab-msg-file-chip">
                      📄 {a.name.split('/').pop()}
                    </span>
                  ))}
                </div>
              )}
              {msg.role === 'user' && msg.text && (
                <div className="qab-msg-user-text">{msg.text}</div>
              )}
              {msg.role === 'assistant' && (
                <RenderMessage content={msg.content} />
              )}
              <div className="qab-msg-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="qab-msg-avatar qab-user-avatar">👤</div>
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="qab-msg-row qab-msg-assistant">
            <div className="qab-msg-avatar">🤖</div>
            <div className="qab-msg-bubble qab-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="qab-input-area">

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="qab-att-preview">
            {attachments.map(att => (
              <div key={att.id} className="qab-att-chip">
                {att.type === 'image' ? (
                  <img src={att.dataUrl} alt={att.name} className="qab-att-thumb" />
                ) : (
                  <span className="qab-att-icon">📄</span>
                )}
                <span className="qab-att-name" title={att.name}>
                  {att.name.split('/').pop()}
                </span>
                {att.size && (
                  <span className="qab-att-size">{formatSize(att.size)}</span>
                )}
                <button className="qab-att-remove" onClick={() => removeAttachment(att.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Text input row */}
        <div className="qab-input-row">
          <div className="qab-input-box">
            <textarea
              ref={textareaRef}
              className="qab-textarea"
              value={input}
              onChange={e => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about QA, testing, automation, AI… (Shift+Enter for new line)"
              rows={1}
              disabled={loading}
            />
            <div className="qab-input-actions">
              <button
                className="qab-att-btn"
                onClick={() => fileRef.current?.click()}
                title="Attach files or images"
                disabled={loading}
              >
                📎
              </button>
              <button
                className="qab-att-btn"
                onClick={() => folderRef.current?.click()}
                title="Attach a folder"
                disabled={loading}
              >
                📁
              </button>
              <button
                className="qab-send-btn"
                onClick={() => handleSend()}
                disabled={loading || (!input.trim() && attachments.length === 0)}
                title="Send (Enter)"
              >
                {loading ? '⟳' : '↑'}
              </button>
            </div>
          </div>
        </div>

        <div className="qab-input-hint">
          Supports code, images, files & folders · Shift+Enter for new line
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={folderRef}
        type="file"
        multiple
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />
    </div>
  );
}

/* ── GROQ API calls ─────────────────────────────────────── */
async function callText(apiKey, userText, history) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userText },
  ];

  for (const model of [TEXT_MODEL, FALLBACK_MODEL]) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 2500 }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429) {
          const m = err.match(/try again in ([\dhms.\s]+?)(?:\.|Please|$)/i);
          const wait = m ? ` Retry after: ${m[1].trim()}.` : '';
          return { success: false, isRateLimit: true, error: `Rate limited.${wait} Please wait and retry.` };
        }
        if (res.status === 400 && err.includes('model_decommissioned')) continue;
        return { success: false, error: `API error ${res.status}` };
      }

      const data = await res.json();
      return { success: true, content: data.choices[0].message.content };
    } catch (e) {
      return { success: false, error: `Network error: ${e.message}` };
    }
  }
  return { success: false, error: 'All models unavailable. Please try again.' };
}

async function callVision(apiKey, userText, imageAtt, history) {
  // Vision model doesn't support system role — prepend to first user message
  const historyMessages = history.map(m => ({ role: m.role, content: m.content }));

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          ...historyMessages,
          {
            role: 'user',
            content: [
              { type: 'text', text: `${SYSTEM_PROMPT}\n\n${userText || 'Please review this image and provide QA insights.'}` },
              { type: 'image_url', image_url: { url: `data:${imageAtt.mimeType};base64,${imageAtt.base64}` } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!res.ok) {
      await res.text();
      if (res.status === 429) {
        return { success: false, isRateLimit: true, error: 'Rate limited. Please wait and retry.' };
      }
      // Fallback to text model without image
      return callText(apiKey, userText || 'I attached an image for review — please note image analysis is unavailable, describe what you need help with.', history);
    }

    const data = await res.json();
    return { success: true, content: data.choices[0].message.content };
  } catch (e) {
    return { success: false, error: `Network error: ${e.message}` };
  }
}
