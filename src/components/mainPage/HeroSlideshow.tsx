import { useEffect, useRef, useState } from 'react';
import { HERO_SLIDE_INTERVAL_MS, heroSlides } from '../../data/heroSlides';
import styles from './HeroSlideshow.module.scss';

export default function HeroSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const loadedImages = useRef(new Set<number>());

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setActiveIndex((previous) => {
        // Keep the current illustration until the next one has loaded.
        for (let offset = 1; offset < heroSlides.length; offset += 1) {
          const next = (previous + offset) % heroSlides.length;
          if (loadedImages.current.has(next)) return next;
        }
        return previous;
      });
    }, HERO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className={styles.heroSlideshow} aria-label="Истории жизни в разных странах">
      {heroSlides.map((slide, index) => (
        <img
          key={slide.id}
          className={`${styles.heroSlideshow__image}${index === activeIndex ? ` ${styles['heroSlideshow__image--active']}` : ''}`}
          src={slide.src}
          alt={slide.alt}
          aria-hidden={index !== activeIndex}
          decoding="async"
          fetchPriority={index === 0 ? 'high' : 'low'}
          onLoad={() => loadedImages.current.add(index)}
        />
      ))}
    </section>
  );
}
