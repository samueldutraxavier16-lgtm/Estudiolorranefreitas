# Lorrane Freitas · Landing page

Feita com Vite, React, TypeScript, Three.js e GSAP ScrollTrigger.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/ pronto para publicar (Vercel, Netlify etc.)
```

- Textos, serviços e fotos: `src/content.ts`
- Fotos novas: coloque em `media-src/` e rode `node scripts/optimize-media.mjs`
- Unha das camadas: `src/nail/` mostra os quadros reais do vídeo `media-src/unha-camadas.mp4`
  conforme a rolagem. Para regerar os quadros: `./scripts/extract-nail-merge.sh`.

Pendências: confirmar a lista de serviços com a Lorrane e adicionar mais fotos de trabalhos.
