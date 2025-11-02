const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
	logger.error('Error occurred:', {
		error: err.message,
		stack: err.stack,
		url: req.url,
		method: req.method,
		ip: req.ip
	});

	// AWS S3 errors (SDK v3)
	if (err.name === 'NoSuchKey' || err.name === 'NotFound') {
		return res.status(404).json({ error: 'Image not found' });
	}

	if (err.name === 'AccessDenied' || err.name === 'Forbidden') {
		return res.status(403).json({ error: 'Access denied' });
	}

	// AWS SDK v3 generic errors
	if (err.$metadata && err.$metadata.httpStatusCode) {
		const statusCode = err.$metadata.httpStatusCode;
		if (statusCode === 404) {
			return res.status(404).json({ error: 'Image not found' });
		}
		if (statusCode === 403) {
			return res.status(403).json({ error: 'Access denied' });
		}
		if (statusCode === 400) {
			return res.status(400).json({ error: 'Bad request to S3' });
		}
	}

	// Handle UnknownError from AWS SDK v3
	if (err.name === 'UnknownError') {
		logger.error(`AWS SDK UnknownError: ${err.message}`);

		// Detailed logging only in debug mode
		if (logger.level === 'debug') {
			logger.debug('AWS SDK UnknownError details:', {
				message: err.message,
				metadata: err.$metadata,
				fault: err.$fault,
				stack: err.stack,
				errorKeys: Object.keys(err)
			});
		}

		// Try to determine the actual error from status code
		const statusCode = err.$metadata?.httpStatusCode;

		if (logger.level === 'debug') {
			logger.debug(`UnknownError HTTP Status: ${statusCode}`);
		}

		if (statusCode === 403) {
			return res.status(403).json({
				error: 'S3 access denied - check bucket name and credentials'
			});
		}
		if (statusCode === 404) {
			return res.status(404).json({
				error: 'S3 bucket or object not found'
			});
		}
		if (statusCode === 400) {
			return res.status(400).json({
				error: 'S3 bad request - likely invalid bucket name or region mismatch'
			});
		}

		return res.status(500).json({ error: 'S3 service error' });
	}

	// Handle NoSuchBucket specifically
	if (err.name === 'NoSuchBucket') {
		return res.status(404).json({
			error: 'S3 bucket not found - check bucket name and region'
		});
	}

	// Sharp errors
	if (err.message && err.message.includes('Input file')) {
		return res.status(400).json({ error: 'Invalid image format' });
	}

	// Validation errors
	if (err.name === 'ValidationError') {
		return res.status(400).json({ error: err.message });
	}

	// Default error
	res.status(500).json({
		error: process.env.NODE_ENV === 'production'
			? 'Internal server error'
			: err.message
	});
};

module.exports = { errorHandler };
