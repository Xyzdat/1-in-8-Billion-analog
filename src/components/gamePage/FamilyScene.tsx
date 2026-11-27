import { useEffect, useMemo } from 'react';
import { buildFamilyScene, familySceneSize } from '../../game/familyScene';
import type { FamilySceneInput } from '../../game/familyScene';
import { familySpriteLayers } from '../../data/familySpriteLayers';
import { useFamilySkinMemory } from '../../game/useFamilySkinMemory';
import background from '../../assets/birth-scene/pixel-prototype/background.png';
import styles from './FamilyScene.module.scss';

export default function FamilyScene({ settings, age, family, birth, mock, sessionId, countryCode, adult }: FamilySceneInput) {
  const { name, gender, family: familyType, siblings, country } = settings;
  const { tones, remember } = useFamilySkinMemory(sessionId);
  const people = useMemo(() => buildFamilyScene({
    settings: { name, gender, family: familyType, siblings, country },
    age,
    family,
    birth,
    mock,
    sessionId,
    countryCode,
    adult,
    skinTones: tones,
  }), [name, gender, familyType, siblings, country, age, family, birth, mock, sessionId, countryCode, adult, tones]);

  useEffect(() => {
    remember(Object.fromEntries(people.map((person) => [person.id, person.appearance.skinId])));
  }, [people, remember]);

  return (
    <svg
      className={styles.familyScene}
      viewBox={`0 0 ${familySceneSize.width} ${familySceneSize.height}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Семья: ${people.map((person) => person.label).join(', ')}`}
    >
      <image
        href={background}
        width={familySceneSize.width}
        height={familySceneSize.height}
        aria-hidden="true"
      />
      {people.map((person) => (
        <g
          key={person.id}
          className={styles.familyScene__person}
          data-person-id={person.id}
          data-sprite={person.sprite}
          data-appearance-id={person.appearance.id}
          transform={person.flip
            ? `translate(${person.x + person.width} ${person.y}) scale(-1 1)`
            : `translate(${person.x} ${person.y})`}
        >
          <title>{person.label}</title>
          <g
            transform={`scale(${person.width / familySpriteLayers[person.sprite].width} ${person.height / familySpriteLayers[person.sprite].height})`}
            aria-hidden="true"
          >
            {familySpriteLayers[person.sprite].layers.map((layer) => (
              <path
                key={'slot' in layer ? layer.slot : layer.color}
                d={layer.path}
                fill={'slot' in layer ? person.appearance.colors[layer.slot] : layer.color}
              />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}
