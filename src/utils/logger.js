const winston = require('winston');

// Create different configurations for production and development
const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	defaultMeta: { service: 'resizer-pics-s3' },
	transports: [
		// Console transport - always present for Kubernetes logs
		new winston.transports.Console({
			format: isProduction
				? winston.format.combine(
					winston.format.timestamp(),
					winston.format.errors({ stack: true }),
					winston.format.json()
				)
				: winston.format.combine(
					winston.format.colorize(),
					winston.format.simple()
				)
		})
	]
});

// Add file transports only in development or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
	logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
	logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

module.exports = logger;
