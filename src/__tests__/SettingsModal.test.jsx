import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../components/SettingsModal';

const defaultSettings = {
  websiteName: 'My Wedding',
  theme: 'elegant',
  primaryColor: '#0a20ca',
  primaryColorHover: '#1894dc',
  fontFamily: 'sans-serif',
  showCountdown: true,
  allowRsvp: true,
  welcomeMessage: 'Welcome!',
  adminEmail: 'admin@example.com',
};

describe('SettingsModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders all setting fields', () => {
    render(<SettingsModal settings={defaultSettings} onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/website name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/welcome message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/admin email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show wedding countdown/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/allow rsvp/i)).toBeInTheDocument();
  });

  it('pre-fills fields with provided settings', () => {
    render(<SettingsModal settings={defaultSettings} onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/website name/i)).toHaveValue('My Wedding');
    expect(screen.getByLabelText(/admin email/i)).toHaveValue('admin@example.com');
  });

  it('calls onSave with updated values when form is submitted', async () => {
    render(<SettingsModal settings={defaultSettings} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/website name/i), {
      target: { value: 'Our Wedding' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].websiteName).toBe('Our Wedding');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<SettingsModal settings={defaultSettings} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets to default values when Reset to Defaults is clicked', () => {
    render(
      <SettingsModal
        settings={{ ...defaultSettings, websiteName: 'Custom Name' }}
        onSave={onSave}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));
    expect(screen.getByLabelText(/website name/i)).toHaveValue('My Wedding');
  });
});
