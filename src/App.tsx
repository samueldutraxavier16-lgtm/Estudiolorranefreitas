import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Gallery from './components/Gallery';
import Process from './components/Process';
import { Booking, Footer, Location } from './components/Contact';
import FloatingWhatsApp from './components/FloatingWhatsApp';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      document.documentElement.classList.add('reduced');
      return;
    }
    const ctx = gsap.context(() => {
      // entrada do hero: foto se abre, letras sobem uma a uma, moldura desenha
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(
        '[data-hero-photo]',
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut', clearProps: 'clipPath' },
      )
        .fromTo('.hero-name .char', { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.035, ease: 'expo.out' }, 0.35)
        .fromTo('[data-hero-in]', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.09 }, 0.7)
        .fromTo('.hero-frame', { opacity: 0, x: -10, y: -10 }, { opacity: 1, x: 0, y: 0, duration: 1.4 }, 0.9)
        .fromTo('.hero-motto', { opacity: 0 }, { opacity: 1, duration: 1 }, 1.2)
        .fromTo('.hero-ribbon', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 1.1);

      // ao rolar: foto em paralaxe e texto saindo suavemente
      gsap.to('.hero-copy', {
        y: -60,
        opacity: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true },
      });

      // desktop: foto acompanha levemente o mouse e botões magnéticos
      if (window.matchMedia('(pointer: fine)').matches) {
        const photo = document.querySelector<HTMLElement>('.hero-photo-col');
        const qx = photo && gsap.quickTo(photo, 'x', { duration: 1.2, ease: 'power3.out' });
        const qy = photo && gsap.quickTo(photo, 'y', { duration: 1.2, ease: 'power3.out' });
        const hero = document.querySelector<HTMLElement>('.hero');
        hero?.addEventListener('pointermove', (e) => {
          const r = hero.getBoundingClientRect();
          qx?.(((e.clientX - r.left) / r.width - 0.5) * -18);
          qy?.(((e.clientY - r.top) / r.height - 0.5) * -12);
        });
        document.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
          const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
          const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
          el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            mx((e.clientX - r.left - r.width / 2) * 0.25);
            my((e.clientY - r.top - r.height / 2) * 0.35);
          });
          el.addEventListener('pointerleave', () => {
            mx(0);
            my(0);
          });
        });
      }

      // revelações discretas ao rolar
      ScrollTrigger.batch('.reveal', {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
      });

    });
    // recalcula posições depois que fontes e imagens carregam
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    return () => {
      ctx.revert();
      window.removeEventListener('load', refresh);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Process />
        <About />
        <Services />
        <Gallery />
        <Booking />
        <Location />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
