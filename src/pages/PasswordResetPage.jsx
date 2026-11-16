import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, requestPasswordReset, updatePasswordWithSession } from '../api/passwordReset';
import { USE_API, getApiBaseUrl } from '../api/client';
import { useUiText } from '../i18n/useUiText';
import '../styles/PasswordResetPage.css';

export default function PasswordResetPage() {
  const t = useUiText();
  const [params] = useSearchParams();

  // Support query token/code/token_hash AND Supabase Auth URL hash fragment recovery links
  const queryToken = params.get('token') || params.get('code') || params.get('token_hash') || '';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const hashAccessToken = hashParams.get('access_token') || '';
  const hashType = hashParams.get('type') || '';
  const hashErrorDesc = hashParams.get('error_description') || hashParams.get('error') || '';

  const token = queryToken || hashAccessToken;
  const isRecoveryMode = Boolean(token || hashType === 'recovery');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(hashErrorDesc ? decodeURIComponent(hashErrorDesc).replace(/\+/g, ' ') : '');
  const [message, setMessage] = useState('');
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!USE_API) return;
    fetch(`${getApiBaseUrl()}/api/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSmtpConfigured(Boolean(data?.smtpConfigured)))
      .catch(() => setSmtpConfigured(false));
  }, []);

  useEffect(() => {
    if (hashErrorDesc) {
      setError(decodeURIComponent(hashErrorDesc).replace(/\+/g, ' '));
    }
  }, [hashErrorDesc]);

  const validateEmail = (value) => {
    if (!value) {
      setEmailError(t('passwordResetEmailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError(t('passwordResetEmailInvalid'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError(t('passwordResetPasswordRequired'));
      return false;
    }
    if (value.length < 10) {
      setPasswordError(t('passwordResetPasswordTooShort'));
      return false;
    }
    setPasswordError('');
    return true;
  };

  const getPasswordStrength = (value) => {
    if (!value) return { score: 0, label: '' };
    let score = 0;
    if (value.length >= 10) score += 1;
    if (value.length >= 12) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    
    if (score <= 2) return { score, label: t('passwordResetWeak'), color: '#dc3545' };
    if (score <= 4) return { score, label: t('passwordResetMedium'), color: '#ffc107' };
    return { score, label: t('passwordResetStrong'), color: '#28a745' };
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    if (value) validateEmail(value);
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    if (value) validatePassword(value);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setEmailError('');
    setPasswordError('');

    const isEmailValid = !isRecoveryMode ? validateEmail(email) : true;
    const isPasswordValid = isRecoveryMode ? validatePassword(password) : true;

    if (!isEmailValid || !isPasswordValid) return;

    setBusy(true);
    try {
      if (hashAccessToken) {
        await updatePasswordWithSession(hashAccessToken, password);
      } else if (queryToken) {
        try {
          await confirmPasswordReset(queryToken, password);
        } catch (firstErr) {
          try {
            await updatePasswordWithSession(queryToken, password);
          } catch {
            throw firstErr;
          }
        }
      } else {
        await requestPasswordReset(email);
      }
      setMessage(
        isRecoveryMode
          ? t('passwordResetSuccessUpdated')
          : smtpConfigured
            ? t('passwordResetSuccessEmail')
            : t('passwordResetSuccessEmailNoSmtp')
      );
      if (isRecoveryMode && typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (requestError) { 
      setError(requestError.message || t('passwordResetError')); 
    } finally { 
      setBusy(false); 
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        <div className="password-reset-header">
          <h1>{isRecoveryMode ? t('passwordResetNewTitle') : t('passwordResetTitle')}</h1>
          <p>{isRecoveryMode ? t('passwordResetNewDescription') : t('passwordResetDescription')}</p>
        </div>

        <form onSubmit={submit} className="password-reset-form">
          {!isRecoveryMode && (
            <div className="form-group">
              <label htmlFor="reset-email">{t('passwordResetEmail')}</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                className={emailError ? 'input-error' : ''}
                disabled={busy}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && <p id="email-error" className="error-message" role="alert">{emailError}</p>}
            </div>
          )}

          {isRecoveryMode && (
            <div className="form-group">
              <label htmlFor="reset-password">{t('passwordResetNewPassword')}</label>
              <div className="password-input-wrapper">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={10}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => handlePasswordChange(event.target.value)}
                  className={passwordError ? 'input-error' : ''}
                  disabled={busy}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : 'password-strength'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={busy}
                  aria-label={showPassword ? t('passwordResetHidePassword') : t('passwordResetShowPassword')}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {passwordError && <p id="password-error" className="error-message" role="alert">{passwordError}</p>}
              {password && !passwordError && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill" 
                      style={{ width: `${(strength.score / 6) * 100}%`, backgroundColor: strength.color }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button" 
            disabled={busy}
          >
            {busy ? <span className="spinner"></span> : null}
            {busy ? t('pleaseWait') : isRecoveryMode ? t('passwordResetUpdate') : t('passwordResetSubmit')}
          </button>
        </form>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {message && <div className="alert alert-success" role="status">{message}</div>}

        <div className="back-to-signin">
          <Link to="/auth">{t('passwordResetBackSignIn')}</Link>
        </div>
      </div>
    </div>
  );
}
