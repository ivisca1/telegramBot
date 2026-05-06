import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgencyPulseBarProps {
  selectedAgent?: string
  availableAgents?: string[]
  onAgentChange?: (agentName: string) => void
  liveStats?: { messagesSent: number, overrides: number, todayRevenue: string }
}

const AGENT_DISPLAY: Record<string, { label: string; desc: string; dot: string }> = {
  'of-chatter-organic':         { label: 'Standard',   desc: 'Conversational, balanced',       dot: 'bg-emerald-400' },
  'of-chatter-shy-organic':    { label: 'Shy',        desc: 'Soft, slow-burn, mysterious',    dot: 'bg-violet-400' },
  'of-chatter-slutty-organic': { label: 'Bold',       desc: 'Dominant, direct, intense',      dot: 'bg-orange-400' },
}

export default function AgencyPulseBar({
  selectedAgent = 'of-chatter-organic',
  availableAgents = ['of-chatter-organic', 'of-chatter-shy-organic', 'of-chatter-slutty-organic'],
  onAgentChange,
  liveStats,
}: AgencyPulseBarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const display = AGENT_DISPLAY[selectedAgent] ?? { label: selectedAgent, desc: '', dot: 'bg-zinc-500' }
  const filtered = availableAgents.filter(a => AGENT_DISPLAY[a])

  return (
    <div
      className="flex items-center justify-between border-b"
      style={{
        background: 'hsl(226 18% 9%)',
        borderColor: 'hsl(226 14% 14%)',
        padding: '0 20px',
        height: '40px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(38 28% 88%)', letterSpacing: '-0.01em' }}>
          HITL - Chatter Dashboard
        </span>
        <span style={{ width: 1, height: 14, background: 'hsl(226 14% 18%)', display: 'block' }} />
        <span style={{ fontSize: 11, color: 'hsl(220 10% 36%)', fontWeight: 400 }}>Demo Mode</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5">
        <StatItem label="Today" value={liveStats?.todayRevenue ?? '$4,230'} valueStyle={{ color: 'hsl(38 72% 62%)' }} />
        <StatItem label="msgs" value={liveStats?.messagesSent.toString() ?? '847'} />
        <StatItem label="PPV" value="12.4%" valueStyle={{ color: 'hsl(158 50% 58%)' }} />
        <StatItem label="overrides" value={liveStats?.overrides.toString() ?? '3'} valueStyle={{ color: 'hsl(36 90% 60%)' }} />
      </div>

      {/* Right: hint + agent picker */}
      <div className="flex items-center gap-4">
        <span style={{ fontSize: 10, color: 'hsl(220 10% 30%)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Keys 1–4
        </span>

        {/* Agent dropdown */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 transition-colors"
            style={{
              background: 'hsl(226 16% 12%)',
              border: '1px solid hsl(226 14% 18%)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              color: 'hsl(38 28% 80%)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(226 14% 26%)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(226 14% 18%)')}
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full shrink-0', display.dot)}
              style={{ marginTop: 1 }}
            />
            <span style={{ fontWeight: 500 }}>{display.label}</span>
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
              style={{ color: 'hsl(220 10% 40%)', marginLeft: 2 }}
            />
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-1.5 z-50 overflow-hidden"
              style={{
                width: 224,
                background: 'hsl(226 18% 10%)',
                border: '1px solid hsl(226 14% 18%)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                padding: '4px 0',
              }}
            >
              {filtered.map(name => {
                const info = AGENT_DISPLAY[name]
                const active = name === selectedAgent
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onAgentChange?.(name); setOpen(false) }}
                    className="w-full text-left flex items-center gap-3 transition-colors"
                    style={{
                      padding: '8px 12px',
                      background: active ? 'hsl(226 14% 14%)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'hsl(226 14% 13%)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-0.5', info?.dot ?? 'bg-zinc-500')} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 12, fontWeight: 500, color: active ? 'hsl(38 72% 62%)' : 'hsl(38 28% 80%)' }}>
                        {info?.label ?? name}
                      </div>
                      {info?.desc && (
                        <div style={{ fontSize: 10, color: 'hsl(220 10% 38%)', marginTop: 1 }}>{info.desc}</div>
                      )}
                    </div>
                    {active && <Check className="h-3 w-3 shrink-0" style={{ color: 'hsl(38 72% 62%)' }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatItem({
  label,
  value,
  valueStyle,
}: {
  label: string
  value: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '-0.03em',
          color: 'hsl(38 28% 80%)',
          ...valueStyle,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 10, color: 'hsl(220 10% 36%)' }}>{label}</span>
    </div>
  )
}

