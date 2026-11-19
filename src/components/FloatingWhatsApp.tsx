import { useEffect, useState } from 'react';
import { messages, whatsapp } from '../content';
import { WhatsAppIcon } from './Icons';

/** Botão discreto: aparece depois do hero e some quando a seção de agendamento está na tela. */
export default function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const booking = document.getElementById('agendar');
    let bookingOnScreen = false;
    const io = new IntersectionObserver(([e]) => {
      bookingOnScreen = e.isIntersecting;
      update();
    });
    if (booking) io.observe(booking);
    function update() {
      setVisible(window.scrollY > window.innerHeight * 0.8 && !bookingOnScreen);
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
