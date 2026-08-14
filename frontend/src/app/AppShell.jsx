import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { HiHome, HiAcademicCap, HiUserCircle, HiArrowRightOnRectangle, HiSun, HiMoon, HiTrophy, HiNewspaper, HiEnvelope, HiCurrencyDollar } from 'react-icons/hi2';
import { useAuth } from './AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/ui/Avatar';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { Logo } from '../components/ui/Logo';
import '../styles/AppShell.css';

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { theme, toggleTheme } = useTheme();
  function handleLogout() {
    logout();
    navigate('/login');
  }

  const activeGroups = {
    '/learning': ['/learning', '/meeting', '/rooms', '/sessions'],
    '/leaderboard': ['/leaderboard', '/rankings'],
    '/pricing': ['/pricing', '/payment'],
  };

  const isActive = path => {
    if (path === '/') return location.pathname === '/';
    const paths = activeGroups[path] || [path];
    return paths.some(item => location.pathname.startsWith(item));
  };

  const navItems = [
    { path: '/', labelKey: 'nav.home', icon: HiHome },
    { path: '/learning', labelKey: 'nav.learning', icon: HiAcademicCap },
    { path: '/blog', labelKey: 'nav.blog', icon: HiNewspaper },
    { path: '/leaderboard', labelKey: 'nav.rankings', icon: HiTrophy },
    { path: '/pricing', labelKey: 'nav.pricing', icon: HiCurrencyDollar },
    { path: '/contact', labelKey: 'nav.contact', icon: HiEnvelope },
  ];

  return (
    <div className="app-shell d-flex flex-column min-vh-100">
      <Navbar
        expand="lg"
        fixed="top"
        expanded={expanded}
        onToggle={setExpanded}
        className="glass-panel"
      >
        <Container>
          <Navbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}
            className="fw-extrabold d-flex align-items-center"
          >
            <Logo />
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-navbar" className="border-0" />

          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto gap-1">
              {navItems.map(item => (
                <Nav.Link key={item.path} as={Link} to={item.path}
                  className={`rounded-pill px-3 d-flex align-items-center gap-1 ${isActive(item.path) ? 'active' : ''}`}
                  style={{
                    color: isActive(item.path) ? '#0b3d2e !important' : 'var(--color-text-secondary)',
                    fontWeight: isActive(item.path) ? 600 : 500,
                    fontSize: '0.875rem',
                    background: isActive(item.path) ? '#99FFCC' : 'transparent',
                  }}
                  onClick={() => setExpanded(false)}
                >
                  <item.icon size={16} />
                  {t(item.labelKey)}
                </Nav.Link>
              ))}
            </Nav>

            <Nav className="align-items-lg-center gap-1">
              <LanguageSwitch compact />
              <Button variant="link" size="sm" className="text-decoration-none rounded-pill px-2 d-flex align-items-center app-shell-theme-btn"
                onClick={toggleTheme} title={t('common.toggle_theme')}
              >
                {theme === 'dark' ? <HiSun size={18} /> : <HiMoon size={18} />}
              </Button>

              {user ? (
                <>
                  <Nav.Link as={Link} to="/profile"
                    className="rounded-pill px-3 d-flex align-items-center gap-2"
                    style={{
                      color: isActive('/profile') ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontWeight: isActive('/profile') ? 600 : 500, fontSize: '0.875rem',
                    }}
                    onClick={() => setExpanded(false)}
                  >
                    <HiUserCircle size={18} />
                    <span className="d-none d-md-inline">{user.display_name || 'Hồ sơ'}</span>
                  </Nav.Link>

                  <Button variant="link" size="sm"
                    className="text-decoration-none rounded-pill px-2 d-none d-lg-flex align-items-center app-shell-signout-btn"
                    onClick={handleLogout} title="Đăng xuất"
                  >
                    <HiArrowRightOnRectangle size={18} />
                  </Button>

                  <Button variant="outline-danger" size="sm" className="rounded-pill d-lg-none w-100 mt-2"
                    onClick={() => { handleLogout(); setExpanded(false); }}
                  >{t('common.sign_out')}</Button>
                </>
              ) : (
                <Button as={Link} to="/login" variant="primary" size="sm"
                  className="rounded-pill px-4 fw-semibold" onClick={() => setExpanded(false)}>
                  {t('common.sign_in')}
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="app-shell-main">{children}</main>

      <footer className="hp-footer">
        <div className="hp-contained">
          <div className="hp-footer-grid">
            <div className="hp-footer-brand">
              <Logo size={36} />
              <p>{t('footer.tagline')}</p>
            </div>
            <div className="hp-footer-col">
              <h4>{t('footer.product')}</h4>
              <Link to="/learning">{t('footer.meeting')}</Link>
              <Link to="/pricing">{t('footer.pricing')}</Link>
              <Link to="/leaderboard">{t('footer.rankings')}</Link>
            </div>
            <div className="hp-footer-col">
              <h4>{t('footer.resources')}</h4>
              <Link to="/blog">{t('footer.blog')}</Link>
              <Link to="/contact">{t('footer.contact')}</Link>
              <Link to="/faq">{t('footer.faq')}</Link>
            </div>
            <div className="hp-footer-col">
              <h4>{t('footer.legal')}</h4>
              <a href="#privacy">{t('footer.privacy')}</a>
              <a href="#terms">{t('footer.terms')}</a>
            </div>
          </div>
          <div className="hp-footer-bottom">
            <span>&copy; {new Date().getFullYear()} E-Room. {t('footer.rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
