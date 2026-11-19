# Lorrane Freitas · Landing page

Feita com Vite, React, TypeScript, Three.js e GSAP ScrollTrigger.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/ pronto para publicar (Vercel, Netlify etc.)
```

- Textos, serviços e fotos: `src/content.ts`
- Fotos novas: coloque em `media-src/` e rode `node scripts/optimize-media.mjs`
- Unha interativa: `src/nail/` usa os quadros reais do vídeo `media-src/unha-3d.mp4`,
  processados por `python3 scripts/process-nail-video.py` (precisa de `opencv-python-headless` e `numpy`).
  O script remove os textos do vídeo, recorta as 3 camadas e gera `public/media/unha3d/`.
  Depois rode `python3 scripts/fit-nail-layers.py` para calcular o encaixe exato das camadas.

Pendências: confirmar a lista de serviços com a Lorrane e adicionar mais fotos de trabalhos.
