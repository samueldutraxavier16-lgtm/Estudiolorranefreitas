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
  return cores <= 4 || mem <= 3 ? 'low' : 'high';
}

/**
 * A unha 3D logo abaixo do hero: camadas que descem e se encaixam
 * conforme a rolagem, com o texto das etapas ao lado.
 */
export default function Process() {
  const [mode, setMode] = useState<Mode>('checking');
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);

  useEffect(() => setMode(supportsWebGL() ? '3d' : 'static'), []);

  useEffect(() => {
    if (mode !== '3d') return;
    const track = trackRef.current!;
    const host = hostRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bars = Array.from(stepsRef.current?.querySelectorAll<HTMLElement>('.step-bar i') ?? []);
    let scene: import('../three/NailScene').NailScene | null = null;
    let st: ScrollTrigger | null = null;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const onProgress = (p: number) => {
      scene?.setProgress(p);
      let idx = 0;
      STAGE_STARTS.forEach((s, i) => p >= s - 0.003 && (idx = i));
      setActive(idx);
      setDone(p > 0.9);
      bars.forEach((b, i) => {
        const a = STAGE_STARTS[i];
        const z = STAGE_STARTS[i + 1] ?? 0.9;
        b.style.transform = `scaleY(${Math.min(1, Math.max(0, (p - a) / (z - a)))})`;
      });
    };

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
          scrub: reduced ? false : 0.4,
          onUpdate: (self) => onProgress(self.progress),
        });
        onProgress(st.progress);
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene?.start() : scene?.stop()), { rootMargin: '80px' });
        io.observe(track);
        ro = new ResizeObserver(() => scene?.resize());
        ro.observe(host);
      } catch (err) {
        console.error('Experiência 3D indisponível, usando versão estática.', err);
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
        Quatro camadas, <em>um acabamento</em>
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
                Role para montar a unha
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
