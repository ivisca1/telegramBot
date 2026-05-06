export type { Session, Config, Model, FileEntry, Message } from '@gitwithme/shared'

export type Role = 'admin' | 'operator'

export interface SSEEvent {
  type: string
  data: Record<string, unknown>
}

export interface CommandItem {
  command: string
  description: string
  handler: () => void
  shortcut?: string
}
