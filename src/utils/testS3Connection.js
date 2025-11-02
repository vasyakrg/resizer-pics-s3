const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const logger = require('./logger');

async function testS3Connection(s3Client, bucketName) {
	try {
		logger.info('Testing S3 connection...');

		const command = new ListObjectsV2Command({
			Bucket: bucketName,
			MaxKeys: 1
		});

		const result = await s3Client.send(command);

		logger.info(`S3 connection successful! Bucket: ${bucketName}`);

		if (logger.level === 'debug') {
			logger.debug('S3 connection details:', {
				bucket: bucketName,
				objectCount: result.KeyCount || 0,
				isTruncated: result.IsTruncated
			});
		}

		return true;
	} catch (error) {
		logger.error(`S3 connection test failed for bucket: ${bucketName} - ${error.message}`);

		if (logger.level === 'debug') {
			logger.debug('S3 connection error details:', {
				bucket: bucketName,
				error: error.name,
				message: error.message,
				statusCode: error.$metadata?.httpStatusCode,
				region: error.$metadata?.region
			});
		}

		// Provide specific error messages
		const statusCode = error.$metadata?.httpStatusCode;
		if (statusCode === 403) {
			logger.error('❌ Access denied - check your AWS credentials and bucket permissions');
		} else if (statusCode === 404) {
			logger.error('❌ Bucket not found - check bucket name and region');
		} else if (statusCode === 400) {
			logger.error('❌ Bad request - likely bucket name format issue or region mismatch');
		} else {
			logger.error('❌ Unknown S3 error - check your configuration');
		}

		return false;
	}
}

module.exports = { testS3Connection };
