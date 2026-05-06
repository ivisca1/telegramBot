import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { CommandPalette } from '@/components/layout/CommandPalette'

describe('CommandPalette', () => {
  const mockHandler = vi.fn()
  const commands = [
    { command: '/test', description: 'Test command', handler: mockHandler, shortcut: '⌘T' },
    { command: '/other', description: 'Other command', handler: vi.fn() },
  ]

  it('does not render when open is false', () => {
    render(<CommandPalette commands={commands} open={false} onOpenChange={() => {}} />)
    expect(screen.queryByText('/test')).not.toBeInTheDocument()
  })

  it('renders commands when open is true', () => {
    render(<CommandPalette commands={commands} open={true} onOpenChange={() => {}} />)
    expect(screen.getByText('/test')).toBeInTheDocument()
    expect(screen.getByText('Test command')).toBeInTheDocument()
  })

  it('calls handler when command selected', async () => {
    render(<CommandPalette commands={commands} open={true} onOpenChange={() => {}} />)
    await userEvent.click(screen.getByText('/test'))
    expect(mockHandler).toHaveBeenCalled()
  })
})
