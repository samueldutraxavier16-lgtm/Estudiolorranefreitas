import { useEffect, useState } from 'react';
import { messages, whatsapp } from '../content';
import { WhatsAppIcon } from './Icons';

/** Botão discreto: aparece depois do hero e some quando a seção de agendamento está na tela. */
export default function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // some na seção de agendamento e na unha 3D (que já tem o próprio botão)
    const onScreen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      update();
    });
    ['agendar', 'processo'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    function update() {
      setVisible(window.scrollY > window.innerHeight * 0.8 && onScreen.size === 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <a
      className={`wa-float ${visible ? 'is-visible' : ''}`}
      href={whatsapp(messages.principal)}
      target="_blank"
      rel="noopener"
      aria-label="Agendar pelo WhatsApp"
      tabIndex={visible ? 0 : -1}
    >
      <WhatsAppIcon />
      <span>Agendar</span>
    </a>
  );
}
