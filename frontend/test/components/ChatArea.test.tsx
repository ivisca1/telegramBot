import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ChatArea } from '@/components/layout/ChatArea'

describe('ChatArea', () => {
  const mockOnSend = vi.fn()
  const mockOnAbort = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders empty state with suggestion buttons', () => {
    render(
      <ChatArea messages={[]} isLoading={false} onSend={mockOnSend} onAbort={mockOnAbort} />
    )
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
  })

  it('renders messages list', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
      { id: '2', role: 'assistant' as const, content: 'Hi there!', timestamp: new Date().toISOString() },
    ]
    render(
      <ChatArea messages={messages} isLoading={false} onSend={mockOnSend} onAbort={mockOnAbort} />
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('calls onSend when Enter pressed with text', async () => {
    render(
      <ChatArea messages={[]} isLoading={false} onSend={mockOnSend} onAbort={mockOnAbort} />
    )
    const textarea = screen.getByPlaceholderText(/type a message/i)
    await userEvent.type(textarea, 'test message{Enter}')
    expect(mockOnSend).toHaveBeenCalledWith('test message')
  })

  it('disables input when isLoading', () => {
    render(
      <ChatArea messages={[{ id: '1', role: 'user' as const, content: 'Hey', timestamp: new Date().toISOString() }]}
                isLoading={true} onSend={mockOnSend} onAbort={mockOnAbort} />
    )
    expect(screen.getByPlaceholderText(/type a message/i)).toBeDisabled()
  })
})
