import { useNavigate } from 'react-router-dom';
import { useUiText } from '../i18n/useUiText';
import './PageBack.css';

/**
 * Visible back control with safe fallback when history is empty.
 */
export default function PageBack({ fallback = '/doctor', label }) {
  const navigate = useNavigate();
  const t = useUiText();
  const text = label || t('navBack') || 'Back';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  };

  return (
    <button type="button" className="page-back-button" onClick={handleBack}>
      <span className="page-back-icon" aria-hidden="true">←</span>
      <span>{text}</span>
    </button>
  );
}
