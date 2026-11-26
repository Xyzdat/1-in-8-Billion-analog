import kyotoImage from '../assets/hero/hero-kyoto.png';
import salvadorImage from '../assets/hero/hero-salvador.png';
import jaipurImage from '../assets/hero/hero-jaipur.png';

export type HeroSlide = {
  id: string;
  src: string;
  alt: string;
};

export const HERO_SLIDE_INTERVAL_MS = 10_000;

export const heroSlides: readonly HeroSlide[] = [
  {
    id: 'kyoto',
    src: kyotoImage,
    alt: 'Родитель и ребёнок гуляют по тихой утренней улице Киото',
  },
  {
    id: 'salvador',
    src: salvadorImage,
    alt: 'Молодой человек с рюкзаком идёт к морю по солнечной улице Салвадора',
  },
  {
    id: 'jaipur',
    src: jaipurImage,
    alt: 'Мать и взрослая дочь гуляют по тихой улице Джайпура',
  },
];
