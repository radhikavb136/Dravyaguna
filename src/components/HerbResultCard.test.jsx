import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({ USE_API: true }))
vi.mock('../api/favorites', () => ({
  addFavorite: vi.fn(),
  getFavorites: vi.fn().mockResolvedValue({ data: [] }),
  removeFavorite: vi.fn(),
}))
vi.mock('../api/herbs', () => ({ getHerbById: vi.fn() }))

const testHerb = {
  id: 'herb-1',
  englishName: 'Guduchi',
  botanicalName: 'Tinospora cordifolia',
  partUsed: 'Stem',
  displayLanguage: 'hi-IN',
  match: 100,
  rasa: ['Tikta'],
  indications: [],
  karma: [],
}

describe('HerbResultCard localized field display', () => {
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

  it('shows the cached translation with a clear mock label and keeps herb names unchanged', async () => {
    const { getHerbById } = await import('../api/herbs')
    getHerbById.mockResolvedValue({
      translations: {
        part_used: { text: '[hi-IN mock translation] Stem', status: 'machine_translated', provider: 'mock' },
      },
    })
    const { default: HerbResultCard } = await import('./HerbResultCard')
    render(<MemoryRouter><HerbResultCard herb={testHerb} /></MemoryRouter>)

    expect(await screen.findByText('Mock translation')).toBeTruthy()
    expect(screen.getByText('[hi-IN mock translation] Stem')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Guduchi' })).toBeTruthy()
    expect(getHerbById).toHaveBeenCalledWith('herb-1', 'hi-IN')
  })

  it('keeps the original field and reports failure when translation cannot be loaded', async () => {
    const { getHerbById } = await import('../api/herbs')
    getHerbById.mockRejectedValue(new Error('translation unavailable'))
    const { default: HerbResultCard } = await import('./HerbResultCard')
    render(<MemoryRouter><HerbResultCard herb={testHerb} /></MemoryRouter>)

    expect(await screen.findByText('Translation unavailable; showing original')).toBeTruthy()
    expect(screen.getByText('Stem')).toBeTruthy()
  })
})
