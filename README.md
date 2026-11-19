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

## Firebase Hosting (estudiolorranefreitas.web.app)

O workflow `.github/workflows/firebase-hosting.yml` gera e publica o site a cada
alteração no branch `claude/vibrant-dirac-exr485`. Configuração única:

1. Criar o projeto `estudiolorranefreitas` em https://console.firebase.google.com
   e ativar o **Hosting**.
2. Em Configurações do projeto → Contas de serviço → **Gerar nova chave privada** (baixa um .json).
3. No GitHub: Settings → Secrets and variables → Actions → **New repository secret**,
   nome `FIREBASE_SERVICE_ACCOUNT`, valor = conteúdo inteiro do .json.
