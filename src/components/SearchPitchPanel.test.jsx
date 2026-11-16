import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SearchPitchPanel from './SearchPitchPanel'

afterEach(() => cleanup())

describe('SearchPitchPanel', () => {
  const results = [
    {
      id: 'a',
      englishName: 'Herb A',
      karma: ['Deepana'],
      match: 72,
      breakdown: [{ parameter: 'karma', matched: false }],
    },
    {
      id: 'b',
      englishName: 'Herb B',
      karma: ['Deepana', 'Pachana'],
      match: 55,
    },
  ]

  it('renders nothing when there are no results', () => {
    const { container } = render(<SearchPitchPanel query="test" results={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows query in hint and similarity disclaimer', () => {
    render(
      <SearchPitchPanel
        query="Deepana"
        results={results}
        meta={{ unmatched_tokens: ['fever'] }}
        activeFilters={{ karma: ['Deepana'] }}
      />
    )
    expect(screen.getByText(/For “Deepana”/)).toBeTruthy()
    expect(screen.getByText(/not clinical advice/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Herb A/i }))
    expect(screen.getByText(/not a recommendation/i)).toBeTruthy()
  })

  it('lists verified cautions only in plain-language mode', () => {
    const withCaution = [
      {
        ...results[0],
        cautions: [
          { text: 'Verified caution', verification_status: 'verified' },
          { text: 'Draft caution', verification_status: 'draft' },
        ],
      },
      results[1],
    ]
    render(<SearchPitchPanel query="x" results={withCaution} />)
    fireEvent.click(screen.getByLabelText(/Plain-language labels/i))
    fireEvent.click(screen.getByRole('button', { name: /Herb A/i }))
    expect(screen.getByText('Verified caution')).toBeTruthy()
    expect(screen.queryByText('Draft caution')).toBeNull()
  })
})
