export interface Session {
  id: string
  name: string
  created_at: string
  updated_at: string
  model?: string
  agent?: string
}

export interface Config {
  model: string
  agent: string
  agents?: string[]
  provider?: string
  temperature?: number
  max_tokens?: number
}

export interface Model {
  id: string
  name: string
  provider: string
}

export interface FileEntry {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status?: 'draft' | 'pending' | 'approved' | 'rejected'
  edited?: boolean
  rejectReason?: string
  timestamp: string
}
