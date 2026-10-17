import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { StoreProvider } from './state/store';
import { createSeed } from './state/seed';

function setup() {
  const user = userEvent.setup();
  render(
    <StoreProvider initial={createSeed()}>
      <App />
    </StoreProvider>,
  );
  return user;
}

describe('<App />', () => {
  it('renders the seeded board', () => {
    setup();
    expect(screen.getByRole('textbox', { name: 'Board name' })).toHaveValue('Product launch');
    expect(screen.getByRole('region', { name: /Backlog, 3 cards/ })).toBeInTheDocument();
  });

  it('adds a card from the column composer, then undoes it', async () => {
    const user = setup();
    const backlog = screen.getByRole('region', { name: /Backlog/ });
    await user.click(within(backlog).getByRole('button', { name: /Add card/ }));
    await user.type(within(backlog).getByRole('textbox', { name: /New card title/ }), 'Write the README{Enter}');
    expect(within(backlog).getByText('Write the README')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(within(backlog).queryByText('Write the README')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(within(backlog).getByText('Write the README')).toBeInTheDocument();
  });

  it('filters cards by text', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox', { name: 'Filter cards' }), 'timezone');
    expect(screen.getByText('Fix timezone bug in due dates')).toBeInTheDocument();
    expect(screen.queryByText('Pricing page illustrations')).not.toBeInTheDocument();
  });

  it('opens a card, edits its priority and checklist', async () => {
    const user = setup();
    await user.click(screen.getByText('Pricing page illustrations'));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: 'urgent' }));
    expect(within(dialog).getByRole('radio', { name: 'urgent' })).toHaveAttribute('aria-checked', 'true');
    await user.type(within(dialog).getByRole('textbox', { name: 'New checklist item' }), 'Sketch hero{Enter}');
    expect(within(dialog).getByText('Sketch hero')).toBeInTheDocument();
  });

  it('runs a command from the palette', async () => {
    const user = setup();
    await user.keyboard('{Control>}k{/Control}');
    const input = screen.getByRole('combobox', { name: 'Search commands' });
    await user.type(input, 'personal');
    await user.keyboard('{Enter}');
    await new Promise((r) => requestAnimationFrame(r));
    expect(await screen.findByDisplayValue('Personal')).toBeInTheDocument();
  });
});
