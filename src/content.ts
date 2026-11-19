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
    photo: { src: 'trabalho-3', alt: 'Mão com unhas em gel lilás e rosé', position: '50% 55%' },
  },
  {
    name: 'Nail art',
    description:
      'Detalhes feitos à mão, como francesinhas diagonais e linhas finas, pensados para combinar com você.',
    photo: { src: 'trabalho-4', alt: 'Detalhe de francesinha diagonal lilás com linha branca', position: '50% 60%' },
  },
];

export const gallery: Photo[] = [
  { src: 'trabalho-1', alt: 'Unhas em gel lilás e rosé com francesinha diagonal', position: '50% 45%' },
  { src: 'trabalho-4', alt: 'Close das unhas rosé com linha branca e ponta lilás', position: '50% 62%' },
  { src: 'trabalho-3', alt: 'Mão inteira com combinação de lilás e rosé', position: '50% 60%' },
  { src: 'trabalho-2', alt: 'Unhas rosé com francesinha diagonal em lilás', position: '50% 40%' },
];

export const galleryVideo = {
  src: 'media/trabalho-video.mp4',
  poster: 'media/trabalho-1-768.webp',
  alt: 'Vídeo mostrando o resultado de unhas em gel lilás e rosé',
};

export const stages = [
  {
    n: 'I',
    title: 'A base',
    text: 'Unha natural preparada: cutícula afastada, superfície lixada e formato alinhado.',
  },
  {
    n: 'II',
    title: 'O gel',
    text: 'O gel transparente cobre a unha e forma a curvatura que dá resistência e evita quebras.',
  },
  {
    n: 'III',
    title: 'A cor',
    text: 'A cor escolhida por você, aplicada fina e uniforme, curada na cabine.',
  },
  {
    n: 'IV',
    title: 'O acabamento',
    text: 'Detalhes à mão e top coat de alto brilho, que sela tudo e deixa a unha espelhada.',
  },
] as const;
