import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordStrength } from './password-strength';

describe('PasswordStrength', () => {
  it('marks the rules a password satisfies', () => {
    render(<PasswordStrength password="abcdefg1" />);
    for (const rule of ['8+ characters', 'A letter', 'A number']) {
      expect(screen.getByText(rule)).toHaveClass('text-success');
    }
    expect(screen.getByText('Upper & lower case')).toHaveClass('text-muted-foreground');
  });
});
