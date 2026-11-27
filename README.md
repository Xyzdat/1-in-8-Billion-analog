# Симулятор жизни — frontend

React, TypeScript, Vite и SCSS Modules. Frontend подключён к backend по OpenAPI
0.11.0: генерация жизни, сохранения, решения, фокус года, близкие, бюджет,
покупки и продажа имущества. Моковый режим работает отдельно, без backend.

## Требования

- **Node.js 26.13.1** и npm — на этой версии проверены тесты, типы, линтер и сборка.
- Git и доступ к репозиториям frontend и `life-backend` совместимых версий.
- Docker Desktop с Docker Compose, запущенный в режиме Linux-контейнеров.

При запуске backend и PostgreSQL в Docker отдельно устанавливать JDK, Maven
и PostgreSQL не требуется. Команды ниже приведены для PowerShell.

```powershell
node --version
npm --version
git --version
docker compose version
```

Удобно скачать оба репозитория в соседние каталоги:

```text
рабочая-папка/
  life-backend/
    compose.yaml
    .env.example
  1in8BillionCopy/
    package.json
    package-lock.json
    .env.example
```

Размещать их рядом необязательно. У проектов отдельные файлы настроек.
Источник контракта API — `life-backend/docs/openapi.yaml`.

## 1. Запустить backend и PostgreSQL

Откройте первый терминал **в корне backend (`life-backend`)**.
Создайте `.env`, если его ещё нет:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

В backend-файле `.env` задайте собственный локальный пароль. Порты по умолчанию:

```dotenv
LIFE_DOCKER_DB_PASSWORD=замените_на_свой_локальный_пароль
LIFE_DOCKER_DB_PORT=5433
LIFE_DOCKER_HTTP_PORT=8081
```

Запустите Docker Desktop, затем сервисы:

```powershell
docker compose up -d --build --wait
docker compose ps
Invoke-RestMethod http://127.0.0.1:8081/api/v1/health
```

Ожидается статус `UP`. Flyway применяет миграции при старте.
Backend доступен на порту `8081`, PostgreSQL — на `5433`.

### Импорт статистики для новой базы

Одних миграций недостаточно для генерации жизни. В том же терминале backend
импортируйте включённые в репозиторий статистические ресурсы:

```powershell
docker compose run --rm --no-deps backend --spring.main.web-application-type=none --life.statistics.import=true
docker compose up -d --no-deps --wait backend
```

База должна быть запущена. Заново скачивать исходные статистические выгрузки
для обычного запуска не нужно. Подробности — в backend-файлах `docs/docker.md`,
`docs/local-engine.md` и `docs/country-expansion.md`. При изменении backend
следуйте документации выбранной версии.

Для собственного локального движка **ключ 1in8b не нужен**. Ключи внешнего
движка и пароли базы настраиваются только в backend.

## 2. Установить и настроить frontend

Откройте второй терминал **в корне frontend (`1in8BillionCopy`)**:

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

`npm ci` использует зафиксированные версии из `package-lock.json`.
Frontend-файл `.env.local` для backend в Docker:

```dotenv
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT_MS=10000
DEV_API_TARGET=http://127.0.0.1:8081
```

| Переменная | Назначение |
| --- | --- |
| `VITE_API_BASE_URL` | Базовый путь API в браузере. Оставьте `/api`: клиент сам добавляет `/v1/...`. |
| `VITE_API_TIMEOUT_MS` | Время ожидания ответа в миллисекундах. |
| `DEV_API_TARGET` | Адрес backend для прокси Vite. |

Не заменяйте `/api` на `/api/v1`: получится двойной `/v1`.
Если backend работает из IDE на порту `8080`, измените только `DEV_API_TARGET`
на `http://127.0.0.1:8080`. При изменении порта Docker укажите фактический
`LIFE_DOCKER_HTTP_PORT`.

`.env.local` исключён из Git. Пароли и ключи сюда добавлять нельзя:
значения `VITE_*` доступны браузеру. После изменения настроек перезапустите Vite.

## 3. Запустить frontend и проверить игру

```powershell
npm run dev
```

Откройте **http://127.0.0.1:5173/**. Порт `5173` фиксирован: если он занят,
остановите предыдущий экземпляр Vite или другое приложение на этом порту.

Из другого терминала проверьте связь через frontend-прокси:

```powershell
Invoke-RestMethod http://127.0.0.1:5173/api/v1/health
```

Ожидается статус `UP`. Браузер отправляет запросы на `/api` того же сайта,
а Vite перенаправляет их в backend. Настраивать CORS отдельно для этого запуска
не требуется.

1. Нажмите «Играть» — создастся новая жизнь собственного локального движка.
2. Дождитесь анкеты и нажмите «Начать жизнь» — откроется уже созданная сессия.
3. Проверьте паузу, скорости, решения и вкладку «Бюджет».
4. Обновите страницу — должна восстановиться та же жизнь.
5. «Продолжить жизнь» на главной странице загружает сохранение без создания нового.

Сохранения привязаны к гостевой cookie, активный ID хранится в localStorage.
Для продолжения используйте тот же браузер, профиль и адрес сайта:
`localhost` и `127.0.0.1` имеют разные браузерные хранилища.
У каждого разработчика своя локальная база и свои сохранения.

## Проверки и сборка

Из корня frontend:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Эти проверки не требуют backend. Сборка появляется в `dist/`.
`npm run preview` позволяет посмотреть сборку, но не заменяет общий тестовый
стенд: прокси `/api` настроен для `npm run dev`. При размещении сборки сервер
должен отдельно перенаправлять `/api` в backend.

Проверка управления бюджетом на работающем Docker backend:

```powershell
node tests/budgetManagement.integration.mjs
```

Этот тест создаёт отдельного гостя и тестовые жизни в локальной базе,
не вызывает внешний 1in8b Engine. Требуются импортированная статистика
и backend по адресу `http://127.0.0.1:8081`.

## Частые проблемы

- **Ошибка прокси или backend недоступен:** проверьте Docker Desktop,
  `docker compose ps`, `DEV_API_TARGET` и прямой запрос `/api/v1/health` к backend.
- **STATISTICS_NOT_READY:** выполните импорт статистики в базу запущенного
  backend. Статус `UP` сам по себе не подтверждает наличие статистики.
- **Контейнеры не запустились:** из каталога backend выполните
  `docker compose logs --tail 80 backend postgres`; проверьте порты и `.env`.
- **Не видно сохранения:** проверьте адрес сайта, профиль браузера, cookie
  и подключение к нужной базе.
- **Нужен просмотр без backend:** используйте доступный в интерфейсе моковый
  режим. Его изменения не сохраняются в серверную базу.

## Остановка

Frontend: `Ctrl+C` в терминале с Vite.
Backend и база: из каталога `life-backend` выполните:

```powershell
docker compose down
```

Обычная остановка сохраняет данные в томе PostgreSQL.

Подробности финансовых маршрутов и ручных сценариев:
[docs/finances-integration.md](docs/finances-integration.md).
