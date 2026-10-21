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

  it('submits a question and labels development mock output without presenting it as AI', async () => {
    const { explainHerb } = await import('../api/explain')
    explainHerb.mockResolvedValue({
      explanation: 'Development mock only.',
      answer_status: 'mock',
      ai_generated: false,
      provider: 'mock',
      citations: [{ source: 'database:herb:TEST_REC_1', title: 'Stored test record' }],
      structured: { breakdown: [] },
    })
    const { default: InfoIcon } = await import('./InfoIcon')
    render(<InfoIcon herbId="herb-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'More information about this herb' }))
    fireEvent.click(screen.getByRole('button', { name: 'View more' }))
    fireEvent.change(screen.getByLabelText('Ask a question about this herb'), { target: { value: 'What rasa is recorded?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))

    expect(await screen.findByText('Development mock — no AI answer was generated.')).toBeTruthy()
    expect(explainHerb).toHaveBeenCalledWith({ herbId: 'herb-1', question: 'What rasa is recorded?', filters: {}, lang: 'en-IN' })
    expect(screen.getByText('Development mock only.')).toBeTruthy()
    expect(screen.getByText('database:herb:TEST_REC_1 · Stored test record')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
