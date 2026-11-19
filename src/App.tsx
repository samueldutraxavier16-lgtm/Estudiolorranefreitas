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
      // entrada do hero
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(
        '[data-hero-photo]',
        { clipPath: 'inset(12% 0% 0% 0% round 0px)', scale: 1.06 },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.4, clearProps: 'clipPath,transform' },
      ).fromTo('[data-hero-in]', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08 }, 0.25);

      // revelações discretas ao rolar
      ScrollTrigger.batch('.reveal', {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
      });

      // leve paralaxe da medalha
      gsap.to('.about-medal img', {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: '.about-medal', start: 'top bottom', end: 'bottom top', scrub: true },
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
        <About />
        <Services />
        <Gallery />
        <Process />
        <Booking />
        <Location />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
