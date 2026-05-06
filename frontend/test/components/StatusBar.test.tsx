import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { StatusBar } from '@/components/layout/StatusBar'

describe('StatusBar', () => {
  it('renders model and agent when provided', () => {
    render(<StatusBar model="gpt-4" agent="write" />)
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
    expect(screen.getByText('write')).toBeInTheDocument()
  })

  it('shows disconnected state when isConnected is false', () => {
    render(<StatusBar isConnected={false} />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('shows connected state when isConnected is true', () => {
    render(<StatusBar isConnected={true} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
})
