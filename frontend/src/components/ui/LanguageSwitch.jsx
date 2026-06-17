import { useTranslation } from 'react-i18next';
import '../../styles/LanguageSwitch.css';

export function LanguageSwitch({ compact = false }) {
  const { i18n } = useTranslation();

  function toggle() {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="lang-switch-compact"
      >
        {i18n.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="lang-switch-full"
    >
      {i18n.language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
    </button>
  );
}
