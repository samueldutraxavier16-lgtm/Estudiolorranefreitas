import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { messages, stages, whatsapp } from '../content';
import { WhatsAppIcon } from './Icons';
import { STAGE_STARTS } from '../three/timeline';

gsap.registerPlugin(ScrollTrigger);

type Mode = 'checking' | '3d' | 'static';


function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function detectQuality(): 'high' | 'low' {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  const small = Math.min(window.innerWidth, window.innerHeight) < 500;
  return cores <= 4 || mem <= 3 || (small && cores <= 6) ? 'low' : 'high';
}

export default function Process() {
  const [mode, setMode] = useState<Mode>('checking');
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(supportsWebGL() ? '3d' : 'static');
  }, []);

  useEffect(() => {
    if (mode !== '3d') return;
    const track = trackRef.current!;
    const host = canvasRef.current!;
    let scene: import('../three/NailScene').NailScene | null = null;
    let cancelled = false;
    let st: ScrollTrigger | null = null;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bars = railRef.current ? Array.from(railRef.current.querySelectorAll<HTMLElement>('i')) : [];

    const onProgress = (p: number) => {
      scene?.setProgress(p);
      let idx = 0;
      STAGE_STARTS.forEach((s, i) => p >= s - 0.005 && (idx = i));
      setActive(idx);
      bars.forEach((b, i) => {
        const a = STAGE_STARTS[i];
        const z = STAGE_STARTS[i + 1] ?? 1;
        b.style.transform = `scaleX(${Math.min(1, Math.max(0, (p - a) / (z - a)))})`;
      });
    };

    // Carrega o Three.js só quando a seção se aproxima da tela.
    const load = async () => {
      try {
        const { NailScene } = await import('../three/NailScene');
        if (cancelled) return;
        scene = new NailScene(host, detectQuality(), reduced);
        setLoaded(true);
        st = ScrollTrigger.create({
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduced ? false : 0.5,
          onUpdate: (self) => onProgress(self.progress),
        });
        onProgress(st.progress);
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene?.start() : scene?.stop()), {
          rootMargin: '100px',
        });
        io.observe(track);
        ro = new ResizeObserver(() => scene?.resize());
        ro.observe(host);
      } catch (err) {
        console.error('Experiência 3D indisponível, usando versão estática.', err);
        if (!cancelled) setMode('static');
      }
    };

    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          near.disconnect();
          load();
        }
      },
      { rootMargin: '150% 0px' },
    );
    near.observe(track);

    return () => {
      cancelled = true;
      near.disconnect();
      io?.disconnect();
      ro?.disconnect();
      st?.kill();
      scene?.dispose();
    };
  }, [mode]);

  return (
    <section className="process on-dark" id="processo" aria-labelledby="processo-title">
      <div className="wrap process-intro">
        <p className="eyebrow reveal">O processo</p>
        <h2 id="processo-title" className="h2 reveal">
          Como nasce um <em>banho de gel</em>
        </h2>
        <p className="lede reveal" style={{ marginTop: 20 }}>
          Role a página e acompanhe, em seis etapas, a transformação da unha natural até o acabamento final.
        </p>
      </div>

      {mode === 'static' ? (
        <div className="wrap">
          <StaticSteps />
        </div>
      ) : (
        <div className="process-track" ref={trackRef} style={{ height: '620svh' }}>
          <div className="process-pin" style={{ position: 'sticky', top: 0 }}>
            <div className="process-canvas" ref={canvasRef} />
            {!loaded && <div className="process-loading">Preparando a experiência</div>}
            <div className="process-ui">
              <div className="stage-rail" ref={railRef} aria-hidden="true">
                {stages.map((s) => (
                  <span key={s.n}>
                    <i />
                  </span>
                ))}
              </div>
              <div className="stage-rail-labels" aria-hidden="true">
                {stages.map((s, i) => (
                  <span key={s.n} className={i <= active ? 'is-on' : ''}>
                    {s.title}
                  </span>
                ))}
              </div>
              <div className="stage-panel" aria-live="polite">
                {stages.map((s, i) => (
                  <div key={s.n} className={`stage-copy ${i === active ? 'is-active' : ''}`} aria-hidden={i !== active}>
                    <span className="stage-n">{s.n}</span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="wrap process-outro">
        <p className="reveal">
          Do natural ao acabamento, <em>cada etapa feita com calma</em>. Que tal ver isso nas suas mãos?
        </p>
        <div className="actions reveal">
          <a className="btn btn-primary" href={whatsapp(messages.servicos)} target="_blank" rel="noopener">
            <WhatsAppIcon /> Agendar pelo WhatsApp
          </a>
          <a className="btn btn-ghost" href="#servicos">
            Ver os serviços
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------- Alternativa sem WebGL: ilustrações vetoriais das etapas ------- */
function NailSVG({ step }: { step: number }) {
  const prepared = step >= 1;
  const gel = step >= 2;
  const structure = step >= 3;
  const colored = step >= 5;
  return (
    <svg viewBox="0 0 96 120" aria-hidden="true">
      <defs>
        <linearGradient id={`skin${step}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99178" />
          <stop offset="1" stopColor="#a8705a" />
        </linearGradient>
        <linearGradient id={`fin${step}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0.62" stopColor="#ad6963" />
          <stop offset="0.62" stopColor="#a3b3ea" />
        </linearGradient>
      </defs>
      <path d="M18 120 V44 C18 18 32 6 48 6 C64 6 78 18 78 44 V120 Z" fill={`url(#skin${step})`} />
      <path
        d={prepared ? 'M28 70 V34 C28 18 38 12 48 12 C58 12 68 18 68 34 V70 C62 74 34 74 28 70Z' : 'M29 70 V36 C29 20 38 14 48 14 C58 14 67 20 67 36 V70 C62 74 34 74 29 70Z'}
        fill={colored ? `url(#fin${step})` : '#e7b0a4'}
      />
      {!colored && <path d="M30 26 C34 16 62 16 66 26" stroke="#f6eae2" strokeWidth="6" fill="none" opacity="0.9" />}
      {gel && !colored && (
        <path d="M30 70 V36 C30 21 39 15 48 15 C57 15 66 21 66 36 V70Z" fill="#ffffff" opacity={structure ? 0.35 : 0.2} />
      )}
      {structure && <ellipse cx="44" cy={colored ? 42 : 46} rx="5" ry="16" fill="#fff" opacity={step >= 4 ? 0.55 : 0.3} />}
      <path
        d={prepared ? 'M24 74 C30 80 66 80 72 74' : 'M24 72 C30 80 66 80 72 72'}
        stroke="#9c634e"
        strokeWidth={prepared ? 3 : 6}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StaticSteps() {
  return (
    <ol className="process-static">
      {stages.map((s, i) => (
        <li key={s.n} className="reveal">
          <NailSVG step={i} />
          <div>
            <span className="stage-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
