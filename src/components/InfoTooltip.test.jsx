import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import InfoTooltip from './InfoTooltip';

afterEach(() => cleanup());

describe('InfoTooltip component', () => {
  it('renders trigger button with accessible label', () => {
    render(<InfoTooltip contentKey="totalHerbs" />);
    const trigger = screen.getByRole('button', { name: /Total Herbs/i });
    expect(trigger).toBeTruthy();
  });

  it('reveals tooltip on mouse enter and hides on mouse leave', async () => {
    render(<InfoTooltip contentKey="botanicalName" />);
    const trigger = screen.getByRole('button');

    // Initially tooltip is not in DOM
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Hover reveals tooltip
    fireEvent.mouseEnter(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toMatch(/Scientific Latin binomial name/i);

    // Leaving hides tooltip after grace period
    fireEvent.mouseLeave(trigger);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });

  it('supports keyboard focus and escape key to close', async () => {
    render(<InfoTooltip title="Indications" text="Conditions treated by herb." />);
    const trigger = screen.getByRole('button');

    // Focus opens
    fireEvent.focus(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Conditions treated by herb.');

    // Escape closes
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });

  it('toggles open/close on click/tap for mobile devices', async () => {
    render(<InfoTooltip contentKey="rasa" />);
    const trigger = screen.getByRole('button');

    // Click 1: opens
    fireEvent.click(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeTruthy();

    // Click 2: closes
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });
});
