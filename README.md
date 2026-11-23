# Симулятор жизни — frontend

React, TypeScript, Vite и SCSS Modules. «Играть» генерирует новую жизнь через
backend и показывает анкету. «Начать жизнь» открывает то же сохранение.
«Продолжить жизнь» загружает последнее сохранение. При ошибке генерации
доступен повтор или явный выбор мокового режима.

## Запуск и проверка

```text
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

Настройки API приведены в `.env.example`. Локальные значения можно задать в `.env.local`.
Для моковой игры backend не нужен. Прокси Vite передаёт `/api/...`
на `http://127.0.0.1:8081/api/...`.

[Порядок подключения Java backend](docs/backend-integration.md).

Контракт backend 0.2.0 поддержан в `src/api/sessions.ts`: генерация, гостевая cookie,
сохранения, переход года и ответы на решения. Покупки, фокус и финансы доступны
в локальной игре.

Ключи API и пароли базы данных хранятся только на backend.

## Исходный шаблон Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
