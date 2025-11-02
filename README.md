# Image Resizer API with S3 Storage

REST API для ресайза изображений с хранением в S3-совместимом хранилище.

## Возможности

- Отдача оригинальных изображений из S3
- Автоматический ресайз изображений по запросу
- Кэширование ресайзенных изображений в S3
- Поддержка форматов: JPEG, PNG, WebP, GIF, TIFF
- Docker контейнеризация с Angie прокси
- HTTPS поддержка
- Rate limiting и безопасность

## API Endpoints

### Получение оригинального изображения

```curl
GET /images/photo.jpg
GET /images/folder/photo.jpg
```

### Получение ресайзенного изображения

```curl
GET /images/150x150/photo.jpg
GET /images/300x200/folder/photo.jpg
```

## Установка и запуск

### 1. Клонирование и настройка

```bash
git clone <repository>
cd resizer-pics-s3
cp env.example .env
```

### 2. Настройка переменных окружения

Отредактируйте файл `.env`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# AWS S3 Configuration (SDK v3)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name_here

# Optional: For custom S3-compatible storage (MinIO, etc.)
# S3_ENDPOINT=https://your-s3-endpoint.com
# S3_FORCE_PATH_STYLE=true

# Image Processing Configuration
MAX_IMAGE_WIDTH=2048
MAX_IMAGE_HEIGHT=2048
IMAGE_QUALITY=85
```

### 3. Размещение TLS сертификатов

Поместите ваши сертификаты в папку `certs/`:

- `certs/server.crt` - сертификат
- `certs/server.key` - приватный ключ

### 4. Запуск с Docker Compose

```bash
docker-compose up -d
```

## Разработка

### Локальный запуск

```bash
npm install
npm run dev
```

### Тестирование

```bash
npm test
```

## Архитектура

- **Express.js** - веб-фреймворк
- **Sharp** - обработка изображений
- **AWS SDK v3** - работа с S3
- **Angie** - reverse proxy с HTTPS
- **Docker** - контейнеризация

## Безопасность

- HTTPS принудительное перенаправление
- Rate limiting для API и изображений
- Валидация размеров изображений
- Безопасные заголовки HTTP
- Запуск от непривилегированного пользователя

## Мониторинг

- Health check endpoint: `/health`
- Логирование в файлы и консоль
- Метрики производительности в логах Angie
