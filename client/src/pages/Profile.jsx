import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function resizeImageToBase64(file, maxPx = 260) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarError, setAvatarError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file (JPG, PNG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be smaller than 5 MB.');
      return;
    }

    try {
      const base64 = await resizeImageToBase64(file);
      setAvatarPreview(base64);
      setAvatar(base64);
    } catch {
      setAvatarError('Could not process that image. Please try another.');
    }
    event.target.value = '';
  }

  function removeAvatar() {
    setAvatar(null);
    setAvatarPreview(null);
    setAvatarError('');
  }

  function validate() {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
    }
    if (wantsPasswordChange) {
      if (!currentPassword) errors.currentPassword = 'Enter your current password.';
      if (!newPassword) {
        errors.newPassword = 'Enter a new password.';
      } else if (newPassword.length < 6) {
        errors.newPassword = 'New password must be at least 6 characters long.';
      }
      if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccess('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      setError('');
      const payload = { name: name.trim(), avatar };
      if (wantsPasswordChange) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      await updateProfile(payload);
      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const initials = getInitials(user?.name);

  return (
    <main className="profile-shell">
      <form className="profile-card" onSubmit={handleSubmit} noValidate>

        {/* ── Avatar ── */}
        <div className="avatar-section">
          <div className="avatar-ring">
            <button
              type="button"
              className="avatar-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="avatar-img" />
              ) : (
                <span className="avatar-initials">{initials}</span>
              )}
              <span className="avatar-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
            </button>
          </div>

          <div className="avatar-meta">
            <p className="avatar-name">{user?.name}</p>
            <p className="avatar-email">{user?.email}</p>
            <div className="avatar-actions">
              <button type="button" className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>
                Upload photo
              </button>
              {avatarPreview && (
                <button type="button" className="avatar-remove-btn" onClick={removeAvatar}>
                  Remove
                </button>
              )}
            </div>
            {avatarError && <span className="field-error">{avatarError}</span>}
            <p className="avatar-hint">JPG or PNG · max 5 MB · shown across the app</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        <hr className="auth-divider" />

        {/* ── Alerts ── */}
        {error && <div className="alert" role="alert">{error}</div>}
        {success && <div className="alert success" role="status">{success}</div>}

        {/* ── Name / Email ── */}
        <p className="eyebrow" style={{ color: '#66748a' }}>ACCOUNT DETAILS</p>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>

        <label className="readonly-field">
          Email
          <input value={user?.email || ''} disabled />
        </label>

        {/* ── Password ── */}
        <hr className="auth-divider" />
        <p className="eyebrow" style={{ color: '#66748a' }}>CHANGE PASSWORD</p>

        <label>
          Current password
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" placeholder="Required to change password" />
          {fieldErrors.currentPassword && <span className="field-error">{fieldErrors.currentPassword}</span>}
        </label>

        <div className="form-grid">
          <label>
            New password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" />
            {fieldErrors.newPassword && <span className="field-error">{fieldErrors.newPassword}</span>}
          </label>

          <label>
            Confirm new password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
          </label>
        </div>

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}