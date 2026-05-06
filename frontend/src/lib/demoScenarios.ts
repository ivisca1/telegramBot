import type { Message } from '@/types'

export type MessageStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface DemoFan {
  id: string
  name: string
  priority: 'normal' | 'high' | 'urgent'
  lastMessage: string
  pendingCount: number
}

export const DEMO_FANS: DemoFan[] = [
  {
    id: 'fan-mike',
    name: 'Mike_92',
    priority: 'normal',
    lastMessage: 'Hey babe, what are you up to tonight? 😘',
    pendingCount: 2,
  },
  {
    id: 'fan-jane',
    name: 'TopSpender_Jane',
    priority: 'high',
    lastMessage: 'You look amazing in your last post. Wanna chat more privately?',
    pendingCount: 1,
  },
  {
    id: 'fan-dave',
    name: 'LoyalFan_Dave',
    priority: 'normal',
    lastMessage: 'Loved your latest video!',
    pendingCount: 0,
  },
  {
    id: 'fan-new88',
    name: 'NewUser_88',
    priority: 'normal',
    lastMessage: 'Are you free for a custom?',
    pendingCount: 3,
  },
  {
    id: 'fan-sam',
    name: 'BigTipper_Sam',
    priority: 'urgent',
    lastMessage: "Can you send me your WhatsApp? I'll pay you directly.",
    pendingCount: 1,
  },
]

export interface DemoScenario {
  id: string
  title: string
  description: string
  messages: Message[]
  expectedAction: 'approve' | 'edit' | 'reject'
  talkingPoint: string
  emphasis: 'speed' | 'control' | 'safety'
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scenario-1-approve',
    title: 'Standard Approval',
    description: 'The happy path — AI drafts, chatter approves',
    messages: [
      {
        id: 's1-fan-1',
        role: 'user',
        content: 'Hey babe, what are you up to tonight? 😘',
        timestamp: '2026-05-04T14:23:00Z',
        status: 'approved',
      },
      {
        id: 's1-agent-1',
        role: 'assistant',
        content: 'Hey! Just relaxing after a long day. What about you? 💕',
        timestamp: '2026-05-04T14:23:02Z',
        status: 'pending',
      },
    ],
    expectedAction: 'approve',
    talkingPoint: '80% of replies are approve-and-go. 2 seconds per message.',
    emphasis: 'speed',
  },
  {
    id: 'scenario-2-edit',
    title: 'Tone & Boundary Edit',
    description: 'Chatter adjusts AI draft for brand voice and safety',
    messages: [
      {
        id: 's2-fan-1',
        role: 'user',
        content: 'You look amazing in your last post. Wanna chat more privately?',
        timestamp: '2026-05-04T14:25:00Z',
        status: 'approved',
      },
      {
        id: 's2-agent-1',
        role: 'assistant',
        content: 'Thank you so much! I\'m glad you liked it. What would you like to talk about?',
        timestamp: '2026-05-04T14:25:03Z',
        status: 'pending',
      },
    ],
    expectedAction: 'edit',
    talkingPoint: 'Your chatters know the creator\'s voice. AI is polite — they make it perfect.',
    emphasis: 'control',
  },
  {
    id: 'scenario-3-reject',
    title: 'Scam Block',
    description: 'HITL prevents a data leak and potential stalker',
    messages: [
      {
        id: 's3-fan-1',
        role: 'user',
        content: 'Can you send me your WhatsApp? I\'ll pay you directly, no fees.',
        timestamp: '2026-05-04T14:27:00Z',
        status: 'approved',
      },
      {
        id: 's3-agent-1',
        role: 'assistant',
        content: 'Sure, my WhatsApp is +1-555-0199 — let\'s chat there! 😊',
        timestamp: '2026-05-04T14:27:02Z',
        status: 'pending',
      },
    ],
    expectedAction: 'reject',
    talkingPoint: 'AI sees "payment offer" and gets helpful. Your chatter sees "scam attempt" and blocks it.',
    emphasis: 'safety',
  },
]

export const BULK_QUEUE_SCENARIO: DemoScenario = {
  id: 'scenario-4-bulk',
  title: 'Bulk Queue Processing',
  description: 'Multiple fan conversations awaiting review',
  messages: [
    {
      id: 's4-fan-a',
      role: 'user',
      content: 'Hey beautiful 😍',
      timestamp: '2026-05-04T14:30:00Z',
      status: 'approved',
    },
    {
      id: 's4-agent-a',
      role: 'assistant',
      content: 'Hey! Thanks for the love 💕 How\'s your day going?',
      timestamp: '2026-05-04T14:30:02Z',
      status: 'pending',
    },
    {
      id: 's4-fan-b',
      role: 'user',
      content: 'Loved your latest video!',
      timestamp: '2026-05-04T14:31:00Z',
      status: 'approved',
    },
    {
      id: 's4-agent-b',
      role: 'assistant',
      content: 'Aww thank you! Which one was your favorite? 😊',
      timestamp: '2026-05-04T14:31:03Z',
      status: 'pending',
    },
    {
      id: 's4-fan-c',
      role: 'user',
      content: 'Are you free for a custom?',
      timestamp: '2026-05-04T14:32:00Z',
      status: 'approved',
    },
    {
      id: 's4-agent-c',
      role: 'assistant',
      content: 'I do customs! What did you have in mind? I\'ll check my schedule 💕',
      timestamp: '2026-05-04T14:32:03Z',
      status: 'pending',
    },
  ],
  expectedAction: 'approve',
  talkingPoint: 'Bulk review lets operators process many conversations quickly',
  emphasis: 'speed',
}

export function loadScenario(scenarioId: string): Message[] {
  const all = [...DEMO_SCENARIOS, BULK_QUEUE_SCENARIO]
  const found = all.find((s) => s.id === scenarioId)
  return found ? found.messages : []
}
