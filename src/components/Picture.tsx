import type { Photo } from '../content';

type Props = Photo & {
  sizes?: string;
  eager?: boolean;
  className?: string;
};

/** Foto responsiva: WebP em dois tamanhos com JPG de reserva. */
export default function Picture({ src, alt, position, sizes = '100vw', eager, className }: Props) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`/media/${src}-480.webp 480w, /media/${src}-768.webp 768w`}
        sizes={sizes}
      />
      <img
        className={className}
        src={`/media/${src}.jpg`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        style={position ? { objectPosition: position } : undefined}
      />
    </picture>
  );
}
