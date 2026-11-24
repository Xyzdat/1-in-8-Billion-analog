import fatherIcon from '../../assets/setup-person.png';
import babyIcon from '../../assets/setup-baby.png';
import type { BirthCardModel } from '../../types/birthCard';
import styles from './bearthSetupPage.module.scss';

export default function BirthFamilyCard({ model }: { model: BirthCardModel }) {
  return (
    <section className={`${styles.birthSetup__card} ${styles['birthSetup__card--family']}`}>
      <h3>Твоя семья</h3>

      <div className={styles.birthSetup__familyList}>
        {model.members.length === 0 && (
          <p className={styles.birthSetup__empty}>Нет данных о членах семьи.</p>
        )}
        {model.members.map((member) => (
          <div className={styles.birthSetup__familyMember} key={member.id}>
            <span className={styles.birthSetup__familyIcon} aria-hidden="true">
              {member.kind === 'mother' ? '👩' : (
                <img
                  className={member.kind === 'sibling' ? styles.birthSetup__babyIcon : undefined}
                  src={member.kind === 'father' ? fatherIcon : babyIcon}
                  alt=""
                />
              )}
            </span>

            <div className={styles.birthSetup__familyInfo}>
              <strong>{member.title}</strong>
              <span title={member.context}>{member.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.birthSetup__familyDetails}>
        {model.familyDetails.map(({ label, value, context }) => (
          <div className={styles.birthSetup__detailRow} key={label}>
            <span>{label}</span>
            <strong title={context}>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
