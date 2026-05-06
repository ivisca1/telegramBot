import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DemoFan } from '@/lib/demoScenarios'

interface OperatorFanQueuePanelProps {
  fans: DemoFan[]
  selectedFanId: string | null
  onSelectFan: (id: string) => void
}

const TIER_COLORS: Record<string, { accent: string; dot: string; label: string }> = {
  urgent: { accent: 'hsl(38 72% 58%)',  dot: 'bg-amber-400',  label: 'Whale' },
  high:   { accent: 'hsl(210 70% 58%)', dot: 'bg-blue-400',   label: 'Dolphin' },
  normal: { accent: 'hsl(158 50% 46%)', dot: 'bg-teal-400',   label: 'Fan' },
}

export function OperatorFanQueuePanel({ fans, selectedFanId, onSelectFan }: OperatorFanQueuePanelProps) {
  const totalPending = fans.reduce((sum, f) => sum + f.pendingCount, 0)

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'hsl(226 18% 9%)', fontFamily: 'var(--font-sans)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid hsl(226 14% 14%)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(220 10% 38%)' }}>
          Fan Queue
        </span>
        {totalPending > 0 && (
          <span
            style={{
              background: 'hsl(38 72% 58% / 0.15)',
              color: 'hsl(38 72% 64%)',
              border: '1px solid hsl(38 72% 58% / 0.25)',
              borderRadius: 20,
              padding: '1px 7px',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {totalPending}
          </span>
        )}
      </div>

      {/* Fan list */}
      <div className="flex-1 overflow-y-auto">
        {fans.map((fan, i) => {
          const tier = TIER_COLORS[fan.priority] ?? TIER_COLORS.normal
          const isActive = selectedFanId === fan.id

          return (
            <motion.div
              key={fan.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              onClick={() => onSelectFan(fan.id)}
              className="cursor-pointer transition-colors relative"
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid hsl(226 14% 11%)',
                borderLeft: `2px solid ${isActive ? tier.accent : 'transparent'}`,
                background: isActive ? 'hsl(226 14% 13%)' : 'transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'hsl(226 14% 12%)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <div className="flex items-start gap-2.5">
                {/* Status dot */}
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', tier.dot)} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: isActive ? 'hsl(38 28% 92%)' : 'hsl(38 28% 80%)',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 140,
                      }}
                    >
                      {fan.name}
                    </span>
                    {fan.pendingCount > 0 && (
                      <span
                        style={{
                          background: 'hsl(226 14% 18%)',
                          border: '1px solid hsl(226 14% 22%)',
                          borderRadius: 20,
                          padding: '0 5px',
                          fontSize: 10,
                          fontWeight: 500,
                          fontFamily: 'var(--font-mono)',
                          color: 'hsl(220 10% 60%)',
                          flexShrink: 0,
                        }}
                      >
                        {fan.pendingCount}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'hsl(220 10% 40%)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }}
                  >
                    {fan.lastMessage}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: tier.accent,
                      opacity: 0.7,
                    }}
                  >
                    $1.2k · {tier.label}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

