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
    photo: { src: 'trabalho-2', alt: 'Unhas em gel com acabamento brilhante em tom rosé', position: '50% 40%' },
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
      'Detalhes feitos à mão, como francesinhas diagonais e linhas finas, pensados para combinar com você.',
    photo: { src: 'arte-marrom', alt: 'Unhas amendoadas em tons de marrom com detalhe de linha dourada', position: '50% 35%' },
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
    title: 'A unha natural',
    text: 'A base de tudo: a sua unha, preparada com cuidado, cutícula afastada e superfície alinhada.',
  },
  {
    n: 'II',
    title: 'O gel rosa',
    text: 'O banho de gel translúcido cobre a unha, dá resistência e uma cor rosada natural.',
  },
  {
    n: 'III',
    title: 'O top coat',
    text: 'A camada final de brilho, que protege tudo e deixa a unha com acabamento de vidro.',
  },
] as const;
