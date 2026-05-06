import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OperatorFanQueuePanel } from './OperatorFanQueuePanel'
import { OperatorFanProfilePanel } from './OperatorFanProfilePanel'
import { ChatArea } from './ChatArea'
import { DEMO_FANS } from '@/lib/demoScenarios'
import type { Message } from '@/types'
import { X } from 'lucide-react'
import AgencyPulseBar from '@/components/AgencyPulseBar'

interface OperatorLayoutProps {
  messages: Message[]
  onSend?: (content: string) => void
  onApprove: (messageId: string) => void
  onReject: (messageId: string, reason?: string) => void
  onEdit: (messageId: string, content: string) => void
  demoMode: boolean
  isLoading?: boolean
  onScenarioSwitch?: (scenarioId: string) => void
  selectedAgent?: string
  availableAgents?: string[]
  onAgentChange?: (agentName: string) => void
}

export function OperatorLayout({
  messages,
  onSend,
  onApprove,
  onReject,
  onEdit,
  demoMode,
  isLoading,
  onScenarioSwitch,
  selectedAgent,
  availableAgents,
  onAgentChange,
}: OperatorLayoutProps) {
  const [selectedFanId, setSelectedFanId] = useState<string | null>(
    DEMO_FANS[0]?.id ?? null
  )
  const [showDemoIndicator, setShowDemoIndicator] = useState(true)

  // Keyboard shortcuts: press 1-4 to switch scenarios
  useEffect(() => {
    const keyMap: Record<string, string> = {
      '1': 'scenario-1-approve',
      '2': 'scenario-2-edit',
      '3': 'scenario-3-reject',
      '4': 'scenario-4-bulk',
    }
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const id = keyMap[e.key]
      if (id) onScenarioSwitch?.(id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onScenarioSwitch])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AgencyPulseBar
        selectedAgent={selectedAgent}
        availableAgents={availableAgents}
        onAgentChange={onAgentChange}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left column — Fan Queue */}
      <div className="w-[240px] shrink-0 overflow-y-auto border-r border-border">
        <OperatorFanQueuePanel
          fans={DEMO_FANS}
          selectedFanId={selectedFanId}
          onSelectFan={setSelectedFanId}
        />
      </div>

      {/* Center column — Chat */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <ChatArea
          messages={messages}
          isLoading={isLoading ?? false}
          onSend={onSend ?? (() => {})}
          onAbort={() => {}}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          demoMode={demoMode}
        />
      </div>

      {/* Right column — Fan Profile */}
      <div className="w-[260px] shrink-0 overflow-y-auto border-l border-border">
        <OperatorFanProfilePanel fanId={selectedFanId} />
      </div>
      </div>

      {/* Floating DEMO indicator */}
      <AnimatePresence>
        {showDemoIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-amber-900/40 text-amber-300 border border-amber-700/50 rounded-full px-3 py-1 text-xs font-medium"
          >
            <span>DEMO — Press 1–4 to switch scenarios</span>
            <button
              type="button"
              onClick={() => setShowDemoIndicator(false)}
              className="text-amber-400 hover:text-amber-200 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}