import { useEffect, useState } from 'react';
import styles from './header.module.scss';
import { CheckCircle2 } from 'lucide-react';

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
        } catch (error) {
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
                <span />
                <span />
                <span />
            </button>

            <h1 
                className={styles.header__title}
                onClick={onItemClick}  
                role='button'
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' '  ){
                        event.preventDefault();
                        onItemClick;
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
                <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                >
                <path d="M12 16V3m-5 5 5-5 5 5" />
                <path d="M5 12v8h14v-8" />
                </svg>
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