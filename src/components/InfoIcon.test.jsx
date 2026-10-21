import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/explain', () => ({ explainHerb: vi.fn() }))
vi.mock('../api/vocabulary', () => ({ getTermDefinitions: vi.fn() }))

describe('InfoIcon', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('VITE_USE_API', 'true')
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('loads and labels stored vocabulary definitions', async () => {
    const { getTermDefinitions } = await import('../api/vocabulary')
    getTermDefinitions.mockResolvedValue([{ name: 'Tikta', definition: 'Expert supplied text.', status: 'verified' }])
    const { default: InfoIcon } = await import('./InfoIcon')
    render(<InfoIcon vocabulary="rasa" termName="Tikta" />)

    fireEvent.click(screen.getByRole('button', { name: 'Definition for Tikta' }))
    fireEvent.click(screen.getByRole('button', { name: 'View more' }))

    expect(await screen.findByText('Expert verified')).toBeTruthy()
    expect(screen.getByText('Expert supplied text.')).toBeTruthy()
  })

  it('shows a neutral message when the definition is empty', async () => {
    const { getTermDefinitions } = await import('../api/vocabulary')
    getTermDefinitions.mockResolvedValue([{ name: 'Tikta', definition: '', status: 'draft' }])
    const { default: InfoIcon } = await import('./InfoIcon')
    render(<InfoIcon vocabulary="rasa" termName="Tikta" />)

    fireEvent.click(screen.getByRole('button', { name: 'Definition for Tikta' }))
    fireEvent.click(screen.getByRole('button', { name: 'View more' }))

    expect(await screen.findByText('Definition coming soon.')).toBeTruthy()
  })

  it('labels mock explanations and closes the panel with Escape', async () => {
    const { explainHerb } = await import('../api/explain')
    explainHerb.mockResolvedValue({
      explanation: 'Retrieved data summary.',
      ai_generated: true,
      provider: 'mock',
      citations: [],
      structured: { breakdown: [] },
    })
    const { default: InfoIcon } = await import('./InfoIcon')
    render(<InfoIcon herbId="herb-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'More information about this herb' }))
    fireEvent.click(screen.getByRole('button', { name: 'View more' }))

    expect(await screen.findByText('AI-generated (mock provider)')).toBeTruthy()
    expect(screen.getByText('Retrieved data summary.')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
