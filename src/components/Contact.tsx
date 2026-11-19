import { links, messages, whatsapp } from '../content';
import { ArrowIcon, InstagramIcon, WhatsAppIcon } from './Icons';

export function Booking() {
  return (
    <section className="section booking" id="agendar" aria-labelledby="agendar-title">
      <div className="wrap">
        <div className="booking-card reveal">
          <div>
            <p className="eyebrow">Agendamento</p>
            <h2 id="agendar-title" className="h2">
              Vamos marcar o <em>seu horário?</em>
            </h2>
            <p className="lede" style={{ marginTop: 20 }}>
              Mande uma mensagem contando o que você gostaria de fazer. A Lorrane responde com os horários disponíveis
              e os valores.
            </p>
          </div>
          <div className="booking-actions">
            <a className="btn btn-primary" href={whatsapp(messages.principal)} target="_blank" rel="noopener">
              <WhatsAppIcon /> Chamar no WhatsApp
            </a>
            <a className="btn btn-ghost" href={links.instagram} target="_blank" rel="noopener">
              <InstagramIcon /> Seguir no Instagram
            </a>
            <div className="booking-contact">
              <a href={whatsapp(messages.principal)} target="_blank" rel="noopener">
                WhatsApp {links.whatsappDisplay}
              </a>
              <a href={links.instagram} target="_blank" rel="noopener">
                Instagram {links.instagramHandle}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Location() {
  return (
    <section className="section location" id="localizacao" aria-labelledby="local-title">
      <div className="wrap location-inner">
        <div>
          <p className="eyebrow reveal">Localização</p>
          <h2 id="local-title" className="location-place reveal">
            Riacho Fundo 2<br />
            <em>Brasília, DF</em>
          </h2>
        </div>
        <div className="location-side reveal">
          <p>O atendimento acontece no Riacho Fundo 2. Para saber o endereço completo, é só chamar a Lorrane no WhatsApp.</p>
          <a className="text-link" href={links.mapa} target="_blank" rel="noopener">
            Ver a região no mapa <ArrowIcon dir="up-right" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="wordmark">
            <span className="wordmark-name">Lorrane Freitas</span>
            <span className="wordmark-sub">Espaço de beleza</span>
          </div>
          <div>
            <h4>Contato</h4>
            <ul>
              <li>
                <a href={whatsapp(messages.principal)} target="_blank" rel="noopener">
                  WhatsApp {links.whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={links.instagram} target="_blank" rel="noopener">
                  {links.instagramHandle}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Atendimento</h4>
            <ul>
              <li>Riacho Fundo 2</li>
              <li>Brasília, DF</li>
            </ul>
          </div>
          <div>
            <h4>Navegar</h4>
            <ul>
              <li><a href="#servicos">Serviços</a></li>
              <li><a href="#trabalhos">Trabalhos</a></li>
              <li><a href="#processo">Processo</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} Lorrane Freitas · Todos os direitos reservados.</span>
          <span>Beleza · Cuidado · Detalhes</span>
        </div>
      </div>
    </footer>
  );
}
