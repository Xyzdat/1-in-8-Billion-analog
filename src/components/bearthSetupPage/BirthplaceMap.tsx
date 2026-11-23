import { useId, useState } from 'react';
import mapImage from '../../assets/setup-world-map.png';
import mapMarker from '../../assets/setup-map-marker.svg';
import { resolveBirthplaceMarker } from '../../map/birthplaceMap';
import type { BirthplaceMapLocation } from '../../map/birthplaceMap';
import styles from './bearthSetupPage.module.scss';

export default function BirthplaceMap({ location }: { location: BirthplaceMapLocation }) {
  const marker = resolveBirthplaceMarker(location);
  const [showHint, setShowHint] = useState(false);
  const hintId = useId();

  return (
    <div className={styles.birthSetup__map} role="group" aria-label="Место рождения на карте">
      <img className={styles.birthSetup__mapImage} src={mapImage} alt="Точечная карта мира" />

      {marker && (
        <>
          <button
            type="button"
            className={styles.birthSetup__mapDot}
            style={{ left: `${marker.left}%`, top: `${marker.top}%` }}
            title={marker.label}
            aria-label={marker.label}
            aria-expanded={showHint}
            aria-controls={hintId}
            onClick={() => setShowHint((previous) => !previous)}
            onBlur={() => setShowHint(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setShowHint(false);
              }
            }}
          >
            <img src={mapMarker} alt="" />
          </button>
          <span
            id={hintId}
            className={`${styles.birthSetup__mapTooltip}${showHint ? ` ${styles['birthSetup__mapTooltip--visible']}` : ''}`}
          >
            {marker.label}
          </span>
        </>
      )}

      <a
        className={styles.birthSetup__mapAttribution}
        href="/map-data-sources.txt"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Источники координат карты"
      >
        Источники
      </a>
    </div>
  );
}
