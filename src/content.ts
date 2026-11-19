// Conteúdo central do site. Edite aqui textos, serviços e fotos sem mexer nos componentes.

const WHATSAPP_NUMBER = '5561984466032';

export const whatsapp = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const messages = {
  principal: 'Olá, Lorrane! Gostaria de saber mais sobre seus serviços e horários disponíveis.',
  servicos: 'Olá! Gostaria de consultar os valores e horários disponíveis.',
  galeria: 'Olá, Lorrane! Vi seus trabalhos no site e gostaria de agendar um horário.',
} as const;

export const links = {
  instagram: 'https://www.instagram.com/espaco.lorranefreitas/',
  instagramHandle: '@espaco.lorranefreitas',
  whatsappDisplay: '(61) 98446-6032',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Riacho+Fundo+II,+Bras%C3%ADlia+-+DF',
};

export const local = 'Riacho Fundo 2 · Brasília, DF';

// Fotos: "src" sem extensão, os arquivos ficam em public/media
// (gerados por scripts/optimize-media.mjs a partir de media-src/).
export type Photo = { src: string; alt: string; position?: string };

// ATENÇÃO: confirmar a lista com a Lorrane antes de publicar.
// Baseada no briefing (banho de gel) e no trabalho real enviado em vídeo.
export const services: {
  name: string;
  description: string;
  photo: Photo;
}[] = [
  {
    name: 'Banho de gel',
    description:
      'Uma camada de gel sobre a unha natural que dá resistência, uniformidade e um brilho que dura semanas.',
    photo: { src: 'arte-rosa', alt: 'Banho de gel em unhas curtas, tons de rosa com brilho', position: '50% 45%' },
  },
  {
    name: 'Esmaltação em gel',
    description:
      'Cor com acabamento espelhado e secagem na cabine, para sair do atendimento sem medo de borrar.',
    photo: { src: 'arte-vinho', alt: 'Unhas em gel cor vinho com acabamento brilhante', position: '50% 55%' },
  },
  {
    name: 'Nail art',
    description:
      'Detalhes feitos à mão, como pedrarias, desenhos e francesinhas, pensados para combinar com você.',
    photo: { src: 'arte-pink', alt: 'Nail art pink com unhas brancas e pedrarias douradas', position: '50% 45%' },
  },
];

export const gallery: Photo[] = [
  { src: 'arte-pink', alt: 'Unhas pink com detalhes brancos e pedrarias douradas', position: '50% 45%' },
  { src: 'arte-marrom', alt: 'Unhas amendoadas em tons de marrom com linha dourada', position: '50% 30%' },
  { src: 'arte-vinho', alt: 'Unhas em gel cor vinho, curtas e brilhantes', position: '45% 55%' },
  { src: 'trabalho-4', alt: 'Close das unhas rosé com linha branca e ponta lilás', position: '50% 62%' },
];

export const galleryVideo = {
  src: 'media/trabalho-video.mp4',
  poster: 'media/trabalho-1-768.webp',
  alt: 'Vídeo mostrando o resultado de unhas em gel lilás e rosé',
};

export const stages = [
  {
    n: 'I',
    title: 'As três camadas',
    text: 'Unha natural, gel rosa translúcido e top coat de brilho: cada uma com a sua função.',
  },
  {
    n: 'II',
    title: 'O encaixe',
    text: 'O gel se funde à unha natural e o top coat sela tudo por cima, sem bolhas nem desníveis.',
  },
  {
    n: 'III',
    title: 'O resultado',
    text: 'Uma unha só, resistente, rosada e com acabamento de vidro, que continua parecendo sua.',
  },
] as const;
