import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import InfoIcon from './InfoIcon';

afterEach(() => cleanup());

describe('InfoIcon', () => {
  it('renders accessible information icon trigger button', () => {
    render(<InfoIcon vocabulary="rasa" termName="Tikta" />);
    const button = screen.getByRole('button', { name: /information|rasa/i });
    expect(button).toBeTruthy();
  });

  it('reveals contextual tooltip on hover/interaction', async () => {
    render(<InfoIcon vocabulary="rasa" />);
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toMatch(/Rasa/i);
  });
});
