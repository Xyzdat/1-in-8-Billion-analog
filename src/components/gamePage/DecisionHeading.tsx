import styles from './GamePage.module.scss';

type Props = {
  title: string;
  text?: string;
  important?: boolean;
  age: number;
  year: number;
  onDefer?: () => void;
};

export default function DecisionHeading({ title, text, important, age, year, onDefer }: Props) {
  return (
    <>
      {important && (
        <div className={styles.game__decisionHeading}>
          <span className={styles.game__important}>Важное решение</span>
          {onDefer && (
            <button type="button" onClick={onDefer}>
              Отложить на время
            </button>
          )}
        </div>
      )}
      <p className={styles.game__muted}>
        {age} {age === 1 ? 'год' : age >= 2 && age <= 4 ? 'года' : 'лет'} · {year}
      </p>
      <h2 id="decision-title">{title}</h2>
      {text && <p id="decision-text">{text}</p>}
    </>
  );
}
