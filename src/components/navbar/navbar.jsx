import styles from './navbar.module.scss'
import {
  MessagesSquare,
  VenetianMask,
  Heart,
  ScrollText,
  UserRound,
} from 'lucide-react';

const navigation = [
  { id: 1, icon: MessagesSquare, label: 'Сообщения' },
  { id: 2, icon: VenetianMask, label: 'Сообщество' },
  { id: 3, icon: Heart, label: 'Избранное' },
  { id: 4, icon: ScrollText, label: 'История' },
  { id: 5, icon: UserRound, label: 'Профиль' },
];

function Navbar() {
    return (
    <div className={styles.navigation}>
        {navigation.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={styles.navigation__item}
            aria-label={label}
          >
            <Icon
              className={styles.navigation__icon}
              size={27}
              strokeWidth={2.5}
            />
          </button>
        ))}
      </div>
    )
} 

export default Navbar;
