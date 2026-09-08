import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import Pricing from '../src/components/Pricing.jsx';

describe('Pricing Subscription UI', () => {
  test('renders pricing plans and allows selection', () => {
    render(<Pricing />);
    const starterPlan = screen.getByRole('heading', { name: 'Starter' });
    const proPlan = screen.getByRole('heading', { name: 'Pro' });
    const lifetimePlan = screen.getByRole('heading', { name: 'Lifetime' });
    expect(starterPlan).toBeInTheDocument();
    expect(proPlan).toBeInTheDocument();
    expect(lifetimePlan).toBeInTheDocument();

    const selectButtons = screen.getAllByRole('button');
    expect(selectButtons.length).toBeGreaterThanOrEqual(3);

    fireEvent.click(selectButtons[0]);
    expect(screen.getByText(/Paket Starter dipilih/i)).toBeInTheDocument();
  });

  test('subscription payment flow triggers on plan selection', () => {
    // Pending: Mock payment provider integration and verify call on selection
  });
});
