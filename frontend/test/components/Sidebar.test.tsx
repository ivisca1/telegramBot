import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Sidebar } from '@/components/layout/Sidebar'

describe('Sidebar', () => {
  const mockOnSelectSession = vi.fn()
  const mockOnCreateSession = vi.fn()
  const mockOnDeleteSession = vi.fn()
  const mockOnSelectModel = vi.fn()
  const mockOnSelectAgent = vi.fn()

  beforeEach(() => vi.restoreAllMocks())

  it('renders session list', () => {
    const sessions = [
      { id: '1', name: 'Session One', created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '2', name: 'Session Two', created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    render(
      <Sidebar sessions={sessions} models={[]} agents={[]}
               onSelectSession={mockOnSelectSession} onCreateSession={mockOnCreateSession}
               onDeleteSession={mockOnDeleteSession} onSelectModel={mockOnSelectModel}
               onSelectAgent={mockOnSelectAgent} />
    )
    expect(screen.getByText('Session One')).toBeInTheDocument()
    expect(screen.getByText('Session Two')).toBeInTheDocument()
  })

  it('calls onSelectSession when session clicked', async () => {
    const sessions = [{ id: '1', name: 'Test Session', created_at: '', updated_at: '' }]
    render(
      <Sidebar sessions={sessions} models={[]} agents={[]}
               onSelectSession={mockOnSelectSession} onCreateSession={mockOnCreateSession}
               onDeleteSession={mockOnDeleteSession} onSelectModel={mockOnSelectModel}
               onSelectAgent={mockOnSelectAgent} />
    )
    await userEvent.click(screen.getByText('Test Session'))
    expect(mockOnSelectSession).toHaveBeenCalledWith('1')
  })

  it('shows a button to create new session', () => {
    render(
      <Sidebar sessions={[]} models={[]} agents={[]}
               onSelectSession={mockOnSelectSession} onCreateSession={mockOnCreateSession}
               onDeleteSession={mockOnDeleteSession} onSelectModel={mockOnSelectModel}
               onSelectAgent={mockOnSelectAgent} />
    )
    expect(screen.getByText(/new session/i)).toBeInTheDocument()
  })
})
