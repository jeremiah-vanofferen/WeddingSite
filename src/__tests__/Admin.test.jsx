import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Admin from '../pages/Admin';

// --- Mock dependencies ---
vi.mock('../utils/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../components/WeddingDetailsModal', () => ({
  WeddingDetailsModal: ({ onClose }) => <div data-testid="wedding-details-modal"><button onClick={onClose}>CloseWD</button></div>,
  ViewDetailsModal: ({ onClose }) => <div data-testid="view-details-modal"><button onClick={onClose}>CloseVD</button></div>,
}));

vi.mock('../components/GuestManagementModal', () => ({
  GuestManagementModal: ({ onClose }) => <div data-testid="guest-management-modal"><button onClick={onClose}>CloseGuests</button></div>,
  AddGuestModal: ({ onSave, onClose }) => <div data-testid="add-guest-modal"><button onClick={() => onSave({})}>SaveGuest</button><button onClick={onClose}>CancelGuest</button></div>,
}));

vi.mock('../components/ScheduleModal', () => ({
  ScheduleModal: ({ onClose }) => <div data-testid="schedule-modal"><button onClick={onClose}>CloseSchedule</button></div>,
  AddEventModal: ({ onSave, onClose }) => <div data-testid="add-event-modal"><button onClick={() => onSave({})}>SaveEvent</button><button onClick={onClose}>CancelEvent</button></div>,
}));

vi.mock('../components/PhotoGalleryModal', () => ({
  PhotoGalleryModal: ({ onClose }) => <div data-testid="photo-gallery-modal"><button onClick={onClose}>ClosePhotos</button></div>,
  AddPhotoModal: ({ onSave, onClose }) => <div data-testid="add-photo-modal"><button onClick={() => onSave({ url: '/img.jpg', caption: 'test', featured: false })}>SavePhoto</button><button onClick={onClose}>CancelPhoto</button></div>,
}));

vi.mock('../components/SettingsModal', () => ({
  SettingsModal: ({ onSave, onClose }) => <div data-testid="settings-modal"><button onClick={() => onSave({ theme: 'modern' })}>SaveSettings</button><button onClick={onClose}>CloseSettings</button></div>,
}));

vi.mock('../components/GalleryApprovalModal', () => ({
  default: ({ onClose }) => <div data-testid="gallery-approval-modal"><button onClick={onClose}>CloseApprovals</button></div>,
}));

vi.mock('../components/ChangePasswordModal', () => ({
  default: ({ onSave, onClose }) => (
    <div data-testid="change-password-modal">
      <button onClick={() => onSave({ currentPassword: 'oldpass123', newPassword: 'newpass123', confirmPassword: 'newpass123' })}>SaveChangePassword</button>
      <button onClick={onClose}>CloseChangePassword</button>
    </div>
  ),
}));

import { useAuth } from '../utils/AuthContext';

const loggedInAuth = {
  isLoggedIn: true,
  logout: vi.fn(),
  adminName: 'TestAdmin',
};

const loggedOutAuth = {
  isLoggedIn: false,
  logout: vi.fn(),
  adminName: null,
};

const mockSchedule = [{ id: 1, title: 'Ceremony', time: '14:00', description: 'Main event', sort_order: 1 }];
const mockMessages = [
  { id: 1, name: 'Eve', email: 'eve@test.com', message: 'Hello!', created_at: '2026-01-01T10:00:00Z', is_read: false },
];
const mockSettings = { theme: 'elegant', primaryColor: '#0a20ca', showCountdown: 'true', allowRsvp: 'true' };

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue(loggedInAuth);

  global.fetch = vi.fn((url) => {
    if (url.includes('/schedule')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSchedule) });
    if (url.includes('/messages')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMessages) });
    if (url.includes('/settings')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSettings) });
    if (url.includes('/gallery')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

describe('Admin – not logged in', () => {
  it('renders Access Denied when not authenticated', () => {
    useAuth.mockReturnValue(loggedOutAuth);
    render(<Admin />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/must be logged in/i)).toBeInTheDocument();
  });
});

