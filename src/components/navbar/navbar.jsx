import styles from './navbar.module.scss'
import messagesIcon from '../../assets/figma-messages.svg';
import anonchatIcon from '../../assets/figma-anonchat.svg';
import heartIcon from '../../assets/figma-heart.svg';
import bookIcon from '../../assets/figma-book.svg';
import profileIcon from '../../assets/figma-profile.svg';

const navigation = [
  { id: 1, icon: messagesIcon, label: 'Сообщения' },
  { id: 2, icon: anonchatIcon, label: 'Сообщество' },
  { id: 3, icon: heartIcon, label: 'Избранное' },
  { id: 4, icon: bookIcon, label: 'История' },
  { id: 5, icon: profileIcon, label: 'Профиль' },
];

function Navbar() {
    return (
    <div className={styles.navigation}>
        {navigation.map(({ id, icon, label }) => (
          <button
            key={id}
            className={styles.navigation__item}
            aria-label={label}
          >
            <img className={styles.navigation__icon} src={icon} alt="" />
          </button>
        ))}
      </div>
    )
} 

export default Navbar;
