import { useState } from 'react'
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
  selectedAgent?: string
  availableAgents?: string[]
  onAgentChange?: (agentName: string) => void
  selectedFanId: string | null
  onSelectFan: (fanId: string) => void
  demoComplete?: boolean
  nextPendingId?: string | null
  livePendingCounts?: Record<string, number>
  liveStats?: { messagesSent: number, overrides: number, todayRevenue: string }
  bulkMode?: boolean
  conversations?: Array<{ fanName: string, fanInitials: string, messages: Message[] }>
  onApproveAllPending?: () => void
}

export function OperatorLayout({
  messages,
  onSend,
  onApprove,
  onReject,
  onEdit,
  demoMode,
  isLoading,
  selectedAgent,
  availableAgents,
  onAgentChange,
  selectedFanId,
  onSelectFan,
  demoComplete,
  nextPendingId,
  livePendingCounts,
  liveStats,
  bulkMode,
  conversations,
  onApproveAllPending,
}: OperatorLayoutProps) {
  const [showDemoIndicator, setShowDemoIndicator] = useState(true)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AgencyPulseBar
        selectedAgent={selectedAgent}
        availableAgents={availableAgents}
        onAgentChange={onAgentChange}
        liveStats={liveStats}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left column — Fan Queue */}
      <div className="w-[240px] shrink-0 overflow-y-auto border-r border-border">
        <OperatorFanQueuePanel
          fans={DEMO_FANS}
          selectedFanId={selectedFanId}
          onSelectFan={onSelectFan}
          livePendingCounts={livePendingCounts}
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
          demoComplete={demoComplete}
          nextPendingId={nextPendingId}
          bulkMode={bulkMode}
          conversations={conversations}
          onApproveAllPending={onApproveAllPending}
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