describe('Admin – logged in', () => {
  it('renders the admin dashboard with all sections', async () => {
    render(<Admin />);
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome, TestAdmin/i)).toBeInTheDocument();
    expect(screen.getByText('Wedding Details')).toBeInTheDocument();
    expect(screen.getByText('Guest Management')).toBeInTheDocument();
    expect(screen.getByText('Schedule & Timeline')).toBeInTheDocument();
    expect(screen.getByText('Photo Gallery')).toBeInTheDocument();
    expect(screen.getByText('Photo Approvals')).toBeInTheDocument();
    expect(screen.getByText('Website Settings')).toBeInTheDocument();
    expect(screen.getByText('Account Security')).toBeInTheDocument();
    expect(screen.getByText('Contact Messages')).toBeInTheDocument();
  });

  it('shows the logout button and calls logout on click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Logout'));
    expect(loggedInAuth.logout).toHaveBeenCalled();
  });

  it('loads and displays messages from API', async () => {
    render(<Admin />);
    await waitFor(() => expect(screen.getByText('Eve')).toBeInTheDocument());
  });

  it('shows "No messages yet." when messages array is empty', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/schedule')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/messages')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/settings')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSettings) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<Admin />);
    await waitFor(() => expect(screen.getByText(/No messages yet/i)).toBeInTheDocument());
  });

  it('opens WeddingDetailsModal on Edit Details click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Edit Details'));
    expect(await screen.findByTestId('wedding-details-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('CloseWD'));
    expect(screen.queryByTestId('wedding-details-modal')).not.toBeInTheDocument();
  });

  it('opens ViewDetailsModal on View Details click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('View Details'));
    expect(await screen.findByTestId('view-details-modal')).toBeInTheDocument();
  });

  it('opens GuestManagementModal on Manage Guests click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Manage Guests'));
    expect(await screen.findByTestId('guest-management-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('CloseGuests'));
    expect(screen.queryByTestId('guest-management-modal')).not.toBeInTheDocument();
  });

  it('opens AddGuestModal on Add Guest click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Add Guest'));
    expect(await screen.findByTestId('add-guest-modal')).toBeInTheDocument();
  });

  it('submits add guest to API when saved', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Add Guest'));
    await screen.findByTestId('add-guest-modal');
    fireEvent.click(screen.getByText('SaveGuest'));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/guests'),
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('opens ScheduleModal on Edit Schedule click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Edit Schedule'));
    expect(await screen.findByTestId('schedule-modal')).toBeInTheDocument();
  });

  it('opens AddEventModal and saves a new event', async () => {
    global.fetch = vi.fn((url, opts) => {
      if (url.includes('/schedule') && opts?.method === 'POST')
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 2, title: 'Reception', time: '18:00', description: '', sort_order: 2 }) });
      if (url.includes('/schedule')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSchedule) });
      if (url.includes('/messages')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/settings')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSettings) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<Admin />);
    fireEvent.click(screen.getByText('Add Event'));
    expect(await screen.findByTestId('add-event-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('SaveEvent'));
    await waitFor(() => expect(screen.queryByTestId('add-event-modal')).not.toBeInTheDocument());
  });

  it('opens PhotoGalleryModal on Manage Photos click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Manage Photos'));
    expect(await screen.findByTestId('photo-gallery-modal')).toBeInTheDocument();
  });

  it('opens AddPhotoModal and saves a new photo', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Upload Photo'));
    expect(await screen.findByTestId('add-photo-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('SavePhoto'));
    await waitFor(() => expect(screen.queryByTestId('add-photo-modal')).not.toBeInTheDocument());
  });

  it('opens SettingsModal and saves settings via API', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Edit Settings'));
    expect(await screen.findByTestId('settings-modal')).toBeInTheDocument();

    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    fireEvent.click(screen.getByText('SaveSettings'));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/settings'), expect.objectContaining({ method: 'PUT' }))
    );
  });

  it('opens ChangePasswordModal and submits change password to API', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Change Password'));
    expect(await screen.findByTestId('change-password-modal')).toBeInTheDocument();

    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));
    fireEvent.click(screen.getByText('SaveChangePassword'));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/change-password'),
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('shows message detail modal when a message is clicked', async () => {
    render(<Admin />);
    await waitFor(() => screen.getByText('Eve'));
    fireEvent.click(screen.getByText('Eve'));
    await waitFor(() => expect(screen.getByText('Hello!')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('Hello!')).not.toBeInTheDocument());
  });

  it('opens GalleryApprovalModal on Review Submissions click', async () => {
    render(<Admin />);
    fireEvent.click(screen.getByText('Review Submissions'));
    expect(await screen.findByTestId('gallery-approval-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('CloseApprovals'));
    expect(screen.queryByTestId('gallery-approval-modal')).not.toBeInTheDocument();
  });
});
