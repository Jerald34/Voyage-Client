"use client";

import { useEffect, useMemo, useRef } from 'react';
import MarkdownContent from './AgentMarkdown';
import MessageImageGrid from '../../chat/MessageImageGrid';

function humanize(name) {
  return String(name || '').replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function ThinkingBubble({ activeToolLabel, toolCalls = [] }) {
  const completedTools = toolCalls.filter(t => t.status?.toLowerCase() === 'completed');

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] px-4 py-3 rounded-[18px] rounded-bl-[4px] bg-background border border-border/20 flex flex-col gap-2.5">
        {completedTools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {completedTools.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] text-text-soft bg-border/20 rounded-full px-2 py-[2px]"
              >
                <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2c7a7b] flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {humanize(tool.name)}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5 text-sm text-text-primary">
          <span className="thinking-dots" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span>{activeToolLabel || 'Thinking...'}</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-70 text-[10px] uppercase tracking-[0.05em] font-bold text-secondary">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
          Live
        </div>
      </div>
    </div>
  );
}

export default function AgentMessageList({
  messages = [],
  isStreaming = false,
  showThinking = false,
  activeToolLabel = null,
  toolCalls = [],
  onEditMessage,
}) {
  const bottomRef = useRef(null);

  const messageSignature = useMemo(() => {
    return messages
      .map((msg, index) => {
        const content = typeof msg.content === 'string' ? msg.content : '';
        return `${index}:${msg.role}:${msg.isStreaming ? '1' : '0'}:${content.length}:${content.slice(-24)}`;
      })
      .join('|');
  }, [messages]);

  useEffect(() => {
    if (!bottomRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messageSignature, isStreaming, showThinking]);

  if (messages.length === 0 && !showThinking) {
    return (
      <div className="flex items-center justify-center h-full text-text-soft text-sm text-center p-10">
        <p>No messages yet. Start a conversation with the Voyage Agent.</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-grow overflow-y-auto"
      style={{ scrollBehavior: 'auto' }}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className="relative group max-w-[85%]">
            <div
              className={`p-4 rounded-[18px] flex flex-col gap-2
                ${msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-[4px]'
                  : 'bg-background text-text-primary border border-border/20 rounded-bl-[4px]'
                }`}
            >
              <div className="text-sm leading-[1.5] min-w-0">
                {msg.role === 'assistant' ? (
                  <div className="flex flex-col gap-2.5 [&_.markdown-paragraph]:m-0 [&_.markdown-heading]:m-0 [&_.markdown-heading]:leading-tight [&_.markdown-heading]:font-bold [&_.markdown-list]:m-0 [&_.markdown-list]:pl-5 [&_.markdown-list]:flex [&_.markdown-list]:flex-col [&_.markdown-list]:gap-1">
                    <div className="flex items-end flex-wrap gap-1">
                      <MarkdownContent content={msg.content} />
                      {msg.isStreaming && (
                        <span className="typing-cursor" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                    {msg.metadata?.imageUrls?.length > 0 && (
                      <MessageImageGrid imageUrls={msg.metadata.imageUrls} />
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center gap-3 opacity-70 text-[10px] uppercase tracking-[0.05em] font-bold">
                <span>{msg.role === 'assistant' ? 'Voyage Agent' : 'You'}</span>
                <span>
                  {msg.isStreaming ? (
                    <span className="inline-flex items-center gap-1.5 text-secondary">
                      <span className="live-dot w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                      Live
                    </span>
                  ) : (
                    msg.time || 'Just now'
                  )}
                </span>
              </div>
            </div>

            {/* Edit button — only on user messages */}
            {msg.role === 'user' && onEditMessage && (
              <button
                type="button"
                onClick={() => onEditMessage(msg.content)}
                className="absolute -bottom-2.5 -left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-text-soft hover:text-secondary hover:border-secondary cursor-pointer shadow-sm"
                title="Edit message"
                aria-label="Edit this message"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Thinking bubble — shown when agent is working tools but no text is streaming yet */}
      {showThinking && (
        <ThinkingBubble activeToolLabel={activeToolLabel} toolCalls={toolCalls} />
      )}

      <div ref={bottomRef} aria-hidden="true" />

      <style>{`
        .typing-cursor {
          display: inline-block;
          width: 1px;
          height: 1.05em;
          margin-left: 1px;
          background: var(--voyage-secondary);
          border-radius: 999px;
          vertical-align: -0.15em;
          animation: typing-caret-blink 1s steps(2, start) infinite;
          flex: 0 0 auto;
        }
        .live-dot {
          animation: live-dot-pulse 1.4s ease-in-out infinite;
        }
        .thinking-dots {
          display: inline-flex;
          gap: 3px;
          align-items: center;
          flex-shrink: 0;
        }
        .thinking-dots span {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--voyage-secondary);
          animation: thinking-bounce 1.2s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(1) { animation-delay: 0s; }
        .thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
        .thinking-dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes typing-caret-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.25; }
        }
        @keyframes live-dot-pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
