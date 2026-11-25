import type { CharacterSettings } from '../../types/character';
import { childhoodFriend, closePeople, siblingNames } from '../../mocks/gameTabs';
import type { ClosePerson } from '../../mocks/gameTabs';
import type { PersonId } from '../../mocks/lifeEconomy';
import type { AdultLife, SimulationFamilyMember } from '../../api/sessionTypes';
import { toServerFamily } from '../../game/serverPresentation';
import type { PresentedPerson } from '../../game/serverPresentation';
import styles from './GameTabs.module.scss';

type MockProps = {
  settings: CharacterSettings;
  age: number;
  closeness: Record<PersonId, number>;
};

type Props = MockProps | { family: SimulationFamilyMember[]; adult?: AdultLife | null };

function PersonCard({ person }: { person: PresentedPerson }) {
  const personAge = person.age;
  const closeness = person.closeness;
  const ageLabel = personAge % 10 === 1 && personAge % 100 !== 11
    ? 'год'
    : [2, 3, 4].includes(personAge % 10) && ![12, 13, 14].includes(personAge % 100)
      ? 'года'
      : 'лет';

  return (
    <article
      className={`${styles.people__person}${person.alive ? '' : ` ${styles['people__person--deceased']}`}`}
    >
      <span className={styles.people__avatar} aria-hidden="true">
        {person.icon}
      </span>
      <div className={styles.people__info}>
        <h3>{person.name}</h3>
        <p>
          {person.role} · {personAge} {ageLabel}
          {person.contactLabel && ` · ${person.contactLabel}`}
        </p>
        <p className={styles.people__occupation}>{person.occupation}</p>
        <div className={styles.people__closeness}>
          <span>💗 Близость</span>
          <progress max={100} value={closeness} aria-label={`Близость: ${person.name}`} />
          <span>{closeness} из 100</span>
        </div>
      </div>
    </article>
  );
}

function mockPerson(person: ClosePerson, age: number, closeness: number): PresentedPerson {
  return { ...person, age: person.ageAtBirth + age, closeness, alive: true };
}

function mockPeople({ settings, age, closeness }: MockProps) {
  const parents = closePeople.filter((person) => {
    if (person.id === 'mother') return ['Полная семья', 'Только мама'].includes(settings.family);
    if (person.id === 'father') return ['Полная семья', 'Только папа'].includes(settings.family);
    return false;
  }).map((person) => ({
    ...person,
    occupation: person.id === 'mother' ? settings.mother : settings.father,
  }));
  const siblingTemplate = closePeople.find((person) => person.id === 'brother')!;
  const siblingCount = settings.siblings === 'Нет'
    ? 0
    : ['Брат и сестра', 'Два брата', 'Две сестры'].includes(settings.siblings) ? 2 : 1;
  const siblings = Array.from({ length: siblingCount }, (_, index) => {
    const isSister = settings.siblings === 'Брат и сестра'
      ? index === 1
      : settings.siblings.toLowerCase().includes('сестр');

    return {
      ...siblingTemplate,
      id: `sibling-${index}`,
      name: siblingNames[index],
      role: isSister ? 'Сестра' : 'Брат',
      icon: isSister ? '👧' : '👦',
      occupation: age + siblingTemplate.ageAtBirth >= 18 ? 'Учится или работает' : age + siblingTemplate.ageAtBirth >= 6 ? 'Учится в школе' : 'Ходит в детский сад',
    };
  });
  return {
    family: [...parents, ...siblings].map((person) => mockPerson(
      person,
      age,
      closeness[person.id === 'sibling-0' ? 'brother' : person.id as PersonId],
    )),
    emptyFamily: parents.length ? null : `${settings.family}. О тебе заботятся взрослые рядом.`,
    friends: age >= 7 ? [mockPerson(
      { ...childhoodFriend, occupation: age >= 18 ? 'Учится или работает' : childhoodFriend.occupation },
      age,
      closeness.friend,
    )] : [],
    emptyFriends: 'Близкие друзья появятся по мере взросления.',
    deceased: [] as PresentedPerson[],
  };
}

function serverPeople(people: SimulationFamilyMember[], adult?: AdultLife | null) {
  const living = people.filter((person) => person.alive && (
    person.role === 'mother'
    || person.role === 'father'
    || (person.contact?.status !== 'NO_CONTACT'
      && (person.role === 'friend' || person.contact?.status !== 'RARE_CONTACT'))
  ));
  const family = toServerFamily(living.filter((person) => person.role !== 'friend'), adult);

  return {
    family,
    friends: toServerFamily(living.filter((person) => person.role === 'friend'), adult),
    deceased: toServerFamily(people.filter((person) => !person.alive), adult),
    emptyFamily: family.length ? null : 'Родственников для отображения пока нет.',
    emptyFriends: 'Друзей для отображения пока нет.',
  };
}

export default function ClosePeopleTab(props: Props) {
  const { family, friends, deceased, emptyFamily, emptyFriends } = 'family' in props
    ? serverPeople(props.family, props.adult)
    : mockPeople(props);

  return (
    <section className={styles.people} aria-labelledby="close-people-title">
      <h2 id="close-people-title">Близкие</h2>
      <p className={styles.people__subtitle}>Семья и важные люди в твоей жизни</p>

      <div className={styles.people__list}>
        {family.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
          />
        ))}
        {emptyFamily && (
          <p className={styles.people__empty}>{emptyFamily}</p>
        )}
      </div>

      <h2 className={styles.people__friendsTitle}>Друзья</h2>
      {friends.length > 0 ? (
        friends.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
          />
        ))
      ) : (
        <p className={styles.people__empty}>{emptyFriends}</p>
      )}

      {deceased.length > 0 && (
        <>
          <h2 className={styles.people__deceasedTitle}>Ушли из жизни</h2>
          <div className={styles.people__list}>
            {deceased.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
              />
            ))}
          </div>
        </>
      )}
      <p className={styles.people__note}>На близость влияют ваши решения в игре</p>
    </section>
  );
}
