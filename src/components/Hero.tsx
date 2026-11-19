import { links, local, messages, whatsapp } from '../content';

const split = (word: string) =>
  word.split('').map((c, i) => (
    <span className="char" key={i} aria-hidden="true">
      {c}
    </span>
  ));

const ribbon = ['Banho de gel', 'Esmaltação em gel', 'Nail art', 'Riacho Fundo 2', 'Beleza · Cuidado · Detalhes'];
import { InstagramIcon, PinIcon, WhatsAppIcon } from './Icons';

export default function Hero() {
  return (
    <section className="hero" id="inicio" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-photo-col">
          <div className="hero-photo" data-hero-photo>
            <picture>
              <source type="image/webp" srcSet="media/lorrane-480.webp 480w, media/lorrane-768.webp 768w" sizes="(min-width: 900px) 42vw, 100vw" />
              <img
                src="media/lorrane.jpg"
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
          <h1 id="hero-title" className="display hero-name" aria-label="Lorrane Freitas">
            <span className="line-1">{split('Lorrane')}</span>
            <span className="line-2">{split('Freitas')}</span>
          </h1>
          <p className="hero-tag" data-hero-in>
            Unhas feitas com calma, técnica e atenção aos detalhes, para você sair com mãos bonitas que continuam
            parecendo suas.
          </p>
          <div className="hero-actions" data-hero-in>
            <a className="btn btn-primary magnetic" href={whatsapp(messages.principal)} target="_blank" rel="noopener">
              <WhatsAppIcon /> Agendar pelo WhatsApp
            </a>
            <a className="btn btn-ghost magnetic" href={links.instagram} target="_blank" rel="noopener">
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

      <a className="hero-scroll" href="#processo" data-hero-in>
        <span>Role para ver a unha em 3D</span>
        <i aria-hidden="true" />
      </a>

      <div className="hero-ribbon" aria-hidden="true">
        <div className="hero-ribbon-track">
          {[0, 1].map((k) => (
            <span key={k}>
              {ribbon.map((r) => (
                <span key={r}>
                  {r}
                  <b>✦</b>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
