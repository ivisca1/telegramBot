import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { cn } from '@/lib/utils'
import {
  Send,
  Square,
  Bot,
  User,
  ArrowDown,
  Clock,
  Check,
  X,
  Pencil,
  MessageSquare,
} from 'lucide-react'
import type { Message } from '@/types'

interface ChatAreaProps {
  messages: Message[]
  isLoading: boolean
  onSend: (content: string) => void
  onAbort: () => void
  onApprove?: (messageId: string) => void
  onReject?: (messageId: string, reason?: string) => void
  onEdit?: (messageId: string, content: string) => void
  demoMode?: boolean
  className?: string
  demoComplete?: boolean
  nextPendingId?: string | null
  bulkMode?: boolean
  conversations?: Array<{ fanName: string, fanInitials: string, messages: Message[] }>
  onApproveAllPending?: () => void
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AutoResizeTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  placeholder: string
  disabled: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e)
        autoResize()
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        'flex w-full rounded-lg bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60 resize-none min-h-[44px] max-h-[200px] px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200'
      )}
    />
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: '200ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-xs text-muted-foreground">Thinking...</span>
    </div>
  )
}

export function ChatArea({ messages, isLoading, onSend, onAbort, onApprove, onReject, onEdit, demoMode, className, demoComplete, nextPendingId, bulkMode, conversations, onApproveAllPending }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editContent, setEditContent] = useState('')
  const firstReasonRef = useRef<HTMLButtonElement>(null)

  const handleViewportScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
    setShowScrollButton(!isNearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom()
    }
  }, [messages, showScrollButton, scrollToBottom])

  // Focus first reason button when reject dialog opens
  useEffect(() => {
    if (rejectTarget) {
      firstReasonRef.current?.focus()
    }
  }, [rejectTarget])

  // Escape key closes reject dialog
  useEffect(() => {
    if (!rejectTarget) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRejectTarget(null)
        setRejectReason('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rejectTarget])

  useEffect(() => {
    if (nextPendingId) {
      document.getElementById(`message-${nextPendingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [nextPendingId])

  const handleSubmit = useCallback(() => {
    if (input.trim() && !isLoading) {
      onSend(input.trim())
      setInput('')
    }
  }, [input, isLoading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className={cn('flex flex-col h-full relative gradient-hero', className)}>
      <ScrollArea className="flex-1 scrollbar-thin" onViewportScroll={handleViewportScroll}>
        <div className="px-4 py-6 space-y-6 min-h-full pb-32">
          {bulkMode && conversations ? (
            <div className="space-y-4 px-4 py-6">
              <div className="flex items-center justify-end px-2 py-3 bg-secondary/30 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {conversations.filter(c => c.messages.some(m => m.role === 'assistant' && m.status !== 'pending')).length} of {conversations.length} reviewed
                  </span>
                  <button onClick={onApproveAllPending} className="text-xs px-3 py-1.5 bg-green-900/30 text-green-300 border border-green-700/50 rounded-md hover:bg-green-900/50">
                    Approve All Pending
                  </button>
                </div>
              </div>
              {conversations.map(conv => {
                const assistantMsg = conv.messages.find(m => m.role === 'assistant' && m.status === 'pending')
                return (
                <div key={conv.fanName} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                      {conv.fanInitials}
                    </div>
                    <span className="text-sm font-medium text-foreground">{conv.fanName}</span>
                  </div>
                  {conv.messages.map(msg => (
                    <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary/10 text-foreground border border-primary/20 rounded-tl-sm'
                          : 'bg-muted text-foreground border border-border rounded-tr-sm',
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {assistantMsg && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button type="button" onClick={() => onApprove?.(assistantMsg.id)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-green-900/30 text-green-300 border border-green-700/50 hover:bg-green-900/50 transition-colors"><Check className="h-3.5 w-3.5" /> Approve</button>
                      <button type="button" onClick={() => onReject?.(assistantMsg.id)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/50 hover:bg-red-900/50 transition-colors"><X className="h-3.5 w-3.5" /> Reject</button>
                      <button type="button" onClick={() => { setEditingId(assistantMsg.id); setEditContent(assistantMsg.content) }} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50 hover:bg-blue-900/50 transition-colors"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    </div>
                  )}
                  {conv.messages.some(m => m.role === 'assistant' && m.status === 'approved') && (
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit bg-green-900/40 text-green-300 border border-green-700/50')}>Sent ✓</span>
                  )}
                  {conv.messages.some(m => m.role === 'assistant' && m.status === 'rejected') && (
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit bg-red-900/40 text-red-300 border border-red-700/50')}>Rejected</span>
                  )}
                </div>
                )
              })}
            </div>
          ) : messages.length === 0 ? (
            demoMode ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">OF Agency Dashboard</h2>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  AI drafts replies. You approve them. Nothing goes out unchecked.
                </p>
              </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="h-16 w-16 bg-card border border-border rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to OpenCode</h2>
              <p className="text-muted-foreground max-w-md text-center text-sm">
                Start a conversation by typing a message below. You can ask questions, request code changes, or get help with your projects.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {['Explain this codebase', 'Help me debug', 'Write a test'].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all duration-200 hover:-translate-y-0.5 text-xs"
                    onClick={() => onSend(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
            )
          ) : (
            <>
            {demoComplete && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 px-4 py-3 mb-2 bg-green-900/20 border border-green-700/30 rounded-lg text-green-300 text-sm"
              >
                <Check className="h-4 w-4" />
                All messages processed — press 1-4 to switch scenarios
              </motion.div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  id={`message-${message.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'flex gap-3 group',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1',
                      message.role === 'user'
                        ? 'bg-primary/10 text-primary border border-border/50'
                        : 'bg-muted text-muted-foreground border border-border/50'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div
                    className={cn(
                      'max-w-[80%] flex flex-col gap-1',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary/10 text-foreground border border-primary/20 rounded-tr-sm'
                          : 'bg-card text-foreground border border-border rounded-tl-sm',
                        message.role === 'assistant' && message.status === 'rejected' && 'opacity-50'
                      )}
                    >
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                      ) : (
                        <MarkdownRenderer
                          content={message.content}
                          className="text-sm leading-relaxed"
                        />
                      )}
                    </div>

                    {/* HITL controls — shown only in demo mode */}
                    {demoMode && message.role === 'assistant' && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {/* Status badge */}
                        {message.status && (
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit',
                            message.status === 'pending' && 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
                            message.status === 'approved' && 'bg-green-900/40 text-green-300 border border-green-700/50',
                            message.status === 'rejected' && 'bg-red-900/40 text-red-300 border border-red-700/50',
                          )}>
                            {message.status === 'pending' && 'Pending Review'}
                            {message.status === 'approved' && (message.edited ? 'Sent ✓ (Edited)' : 'Sent ✓')}
                            {message.status === 'rejected' && (message.rejectReason ? `Rejected — ${message.rejectReason}` : 'Rejected')}
                          </span>
                        )}

                        {/* Action buttons — only when pending and not editing */}
                          {message.status === 'pending' && editingId !== message.id && (
                          <>
                            <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onApprove?.(message.id)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-green-900/30 text-green-300 border border-green-700/50 hover:bg-green-900/50 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectTarget(message.id); setRejectReason('') }}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/50 hover:bg-red-900/50 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingId(message.id); setEditContent(message.content) }}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50 hover:bg-blue-900/50 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </div>
                          </>
                        )}

                        {/* Edit mode — shown when editing this specific message */}
                        {editingId === message.id && (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full min-h-[80px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                              autoFocus
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => { onEdit?.(editingId, editContent); setEditingId(null) }}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-green-900/40 text-green-300 border border-green-700/50 hover:bg-green-900/50 transition-colors"
                              >
                                Save & Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 min-h-[36px] text-xs font-medium bg-zinc-700 text-zinc-300 border border-zinc-600 hover:bg-zinc-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs text-muted-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity px-1',
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </>
          )}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-1 border border-border/50">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm shadow-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10"
          >
            <Button
              variant="secondary"
              size="sm"
              className="bg-secondary border border-border rounded-full p-2 shadow-sm transition-all duration-200 hover:scale-105"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4 mr-1" />
              Scroll to bottom
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-border m-4 rounded-2xl p-4 sticky bottom-4 z-10 shadow-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <AutoResizeTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for newline)"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              onClick={onAbort}
              variant="destructive"
              size="icon"
              className="h-[44px] w-[44px] shrink-0 rounded-lg bg-destructive hover:bg-destructive/80 text-destructive-foreground transition-all duration-200"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!input.trim()}
              size="icon"
              className="h-[44px] w-[44px] shrink-0 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-primary/30 hover:shadow-primary/50"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          AI drafts. Human approves. Nothing goes out unchecked.
        </p>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-title" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
          <div className="bg-card border border-border rounded-xl p-5 w-[360px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-3" id="reject-title">Rejection Reason</h3>
            <div className="flex flex-col gap-2 mb-4">
              {['Scam attempt', 'Wrong tone', 'Policy violation', 'Boundary issue'].map((reason) => (
                <button key={reason} type="button" className="text-left px-3 py-2 text-xs rounded-lg bg-muted hover:bg-green-900/20 border border-border hover:border-green-500/30 text-muted-foreground hover:text-green-300 transition-all"
                  ref={reason === 'Scam attempt' ? firstReasonRef : undefined}
                  onClick={() => { onReject?.(rejectTarget, reason); setRejectTarget(null); setRejectReason(''); }}>
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Custom reason..." className="flex-1 px-3 py-1.5 text-xs bg-muted border border-border rounded-md text-foreground focus:outline-none focus:border-green-500/40"
                value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { onReject?.(rejectTarget, rejectReason || undefined); setRejectTarget(null); setRejectReason(''); }}} />
              <button type="button" className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors"
                onClick={() => { onReject?.(rejectTarget, rejectReason || undefined); setRejectTarget(null); setRejectReason(''); }}>
                Confirm
              </button>
            </div>
            <button type="button" className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
