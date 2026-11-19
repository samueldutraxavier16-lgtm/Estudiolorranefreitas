import { useEffect, useState } from 'react';
import { links, messages, whatsapp } from '../content';
import { InstagramIcon, WhatsAppIcon } from './Icons';

const nav = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#trabalhos', label: 'Trabalhos' },
  { href: '#processo', label: 'Processo' },
  { href: '#agendar', label: 'Agendar' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 480 && y > last + 4);
      if (y < last - 4) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header
        className={`header ${scrolled || open ? 'is-scrolled' : ''} ${hidden && !open ? 'is-hidden' : ''} ${open ? 'menu-open' : ''}`}
      >
        <div className="wrap header-inner">
          <a className="wordmark" href="#inicio" onClick={close} aria-label="Lorrane Freitas, início">
            <span className="wordmark-name">Lorrane Freitas</span>
            <span className="wordmark-sub">Espaço de beleza</span>
          </a>
          <nav className="nav" aria-label="Principal">
            {nav.slice(0, 4).map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
            <a className="btn btn-primary" href={whatsapp(messages.principal)} target="_blank" rel="noopener">
              Agendar horário
            </a>
          </nav>
          <button
            className="menu-btn"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Fechar' : 'Menu'}
            <span className="menu-btn-lines" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div id="menu-mobile" className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav aria-label="Menu">
          <ol>
            {nav.map((n, i) => (
              <li key={n.href}>
                <a href={n.href} onClick={close} tabIndex={open ? 0 : -1}>
                  <small>0{i + 1}</small>
                  {n.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mobile-menu-foot">
          <a className="btn btn-primary" href={whatsapp(messages.principal)} target="_blank" rel="noopener" tabIndex={open ? 0 : -1}>
            <WhatsAppIcon /> Agendar pelo WhatsApp
          </a>
          <a className="btn btn-ghost" href={links.instagram} target="_blank" rel="noopener" tabIndex={open ? 0 : -1}>
            <InstagramIcon /> {links.instagramHandle}
          </a>
        </div>
      </div>
    </>
  );
}
