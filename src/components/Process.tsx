import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { messages, stages, whatsapp } from '../content';
import { WhatsAppIcon } from './Icons';
import { STAGE_STARTS } from '../nail/timeline';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

type Mode = '3d' | 'static';

/**
 * A unha 3D logo abaixo do hero: camadas que descem e se encaixam
 * conforme a rolagem, com o texto das etapas ao lado.
 */
export default function Process() {
  const [mode, setMode] = useState<Mode>('3d');
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (mode !== '3d') return;
    const track = trackRef.current!;
    const host = hostRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bars = Array.from(stepsRef.current?.querySelectorAll<HTMLElement>('.step-bar i') ?? []);
    let scene: import('../nail/NailFrames').NailFrames | null = null;
    let st: ScrollTrigger | null = null;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const onProgress = (p: number) => {
      scene?.setProgress(p);
      let idx = 0;
      STAGE_STARTS.forEach((s, i) => p >= s - 0.003 && (idx = i));
      setActive(idx);
      setDone(p > 0.82);
      bars.forEach((b, i) => {
        const a = STAGE_STARTS[i];
        const z = STAGE_STARTS[i + 1] ?? 0.82;
        b.style.transform = `scaleY(${Math.min(1, Math.max(0, (p - a) / (z - a)))})`;
      });
    };

    const load = async () => {
      try {
        const { NailFrames } = await import('../nail/NailFrames');
        if (cancelled) return;
        scene = new NailFrames(host, reduced, () => setLoaded(true));
        st = ScrollTrigger.create({
          trigger: track,
          // sem travar a tela: a unha se forma enquanto a seção passa normalmente
          // a moldura fica fixa e os textos das etapas sobem: a unha se forma nesse trecho
          start: () => (window.innerWidth >= 900 ? 'top 15%' : 'top 64px'),
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          scrub: reduced ? false : true,
          onUpdate: (self) => onProgress(self.progress),
        });
        onProgress(st.progress);
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene?.start() : scene?.stop()), { rootMargin: '80px' });
        io.observe(track);
        ro = new ResizeObserver(() => scene?.resize());
        ro.observe(host);
        await scene.load();
      } catch (err) {
        console.error('Unha interativa indisponível, usando imagem.', err);
        if (!cancelled) setMode('static');
      }
    };
    // fica logo abaixo do hero: carrega assim que a página estiver pronta
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(load);
    else setTimeout(load, 200);

    return () => {
      cancelled = true;
      io?.disconnect();
      ro?.disconnect();
      st?.kill();
      scene?.dispose();
    };
  }, [mode]);

  const copy = (
    <>
      <p className="eyebrow">O processo · Banho de gel</p>
      <h2 id="processo-title" className="h2 story-title">
        Três camadas, <em>uma unha perfeita</em>
      </h2>
      <ol className="story-steps" ref={stepsRef}>
        {stages.map((s, i) => (
          <li key={s.n} className={`${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}>
            <span className="step-bar" aria-hidden="true">
              <i />
            </span>
            <span className="step-n">{s.n}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className={`story-cta ${done ? 'is-on' : ''}`}>
        <a className="btn btn-primary" href={whatsapp(messages.servicos)} target="_blank" rel="noopener">
          <WhatsAppIcon /> Quero essa unha
        </a>
        <a className="text-link" href="#servicos">
          Ver serviços
        </a>
      </div>
    </>
  );

  if (mode === 'static') {
    return (
      <section className="story is-static" id="processo" aria-labelledby="processo-title">
        <div className="wrap story-grid">
          <div className="story-copy">{copy}</div>
          <div className="story-stage">
            <img className="story-fallback" src="media/trabalho-4-768.webp" alt="Unhas em gel rosé com francesinha lilás feitas pela Lorrane" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="story" id="processo" aria-labelledby="processo-title">
      <div className="story-track" ref={trackRef}>
        <div className="story-sticky">
          <div className="wrap story-grid">
            <div className="story-copy">{copy}</div>
            <div className="story-stage">
              <div className="story-glow" aria-hidden="true" />
              <div className="story-canvas" ref={hostRef} />
              {!loaded && <span className="story-loading">Carregando</span>}
              <span className="story-hint" aria-hidden="true">
                <span className="hint-touch">Role para juntar as camadas</span><span className="hint-desk">Role para juntar as camadas · arraste para mover</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
