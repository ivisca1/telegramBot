import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Command, Search, Keyboard } from 'lucide-react'
import type { CommandItem } from '@/types'

interface CommandPaletteProps {
  commands: CommandItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ commands, open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.command.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleSelect = (command: CommandItem) => {
    command.handler()
    onOpenChange(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
    } else if (e.key === 'Enter' && filteredCommands.length > 0) {
      e.preventDefault()
      handleSelect(filteredCommands[selectedIndex])
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg overflow-hidden border-border">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="text-base">Commands</DialogTitle>
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Keyboard className="h-3 w-3" />
              <span>Ctrl+K</span>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commands or type /..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border-t border-border">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <motion.button
                  key={command.command}
                  className={cn(
                    'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors',
                    index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => handleSelect(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                    <Command className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium">{command.command}</p>
                    <p className="text-xs text-muted-foreground truncate">{command.description}</p>
                  </div>
                  {command.shortcut && (
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-muted rounded border border-border font-mono">
                      {command.shortcut}
                    </kbd>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
