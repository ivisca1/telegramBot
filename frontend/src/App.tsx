import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatusBar, Sidebar, ChatArea, CommandPalette } from '@/components/layout'
import { useSessions, useChat, useConfig, useModels, useRealtime } from '@/hooks'
import { Toaster, toast } from 'sonner'
import type { CommandItem, Message } from '@/types'
import { OperatorLayout } from '@/components/layout'
import { loadScenario } from '@/lib/demoScenarios'
import { opencodeClient } from '@/opencode/client'

const DEMO_MODE = true

function App() {
  // --- Demo mode state (moved before admin hooks for early return) ---
  const [demoMessages, setDemoMessages] = useState<Message[]>(() => loadScenario('scenario-1-approve'))
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const pendingContent = useRef<string | null>(null)
  const handleDemoSendRef = useRef<((content: string) => Promise<void>) | null>(null)
  const demoAbortRef = useRef<AbortController | null>(null)
  const [selectedAgent, setSelectedAgent] = useState("of-chatter")
  const [availableAgents, setAvailableAgents] = useState<string[]>(["of-chatter"])

  // Fetch available agents from OpenCode
  useEffect(() => {
    if (!DEMO_MODE) return
    opencodeClient.app.agents().then(({ data }: any) => {
      if (data && Array.isArray(data)) {
        const names = data
          .filter((a: any) => a.mode === "primary" && !a.hidden && a.name?.startsWith("of-chatter"))
          .map((a: any) => a.name)
          .filter(Boolean) as string[]
        if (names.length > 0) {
          setAvailableAgents(names)
          if (!names.includes(selectedAgent)) setSelectedAgent(names[0])
        }
      }
    }).catch(() => {})
  }, [])

  // Create a demo session on mount for real AI integration
  useEffect(() => {
    if (!DEMO_MODE) return
    const controller = new AbortController()
    opencodeClient.session.create({ title: 'OF Agency Demo' }, { signal: controller.signal })
      .then(async (data: any) => {
        if (data.id || data.data?.id) {
          const id = data.id || data.data?.id
          setDemoSessionId(id)
          console.log('[Demo] Session created:', id)
          // Process pending content directly instead of routing through stale ref
          const stored = pendingContent.current
          pendingContent.current = null
          if (stored) {
            try {
              const result: any = await opencodeClient.session.prompt({
                sessionID: id,
                agent: selectedAgent,
                parts: [{ type: 'text' as const, text: stored }],
              })
              const data = result.data || result
              if (result.error) throw new Error(String(result.error))
              if (data.parts && Array.isArray(data.parts)) {
                let aiContent = ''
                for (const part of data.parts) {
                  if (part.type === 'text' && part.text) aiContent += part.text
                }
                if (aiContent) {
                  setDemoLoading(false)
                  setDemoMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: aiContent,
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                  }])
                  return
                }
              }
              throw new Error('No text content in response')
            } catch (err) {
              console.error('[Demo] SDK prompt failed:', err)
              setDemoLoading(false)
            }
          }
        }
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError') return
        console.error('[Demo] Failed to create session:', err)
      })
    return () => controller.abort()
  }, [])

  const AI_RESPONSES = [
    "Thanks for reaching out! 💕 I'd love to hear more about what you're looking for.",
    "Hey babe! 🥰 I was just thinking about you. What's on your mind?",
    "That's so sweet of you to say! 😘 Want to see something special I filmed today?",
    "You're making me blush! 😊 What kind of content do you like most?",
    "Thanks for the message honey! 💋 I'm shooting new content as we speak.",
    "Aww I appreciate you! 🫶 Want a sneak peek of my next PPV?"
  ]

  const handleDemoSend = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: undefined,
    }
    setDemoMessages(prev => [...prev, userMessage])

    if (!demoSessionId) {
      // Session not ready — queue for auto-send when session resolves
      pendingContent.current = content
      setDemoLoading(true)
      return
    }

    setDemoLoading(true)

    // Abort previous in-flight prompt
    demoAbortRef.current?.abort()
    const controller = new AbortController()
    demoAbortRef.current = controller

    try {
      const result: any = await opencodeClient.session.prompt({
        sessionID: demoSessionId,
        agent: selectedAgent,
        parts: [{ type: 'text', text: content }],
      }, { signal: controller.signal })

      const data = result.data || result

      // Check for API error before processing response body
      if (result.error) {
        throw new Error(String(result.error))
      }

      // Extract text from parts array
      // OpenCode returns: { info: {...}, parts: [{ type: "text", text: "..." }, ...] }
      if (data.parts && Array.isArray(data.parts)) {
        let aiContent = ''
        for (const part of data.parts) {
          if (part.type === 'text' && part.text) {
            aiContent += part.text
          }
        }
        if (aiContent) {
          const aiDraft: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: aiContent,
            timestamp: new Date().toISOString(),
            status: 'pending',
          }
          setDemoLoading(false)
          setDemoMessages(prev => [...prev, aiDraft])
          return
        }
      }

      // No parsable content — let catch handle it
      throw new Error('No text content in response')
    } catch (err) {
      console.error('[Demo] SDK prompt failed:', err)
      setDemoLoading(false)
      const fallback = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)]
      const aiDraft: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fallback,
        timestamp: new Date().toISOString(),
        status: 'pending',
      }
      setDemoMessages(prev => [...prev, aiDraft])
    }
  }, [demoSessionId])

  handleDemoSendRef.current = handleDemoSend

  const [currentScenario, setCurrentScenario] = useState('scenario-1-approve')

  // Reload messages when scenario changes; abort in-flight demo prompt
  useEffect(() => {
    demoAbortRef.current?.abort()
    setDemoLoading(false)
    setDemoMessages(loadScenario(currentScenario))
  }, [currentScenario])

  const handleApprove = (messageId: string) => {
    setDemoMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: 'approved' as const } : m
      )
    )
  }

  const handleReject = (messageId: string, reason?: string) => {
    setDemoMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: 'rejected' as const, rejectReason: reason || 'Rejected' } : m
      )
    )
  }

  const handleEdit = (messageId: string, content: string) => {
    setDemoMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content, status: 'approved' as const, edited: true } : m
      )
    )
  }

  // Demo mode: render operator layout instead of admin dashboard
  if (DEMO_MODE) {
    return (
      <OperatorLayout
        messages={demoMessages}
        onSend={handleDemoSend}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
        demoMode={true}
        isLoading={demoLoading}
        onScenarioSwitch={setCurrentScenario}
        selectedAgent={selectedAgent}
        availableAgents={availableAgents}
        onAgentChange={setSelectedAgent}
      />
    )
  }

  // --- Admin hooks (only run if !DEMO_MODE) ---
  const {
    sessions,
    currentSessionId,
    isLoading: sessionsLoading,
    create: createSession,
    remove: removeSession,
    switchSession,
    refresh: refreshSessions,
    error: sessionsError,
  } = useSessions()

  const {
    messages,
    isLoading: chatLoading,
    error: chatError,
    send,
    abort,
    clear,
  } = useChat(currentSessionId)

  const { config, isLoading: configLoading, updateConfig, error: configError, refresh: refreshConfig } = useConfig()

  const { models, isLoading: modelsLoading, error: modelsError, refresh: refreshModels } = useModels()
  const realtime = useRealtime()

  // Keyboard shortcuts: press 1-4 to switch scenarios
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const scenarioMap: Record<string, string> = {
        '1': 'scenario-1-approve',
        '2': 'scenario-2-edit',
        '3': 'scenario-3-reject',
        '4': 'scenario-4-bulk',
      }
      const scenarioId = scenarioMap[e.key]
      if (scenarioId) {
        setCurrentScenario(scenarioId)
        const names: Record<string, string> = {
          'scenario-1-approve': '1 — Standard Approval',
          'scenario-2-edit': '2 — Tone & Boundary Edit',
          'scenario-3-reject': '3 — Scam Block',
          'scenario-4-bulk': '4 — Bulk Queue',
        }
        if (names[scenarioId]) toast(names[scenarioId])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!realtime.lastEvent) return
    const { type, data } = realtime.lastEvent

    switch (type) {
      case 'session.created':
      case 'session.updated':
        refreshSessions?.()
        break
      case 'session.deleted':
        refreshSessions?.()
        if (typeof data?.id === 'string' && data.id === currentSessionId) {
          switchSession('')
        }
        break
      case 'config.changed':
        refreshConfig?.()
        break
      case 'model.changed':
        refreshModels?.()
        break
    }
  }, [realtime.lastEvent, refreshSessions, refreshConfig, refreshModels, currentSessionId, switchSession])

  useEffect(() => {
    const errors = [sessionsError, chatError, configError, modelsError, realtime.error].filter(Boolean) as Error[]
    errors.forEach(err => {
      toast.error(err.message, { id: err.message })
    })
  }, [sessionsError, chatError, configError, modelsError, realtime.error])

  const handleSend = useCallback(
    (content: string) => {
      send(content)
    },
    [send]
  )

  const handleDeleteSession = useCallback(
    (id: string) => {
      removeSession(id)
    },
    [removeSession]
  )

  const commands: CommandItem[] = [
    {
      command: '/status',
      description: 'Show current session status',
      handler: () => console.log('Status:', { config, currentSessionId }),
      shortcut: '⌘S',
    },
    {
      command: '/model',
      description: 'Change the current model',
      handler: () => setCommandPaletteOpen(false),
    },
    {
      command: '/clear',
      description: 'Clear current session messages',
      handler: () => clear(),
    },
    {
      command: '/new',
      description: 'Create a new session',
      handler: () => createSession(),
      shortcut: '⌘N',
    },
    {
      command: '/theme',
      description: 'Toggle dark/light theme',
      handler: () => {
        document.documentElement.classList.toggle('dark')
      },
    },
  ]

  const agents = config?.agents || (config?.agent ? [config.agent] : [])
  const contextUsage = config ? Math.min(Math.round((messages.length / 100) * 100), 100) : 0

  // Admin dashboard (unchanged)
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background relative">

      <StatusBar
        model={config?.model}
        agent={config?.agent}
        contextUsage={contextUsage}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
        isConnected={realtime.isConnected}
        configLoading={configLoading}
      />

      <div className="flex flex-1 pt-16 overflow-hidden">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                models={models}
                currentModel={config?.model}
                agents={agents}
                currentAgent={config?.agent}
                onSelectSession={switchSession}
                onCreateSession={() => createSession()}
                onDeleteSession={handleDeleteSession}
                onSelectModel={(model) => updateConfig({ model })}
                onSelectAgent={(agent) => updateConfig({ agent })}
                isLoading={sessionsLoading}
                modelsLoading={modelsLoading}
                configLoading={configLoading}
              />
              <div className="w-px bg-gradient-to-b from-transparent via-border/50 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentSessionId ? (
            <ChatArea
              messages={messages}
              isLoading={chatLoading}
              onSend={handleSend}
              onAbort={abort}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select or create a session to start chatting</p>
            </div>
          )}
        </div>
      </div>

      <CommandPalette
        commands={commands}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      <Toaster
        position="bottom-right"
        expand={false}
        richColors
        closeButton
      />
    </div>
  )
}

export default App
