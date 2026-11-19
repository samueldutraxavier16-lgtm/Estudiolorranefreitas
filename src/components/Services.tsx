import { messages, services, whatsapp } from '../content';
import { ArrowIcon } from './Icons';
import Picture from './Picture';

export default function Services() {
  return (
    <section className="section services" id="servicos" aria-labelledby="servicos-title">
      <div className="wrap">
        <div className="services-head">
          <div>
            <p className="eyebrow reveal">Serviços</p>
            <h2 id="servicos-title" className="h2 reveal">
              O que você encontra <em>aqui</em>
            </h2>
          </div>
          <p className="lede reveal">
            Cada atendimento começa por entender o que você quer. Valores e horários disponíveis são passados
            diretamente pelo WhatsApp.
          </p>
        </div>

        <ol className="service-list">
          {services.map((s, i) => (
            <li className="service reveal" key={s.name}>
              <span className="service-num">0{i + 1}</span>
              <div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <a className="text-link" href={whatsapp(messages.servicos)} target="_blank" rel="noopener">
                  Consultar valores e horários <ArrowIcon className="arrow" />
                </a>
              </div>
              <div className="service-media">
                <Picture {...s.photo} sizes="(min-width: 900px) 300px, 100vw" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
