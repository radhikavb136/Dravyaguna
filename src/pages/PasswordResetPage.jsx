import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, requestPasswordReset } from '../api/passwordReset';

export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (token) await confirmPasswordReset(token, password);
      else await requestPasswordReset(email);
      setMessage(token ? 'Password updated. You can sign in now.' : 'If an account exists for that address, reset instructions will be sent. Email delivery is not configured yet, so no link will arrive until SMTP is connected.');
    } catch (requestError) { setError(requestError.message || 'Unable to process password reset.'); }
    finally { setBusy(false); }
  };
  return (
    <main>
      <h1>{token ? 'Choose a new password' : 'Reset your password'}</h1>
      <form onSubmit={submit}>
        {!token && <label>Email <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
        {token && <label>New password <input type="password" minLength={10} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
        <button type="submit" disabled={busy}>{busy ? 'Please wait…' : token ? 'Update password' : 'Send reset instructions'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <Link to="/auth">Back to sign in</Link>
    </main>
  );
}
