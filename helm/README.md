# Helm Chart для Image Resizer API

Helm чарт для развертывания Image Resizer API с S3 хранилищем в Kubernetes.

## Установка

### 1. Подготовка

```bash
# Создать namespace
kubectl create namespace resizer

# Создать секрет с AWS credentials (альтернативный способ)
kubectl create secret generic resizer-aws-credentials \
  --from-literal=aws-access-key-id=YOUR_ACCESS_KEY \
  --from-literal=aws-secret-access-key=YOUR_SECRET_KEY \
  -n resizer
```

### 2. Установка чарта

```bash
# Development
helm install resizer-dev ./helm/resizer-pics-s3 \
  --namespace resizer \
  --set s3.bucketName=your-dev-bucket \
  --set secrets.awsAccessKeyId=YOUR_ACCESS_KEY \
  --set secrets.awsSecretAccessKey=YOUR_SECRET_KEY \
  --set ingress.hosts[0].host=resizer-dev.example.com

# Production
helm install resizer-prod ./helm/resizer-pics-s3 \
  --namespace resizer \
  --values ./helm/resizer-pics-s3/values-production.yaml \
  --set s3.bucketName=your-prod-bucket \
  --set secrets.awsAccessKeyId=YOUR_ACCESS_KEY \
  --set secrets.awsSecretAccessKey=YOUR_SECRET_KEY
```

### 3. Обновление

```bash
helm upgrade resizer-prod ./helm/resizer-pics-s3 \
  --namespace resizer \
  --values ./helm/resizer-pics-s3/values-production.yaml
```

## Конфигурация

### Основные параметры

| Параметр                     | Описание          | Значение по умолчанию |
|------------------------------|-------------------|-----------------------|
| `replicaCount`               | Количество реплик | `2`                   |
| `image.repository`           | Docker образ      | `resizer-pics-s3`     |
| `image.tag`                  | Тег образа        | `latest`              |
| `s3.bucketName`              | Имя S3 бакета     | `""`                  |
| `s3.region`                  | AWS регион        | `us-east-1`           |
| `secrets.awsAccessKeyId`     | AWS Access Key    | `""`                  |
| `secrets.awsSecretAccessKey` | AWS Secret Key    | `""`                  |

### Автомасштабирование

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### Ingress

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: resizer.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: resizer-tls
      hosts:
        - resizer.example.com
```

## Мониторинг

### Health Checks

Чарт настраивает автоматические проверки здоровья:

- **Liveness Probe**: `/health`
- **Readiness Probe**: `/health`

### Metrics (опционально)

```yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: monitoring
```

## Безопасность

### Pod Security Context

```yaml
podSecurityContext:
  fsGroup: 1001
  runAsNonRoot: true
  runAsUser: 1001

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: false
  runAsNonRoot: true
  runAsUser: 1001
```

### Network Policies

Для дополнительной безопасности можно добавить NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: resizer-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: resizer-pics-s3
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS для S3
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

## Примеры использования

### Локальная разработка

```bash
# Port-forward для локального доступа
kubectl port-forward svc/resizer-dev 8080:80 -n resizer

# Тестирование
curl http://localhost:8080/health
curl http://localhost:8080/images/test-image.jpg
curl http://localhost:8080/images/300x200/test-image.jpg
```

### Production deployment

```bash
# Создание production namespace
kubectl create namespace resizer-prod

# Установка с production конфигурацией
helm install resizer-prod ./helm/resizer-pics-s3 \
  --namespace resizer-prod \
  --values ./helm/resizer-pics-s3/values-production.yaml \
  --set s3.bucketName=prod-images-bucket \
  --set secrets.awsAccessKeyId=$AWS_ACCESS_KEY_ID \
  --set secrets.awsSecretAccessKey=$AWS_SECRET_ACCESS_KEY \
  --set ingress.hosts[0].host=images.yourdomain.com
```

## Troubleshooting

### Проверка статуса

```bash
# Статус релиза
helm status resizer-prod -n resizer

# Логи подов
kubectl logs -l app.kubernetes.io/name=resizer-pics-s3 -n resizer

# Описание подов
kubectl describe pods -l app.kubernetes.io/name=resizer-pics-s3 -n resizer
```

### Частые проблемы

1. **S3 Connection Failed**
   - Проверьте AWS credentials
   - Убедитесь что bucket существует
   - Проверьте права доступа

2. **Image Pull Error**
   - Убедитесь что образ существует в registry
   - Проверьте imagePullSecrets если используется приватный registry

3. **Ingress не работает**
   - Проверьте что Ingress Controller установлен
   - Убедитесь что DNS настроен правильно
   - Проверьте TLS сертификаты
