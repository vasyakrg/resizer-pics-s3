const logger = require('./logger');

function validateEnvironment() {
	const requiredEnvVars = [
		'AWS_ACCESS_KEY_ID',
		'AWS_SECRET_ACCESS_KEY',
		'S3_BUCKET_NAME'
	];

	const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

	if (missingVars.length > 0) {
		logger.error('Missing required environment variables:', missingVars);
		throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
	}

	logger.info('Environment validation passed');

	// Log configuration (without sensitive data)
	logger.info('Current configuration:', {
		AWS_REGION: process.env.AWS_REGION || 'us-east-1',
		S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
		S3_ENDPOINT: process.env.S3_ENDPOINT || 'default AWS',
		S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE || 'false',
		NODE_ENV: process.env.NODE_ENV || 'development',
		PORT: process.env.PORT || 3000
	});
}

module.exports = { validateEnvironment };
