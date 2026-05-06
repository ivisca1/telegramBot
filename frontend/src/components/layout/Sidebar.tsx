import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { SessionListSkeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  Clock,
  Bot,
  Cpu,
  X,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import type { Session, Model, FileEntry } from '@/types'

interface SidebarProps {
  sessions: Session[]
  currentSessionId?: string
  models: Model[]
  currentModel?: string
  agents: string[]
  currentAgent?: string
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  onDeleteSession: (id: string) => void
  onSelectModel: (model: string) => void
  onSelectAgent: (agent: string) => void
  className?: string
  isLoading?: boolean
  fileList?: FileEntry[]
  fileContent?: string | null
  filesLoading?: boolean
  modelsLoading?: boolean
  configLoading?: boolean
  onListFiles?: (path?: string) => void
  onGetFileContent?: (path: string) => void
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function groupSessions(sessions: Session[]) {
  const groups: Record<string, Session[]> = {}
  const now = new Date()

  sessions.forEach((session) => {
    const date = new Date(session.updated_at || session.created_at || 0)
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

    let label: string
    if (diffDays < 1) label = 'Today'
    else if (diffDays < 2) label = 'Yesterday'
    else if (diffDays < 7) label = 'This week'
    else if (diffDays < 30) label = 'This month'
    else label = 'Older'

    if (!groups[label]) groups[label] = []
    groups[label].push(session)
  })

  const order = ['Today', 'Yesterday', 'This week', 'This month', 'Older']
  return order.map((label) => ({ label, sessions: groups[label] || [] })).filter((g) => g.sessions.length > 0)
}

export function Sidebar({
  sessions,
  currentSessionId,
  models,
  currentModel,
  agents,
  currentAgent,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onSelectModel,
  onSelectAgent,
  isLoading,
  className,
  fileList,
  fileContent,
  filesLoading,
  modelsLoading,
  configLoading,
  onListFiles,
  onGetFileContent,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Today', 'Yesterday']))

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions
    return sessions.filter((s) => (s.name || s.id).toLowerCase().includes(searchQuery.toLowerCase()))
  }, [sessions, searchQuery])

  const grouped = useMemo(() => groupSessions(filteredSessions), [filteredSessions])

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div
      className={cn(
        'w-72 bg-card border-r border-border flex flex-col h-full',
        className
      )}
    >
      <div className="p-3 border-b border-border space-y-2">
        <Button
          onClick={onCreateSession}
          className="w-full gap-2 transition-all duration-200"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>

        <div className="relative">
          {isSearchOpen ? (
            <div className="flex items-center gap-1">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery('')
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-muted-foreground hover:bg-muted/50 transition-all"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              Search sessions...
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-3 space-y-3">
          {isLoading && grouped.length === 0 ? (
            <SessionListSkeleton />
          ) : grouped.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center px-4"
            >
              <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No sessions found' : 'No sessions yet'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ label, sessions: groupSessions }) => (
                <div key={label}>
                  <button
                    onClick={() => toggleGroup(label)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
                  >
                    {expandedGroups.has(label) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {label}
                    <span className="text-muted-foreground/50 ml-1">({groupSessions.length})</span>
                  </button>

                  <AnimatePresence>
                    {expandedGroups.has(label) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 mt-1">
                          {groupSessions.map((session) => (
                            <motion.div
                              key={session.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer group transition-all duration-200',
                                session.id === currentSessionId
                                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                  : 'hover:bg-muted/50'
                              )}
                              onClick={() => onSelectSession(session.id)}
                            >
                              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium text-[13px]">
                                  {session.name || `Session ${session.id.slice(0, 6)}`}
                                </p>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(session.updated_at || session.created_at || '')}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive rounded-md"
                                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id) }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-b border-border/50 mx-3">
        <button
          onClick={() => setFileBrowserOpen(!fileBrowserOpen)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-lg"
        >
          <span>Files</span>
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${fileBrowserOpen ? 'rotate-90' : ''}`} />
        </button>
        {fileBrowserOpen && (
          <div className="px-2 pb-2">
            <button
              onClick={() => onListFiles?.()}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs hover:bg-accent/50 transition-colors text-left"
            >
              <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">/ (root)</span>
            </button>
            {filesLoading ? (
              <p className="text-xs text-muted-foreground px-2 py-1">Loading...</p>
            ) : (
              <div className="space-y-0.5 mt-1">
                {(fileList || []).map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => {
                      if (entry.type === 'directory') {
                        onListFiles?.(entry.path)
                      } else {
                        onGetFileContent?.(entry.path)
                      }
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs hover:bg-accent/50 transition-colors text-left"
                  >
                    {entry.type === 'directory' ? (
                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{entry.name}</span>
                  </button>
                ))}
              </div>
            )}
            {fileContent && (
              <div className="mt-2">
                <pre className="text-[10px] bg-muted p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap break-all">
                  {fileContent}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border space-y-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <Cpu className="h-3.5 w-3.5" />
            Model
          </label>
          <Select value={currentModel} onValueChange={onSelectModel}>
            <SelectTrigger className="w-full h-8 text-xs">
              {modelsLoading ? (
                <span className="text-muted-foreground">Loading models...</span>
              ) : (
                <SelectValue placeholder="Select model" />
              )}
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-sm">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <Bot className="h-3.5 w-3.5" />
            Agent
          </label>
          <Select value={currentAgent} onValueChange={onSelectAgent}>
            <SelectTrigger className="w-full h-8 text-xs">
              {configLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <SelectValue placeholder="Select agent" />
              )}
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent} value={agent} className="text-sm">
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
