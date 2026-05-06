import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Cpu,
  Bot,
  Zap,
  Wifi,
  WifiOff,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
interface StatusBarProps {
  model?: string
  agent?: string
  contextUsage?: number
  onToggleSidebar?: () => void
  isSidebarOpen?: boolean
  isConnected?: boolean
  configLoading?: boolean
  className?: string
}

export function StatusBar({
  model,
  agent,
  contextUsage,
  onToggleSidebar,
  isSidebarOpen = true,
  isConnected = false,
  configLoading,
  className,
}: StatusBarProps) {

  const getContextColor = (usage: number) => {
    if (usage < 50) return 'text-success'
    if (usage < 80) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center gap-3',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onToggleSidebar}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-2 min-w-0">
          {model ? (
            <div className="flex items-center gap-1.5 text-sm">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground hidden sm:inline">Model:</span>
              <span className="font-medium truncate max-w-[200px]">{model}</span>
            </div>
          ) : configLoading ? (
            <div className="flex items-center gap-1.5 text-sm">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 animate-pulse" />
              <span className="text-muted-foreground/40 hidden sm:inline">Model:</span>
              <span className="text-muted-foreground/40">Loading...</span>
            </div>
          ) : null}

          {agent ? (
            <div className="flex items-center gap-1.5 text-sm">
              <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground hidden sm:inline">Agent:</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {agent}
              </Badge>
            </div>
          ) : configLoading ? (
            <div className="flex items-center gap-1.5 text-sm">
              <Bot className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 animate-pulse" />
              <span className="text-muted-foreground/40 hidden sm:inline">Agent:</span>
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground/40">Loading...</Badge>
            </div>
          ) : null}

          {contextUsage !== undefined && (
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className={cn('h-3.5 w-3.5 shrink-0', getContextColor(contextUsage))} />
              <span className="text-muted-foreground hidden sm:inline">Context:</span>
              <span className={cn('font-medium', getContextColor(contextUsage))}>
                {contextUsage}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
            isConnected
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {isConnected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <ThemeToggle />
      </div>
    </div>
  )
}
