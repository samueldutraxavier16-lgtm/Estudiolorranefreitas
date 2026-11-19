import { links, local, messages, whatsapp } from '../content';
import { InstagramIcon, PinIcon, WhatsAppIcon } from './Icons';

export default function Hero() {
  return (
    <section className="hero" id="inicio" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-photo-col">
          <div className="hero-photo" data-hero-photo>
            <picture>
              <source type="image/webp" srcSet="/media/lorrane-480.webp 480w, /media/lorrane-768.webp 768w" sizes="(min-width: 900px) 42vw, 100vw" />
              <img
                src="/media/lorrane.jpg"
                alt="Lorrane Freitas sorrindo no seu espaço de beleza, com o letreiro da marca ao fundo"
                width={768}
                height={1364}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
          <span className="hero-frame" aria-hidden="true" />
          <span className="hero-motto" aria-hidden="true">Beleza · Cuidado · Detalhes</span>
        </div>

        <div className="hero-copy">
          <p className="eyebrow" data-hero-in>Espaço de beleza · Unhas em gel</p>
          <h1 id="hero-title" className="display hero-name" data-hero-in>
            <span className="line-1">Lorrane</span>
            <span className="line-2">Freitas</span>
          </h1>
          <p className="hero-tag" data-hero-in>
            Unhas feitas com calma, técnica e atenção aos detalhes, para você sair com mãos bonitas que continuam
            parecendo suas.
          </p>
          <div className="hero-actions" data-hero-in>
            <a className="btn btn-primary" href={whatsapp(messages.principal)} target="_blank" rel="noopener">
              <WhatsAppIcon /> Agendar pelo WhatsApp
            </a>
            <a className="btn btn-ghost" href={links.instagram} target="_blank" rel="noopener">
              <InstagramIcon /> Ver o Instagram
            </a>
          </div>
          <div className="hero-meta" data-hero-in>
            <span>
              <PinIcon /> {local}
            </span>
            <span>Agendamento pelo WhatsApp</span>
          </div>
        </div>
      </div>
    </section>
  );
}
