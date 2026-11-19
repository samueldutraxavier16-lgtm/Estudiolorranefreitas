const principles = [
  {
    word: 'Beleza',
    text: 'Formatos, cores e desenhos escolhidos junto com você, respeitando o seu estilo e o formato das suas mãos.',
  },
  {
    word: 'Cuidado',
    text: 'Preparação feita com atenção à unha natural, porque um bom resultado começa por uma base saudável.',
  },
  {
    word: 'Detalhes',
    text: 'Cutícula, curvatura, brilho e acabamento: cada etapa recebe o mesmo capricho até o resultado final.',
  },
];

export default function About() {
  return (
    <section className="section" id="sobre" aria-labelledby="sobre-title">
      <div className="wrap about-grid">
        <figure className="about-medal reveal">
          <picture>
            <source type="image/webp" srcSet="media/logo-medalha-480.webp 480w, media/logo-medalha-768.webp 704w" sizes="(min-width: 900px) 420px, 90vw" />
            <img src="media/logo-medalha.jpg" alt="Medalha rosé gold com o monograma LF e a frase Beleza, Cuidado, Detalhes" loading="lazy" decoding="async" width={704} height={646} />
          </picture>
          <figcaption>A marca do Espaço Lorrane Freitas</figcaption>
        </figure>

        <div>
          <p className="eyebrow reveal">Sobre a Lorrane</p>
          <h2 id="sobre-title" className="h2 reveal">
            Três palavras <em>gravadas</em> na marca e em cada atendimento.
          </h2>
          <p className="lede reveal" style={{ marginTop: 24 }}>
            O Espaço Lorrane Freitas é um espaço de beleza no Riacho Fundo 2 dedicado às unhas, pensado para que cada
            atendimento seja tranquilo, do primeiro contato pelo WhatsApp até o último detalhe da unha pronta.
          </p>
          <ul className="principles">
            {principles.map((p) => (
              <li key={p.word} className="reveal">
                <h3>{p.word}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
