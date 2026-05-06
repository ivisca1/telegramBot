import { motion } from 'framer-motion'
import { User } from 'lucide-react'

interface OperatorFanProfilePanelProps {
  fanId: string | null
}

const purchaseTypeColor: Record<string, string> = {
  Custom: 'hsl(38 72% 58%)',
  PPV:    'hsl(210 70% 58%)',
  Tip:    'hsl(158 50% 50%)',
}

export function OperatorFanProfilePanel({ fanId }: OperatorFanProfilePanelProps) {
  if (!fanId) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ background: 'hsl(226 18% 9%)', color: 'hsl(220 10% 34%)' }}
      >
        <User className="h-6 w-6" strokeWidth={1.5} />
        <p style={{ fontSize: 12 }}>Select a fan</p>
      </div>
    )
  }

  const initials   = fanId.slice(0, 2).toUpperCase()
  const memberSince = 'Jan 2025'
  const purchaseHistory = [
    { date: 'Dec 12', type: 'Custom', amount: 80 },
    { date: 'Nov 28', type: 'PPV',    amount: 20 },
    { date: 'Nov 10', type: 'Custom', amount: 120 },
    { date: 'Oct 15', type: 'Tip',    amount: 50 },
  ]
  const totalSpent = purchaseHistory.reduce((s, p) => s + p.amount, 0)
  const preferences = ['Regular', 'High value', 'Custom content', 'Morning']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full overflow-y-auto"
      style={{ background: 'hsl(226 18% 9%)', fontFamily: 'var(--font-sans)' }}
    >
      {/* Avatar + identity */}
      <div
        style={{
          padding: '20px 16px 14px',
          borderBottom: '1px solid hsl(226 14% 13%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'hsl(226 14% 16%)',
            border: '1px solid hsl(226 14% 20%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: 'hsl(38 72% 62%)',
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(38 28% 86%)', marginBottom: 2 }}>
            {fanId}
          </div>
          <div style={{ fontSize: 11, color: 'hsl(220 10% 36%)' }}>Since {memberSince}</div>
        </div>
        {/* Tier badge */}
        <div
          style={{
            background: 'hsl(38 72% 58% / 0.1)',
            border: '1px solid hsl(38 72% 58% / 0.2)',
            borderRadius: 4,
            padding: '2px 10px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'hsl(38 72% 62%)',
          }}
        >
          Top 5%
        </div>
      </div>

      {/* Total spent */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid hsl(226 14% 13%)',
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(220 10% 32%)', marginBottom: 6, fontWeight: 500 }}>
          Lifetime Value
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: '-0.04em',
            color: 'hsl(38 28% 88%)',
            lineHeight: 1,
          }}
        >
          ${totalSpent.toLocaleString()}
        </div>
      </div>

      {/* Purchase history */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(226 14% 13%)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(220 10% 32%)', marginBottom: 8, fontWeight: 500 }}>
          Purchase History
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {purchaseHistory.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < purchaseHistory.length - 1 ? '1px solid hsl(226 14% 11%)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'hsl(38 28% 72%)' }}>{item.date}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: purchaseTypeColor[item.type] ?? 'hsl(220 10% 44%)',
                    marginTop: 1,
                    fontWeight: 500,
                  }}
                >
                  {item.type}
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'hsl(158 50% 54%)',
                  letterSpacing: '-0.02em',
                }}
              >
                ${item.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(220 10% 32%)', marginBottom: 8, fontWeight: 500 }}>
          Preferences
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {preferences.map(pref => (
            <span
              key={pref}
              style={{
                background: 'hsl(226 14% 13%)',
                border: '1px solid hsl(226 14% 18%)',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                color: 'hsl(220 10% 50%)',
              }}
            >
              {pref}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

