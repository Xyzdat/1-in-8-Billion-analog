import { useEffect, useState } from 'react';
import styles from './header.module.scss';
import { CheckCircle2 } from 'lucide-react';
import menuIcon from '../../assets/figma-menu.svg';
import shareIcon from '../../assets/figma-share.svg';

function Header({onItemClick}) {
    const [notification, setNotification] = useState('');

    useEffect(() => {
        if (!notification) return;

        const timer = setTimeout(() => {
            setNotification('');
        }, 3000);


        return () => clearTimeout(timer);
    }, [notification])


    const handleShare = async () => {
        try {
        await navigator.clipboard.writeText(window.location.href);
        setNotification('Ссылка скопирована');
        } catch {
        setNotification('Не удалось скопировать ссылку');
        }
    };

    return (
    <>
        <div className={styles.header}>
            <button
                className={styles.header__menu}
                aria-label="Открыть меню"
            >
                <img src={menuIcon} alt="" />
            </button>

            <h1 
                className={styles.header__title}
                onClick={onItemClick}  
                role='button'
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' '  ){
                        event.preventDefault();
                        onItemClick();
                    }
                }}  
            >
                Жизнь без конца
            </h1>

            <button
                className={styles.header__share}
                aria-label="Поделиться"
                onClick={handleShare}
            >
                <img src={shareIcon} alt="" />
            </button>
        </div>

        {notification && (
            <div className={styles.notification} role="status" aria-live="polite">
                <CheckCircle2 className={styles.notification__check} />
                {notification}
            </div>
        )}
    </>
    
    )
}

export default Header;
