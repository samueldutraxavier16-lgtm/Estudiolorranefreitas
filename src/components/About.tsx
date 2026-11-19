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
        <div>
          <p className="eyebrow reveal">Sobre a Lorrane</p>
          <h2 id="sobre-title" className="h2 reveal">
            Três palavras <em>gravadas</em> na marca e em cada atendimento.
          </h2>
        </div>
        <div>
          <p className="lede reveal">
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
