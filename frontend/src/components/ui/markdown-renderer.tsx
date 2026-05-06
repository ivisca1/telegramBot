import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '@/hooks/useTheme'
import { Check, Copy } from 'lucide-react'
import { useState, useCallback } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

interface CodeBlockProps {
  language: string
  value: string
}

function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const { resolvedTheme } = useTheme()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={resolvedTheme === 'dark' ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: '1.7',
        }}
        wrapLines
        showLineNumbers
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: resolvedTheme === 'dark' ? '#4b5563' : '#9ca3af',
          userSelect: 'none',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const childArray = Array.isArray(children) ? children : [children]
            const textContent = childArray.join('')

            if (match) {
              return (
                <CodeBlock
                  language={match[1]}
                  value={textContent}
                />
              )
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => <>{children}</>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-3 bg-muted/30 rounded-r-md italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
