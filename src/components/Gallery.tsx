import { useCallback, useEffect, useRef, useState } from 'react';
import { gallery, galleryVideo, links, messages, whatsapp } from '../content';
import { ArrowIcon, CloseIcon, InstagramIcon, WhatsAppIcon } from './Icons';
import Picture from './Picture';

type Item = { kind: 'video' } | { kind: 'photo'; index: number };
const items: Item[] = [{ kind: 'video' }, ...gallery.map((_, index) => ({ kind: 'photo' as const, index }))];

export default function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // O vídeo da galeria só toca quando está visível (economiza bateria e dados).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const show = (i: number, el: HTMLElement) => {
    lastFocus.current = el;
    setOpen(i);
  };
  const close = useCallback(() => {
    setOpen(null);
    lastFocus.current?.focus();
  }, []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), []);

  useEffect(() => {
    if (open === null) return;
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close, step]);

  // Gesto de arrastar no celular
  const touchX = useRef(0);

  const current = open === null ? null : items[open];

  return (
    <section className="section" id="trabalhos" aria-labelledby="trabalhos-title">
      <div className="wrap">
        <div className="gallery-head">
          <div>
            <p className="eyebrow reveal">Trabalhos</p>
            <h2 id="trabalhos-title" className="h2 reveal">
              Feito à mão, <em>de perto</em>
            </h2>
          </div>
          <a className="text-link reveal" href={links.instagram} target="_blank" rel="noopener">
            <InstagramIcon /> Mais trabalhos no Instagram
          </a>
        </div>

        <div className="gallery-grid">
          {items.map((it, i) =>
            it.kind === 'video' ? (
              <button key="video" className="g-item is-video reveal" onClick={(e) => show(i, e.currentTarget)} aria-label="Ampliar vídeo do trabalho">
                <video ref={videoRef} src={galleryVideo.src} poster={galleryVideo.poster} muted loop playsInline preload="metadata" aria-label={galleryVideo.alt} />
                <span className="g-badge">
                  <i /> Unhas em gel · lilás e rosé
                </span>
              </button>
            ) : (
              <button key={i} className="g-item reveal" onClick={(e) => show(i, e.currentTarget)} aria-label={`Ampliar foto: ${gallery[it.index].alt}`}>
                <Picture {...gallery[it.index]} sizes="(min-width: 760px) 25vw, 50vw" />
              </button>
            ),
          )}
        </div>

        <div className="gallery-foot">
          <p>Fotos e vídeo de atendimentos reais da Lorrane.</p>
          <a className="btn btn-primary" href={whatsapp(messages.galeria)} target="_blank" rel="noopener">
            <WhatsAppIcon /> Quero agendar um horário
          </a>
        </div>
      </div>

      {current && open !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria ampliada"
          onClick={(e) => e.target === e.currentTarget && close()}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          }}
        >
          <div className="lightbox-top">
            <span>
              {String(open + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
            <button ref={closeRef} className="lightbox-btn" onClick={close} aria-label="Fechar">
              <CloseIcon />
            </button>
          </div>
          <div className="lightbox-stage" onClick={(e) => e.target === e.currentTarget && close()}>
            {current.kind === 'video' ? (
              <video src={galleryVideo.src} poster={galleryVideo.poster} controls autoPlay muted loop playsInline aria-label={galleryVideo.alt} />
            ) : (
              <img src={`media/${gallery[current.index].src}.jpg`} alt={gallery[current.index].alt} />
            )}
          </div>
          <div className="lightbox-bottom">
            <a className="text-link" style={{ color: 'inherit' }} href={whatsapp(messages.galeria)} target="_blank" rel="noopener">
              Agendar pelo WhatsApp
            </a>
            <div className="lightbox-nav">
              <button className="lightbox-btn" onClick={() => step(-1)} aria-label="Anterior">
                <ArrowIcon dir="left" />
              </button>
              <button className="lightbox-btn" onClick={() => step(1)} aria-label="Próxima">
                <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
