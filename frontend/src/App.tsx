import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatusBar, Sidebar, ChatArea, CommandPalette } from '@/components/layout'
import { useSessions, useChat, useConfig, useModels, useRealtime } from '@/hooks'
import { Toaster, toast } from 'sonner'
import type { CommandItem, Message } from '@/types'
import { OperatorLayout } from '@/components/layout'
import { DEMO_SCENARIOS, BULK_QUEUE_SCENARIO, DEMO_FANS, loadScenario } from '@/lib/demoScenarios'
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
  const [selectedAgent, setSelectedAgent] = useState("of-chatter-organic")
  const [availableAgents, setAvailableAgents] = useState<string[]>(["of-chatter-organic", "of-chatter-shy-organic", "of-chatter-slutty-organic"])
  const [selectedFanId, setSelectedFanId] = useState<string | null>(null)
  const [demoComplete, setDemoComplete] = useState(false)
  const [nextPendingId, setNextPendingId] = useState<string | null>(null)
  const [liveStats, setLiveStats] = useState({ messagesSent: 0, overrides: 0, todayRevenue: '$4,230' })

  // Fetch available agents from OpenCode
  useEffect(() => {
    if (!DEMO_MODE) return
    opencodeClient.app.agents().then(({ data }: any) => {
      if (data && Array.isArray(data)) {
        const names = data
          .filter((a: any) => a.mode === "primary" && !a.hidden && a.name?.startsWith("of-chatter") && a.name?.includes("-organic"))
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
  }, [selectedAgent])

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
    setLiveStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }))

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
    } catch (err: any) {
      if (err?.name === 'AbortError') return
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
      if (currentScenarioRef.current !== currentScenario) return
      setDemoMessages(prev => [...prev, aiDraft])
    }
  }, [demoSessionId, selectedAgent])

  handleDemoSendRef.current = handleDemoSend

  const [currentScenario, setCurrentScenario] = useState('scenario-1-approve')
  const currentScenarioRef = useRef(currentScenario)
  useEffect(() => { currentScenarioRef.current = currentScenario }, [currentScenario])

  // Reload messages when scenario changes; abort in-flight demo prompt
  useEffect(() => {
    demoAbortRef.current?.abort()
    setDemoLoading(false)
    setDemoComplete(false)
    setNextPendingId(null)
    const scenario = [...DEMO_SCENARIOS, BULK_QUEUE_SCENARIO].find(s => s.id === currentScenario)
    setDemoMessages(scenario ? scenario.messages : [])
    if (scenario?.fanId && DEMO_FANS.some(f => f.id === scenario.fanId)) { setSelectedFanId(scenario.fanId) }
  }, [currentScenario])

  // Keyboard shortcuts: press 1-4 to switch scenarios (demo section, before early return)
  useEffect(() => {
    if (!DEMO_MODE) return
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

  // Derive demoComplete/nextPendingId from demoMessages reactively
  useEffect(() => {
    const pending = demoMessages.filter(m => m.role === 'assistant' && m.status === 'pending')
    setNextPendingId(pending.length > 0 ? pending[0].id : null)
    setDemoComplete(demoMessages.length > 0 && pending.length === 0)
  }, [demoMessages])

  const handleApprove = (messageId: string) => {
    setDemoMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: 'approved' as const } : m
      )
    )
    setLiveStats(prev => ({
      ...prev,
      overrides: prev.overrides + 1,
      todayRevenue: `$${(parseInt(prev.todayRevenue.replace(/[$,]/g, '')) + 35).toLocaleString()}`,
    }))
  }

  const handleReject = (messageId: string, reason?: string) => {
    setDemoMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: 'rejected' as const, rejectReason: reason || 'Rejected' } : m
      )
    )
    setLiveStats(prev => ({ ...prev, overrides: prev.overrides + 1 }))
  }

  const handleEdit = (messageId: string, content: string) => {
    setDemoMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content, status: 'approved' as const, edited: true } : m
      )
    )
    setLiveStats(prev => ({ ...prev, overrides: prev.overrides + 1 }))
  }

  const handleApproveAllPending = useCallback(() => {
    setDemoMessages(prev => prev.map(m =>
      m.status === 'pending' && m.role === 'assistant'
        ? { ...m, status: 'approved' as const }
        : m
    ))
  }, [])

  const onSelectFan = useCallback((fanId: string) => {
    setSelectedFanId(fanId)
    const scenario = [...DEMO_SCENARIOS, BULK_QUEUE_SCENARIO].find(s => s.fanId === fanId)
    if (scenario) setCurrentScenario(scenario.id)
  }, [])

  const livePendingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const msg of demoMessages) {
      if (msg.role === 'assistant' && msg.status === 'pending') {
        const scenario = [...DEMO_SCENARIOS, BULK_QUEUE_SCENARIO].find(s => s.id === currentScenario)
        if (scenario?.fanId) {
          counts[scenario.fanId] = (counts[scenario.fanId] || 0) + 1
        }
      }
    }
    return counts
  }, [demoMessages, currentScenario])

  const isBulkMode = currentScenario === 'scenario-4-bulk'
  const bulkConversations = isBulkMode ? (BULK_QUEUE_SCENARIO as typeof BULK_QUEUE_SCENARIO & { conversations: Array<{ fanName: string, fanInitials: string, messages: Message[] }> }).conversations : undefined

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
        selectedAgent={selectedAgent}
        availableAgents={availableAgents}
        onAgentChange={setSelectedAgent}
        selectedFanId={selectedFanId}
        onSelectFan={onSelectFan}
        demoComplete={demoComplete}
        nextPendingId={nextPendingId}
        livePendingCounts={livePendingCounts}
        liveStats={liveStats}
        bulkMode={isBulkMode}
        conversations={bulkConversations}
        onApproveAllPending={handleApproveAllPending}
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
