const winston = require('winston');

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json()
	),
	defaultMeta: { service: 'resizer-pics-s3' },
	transports: []
});

// Always add console transport for Kubernetes logs
logger.add(new winston.transports.Console({
	format: process.env.NODE_ENV === 'production'
		? winston.format.combine(
			winston.format.timestamp(),
			winston.format.json()
		)
		: winston.format.combine(
			winston.format.colorize(),
			winston.format.simple()
		)
}));

// Add file transports only in development or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
	logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
	logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

module.exports = logger;
