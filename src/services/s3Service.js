const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');
const { testS3Connection } = require('../utils/testS3Connection');

class S3Service {
	constructor() {
		const clientConfig = {
			region: process.env.AWS_REGION || 'us-east-1',
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
			}
		};

		// Add custom endpoint if specified (for MinIO, etc.)
		if (process.env.S3_ENDPOINT) {
			clientConfig.endpoint = process.env.S3_ENDPOINT;
			clientConfig.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
		}

		this.s3Client = new S3Client(clientConfig);
		this.bucket = process.env.S3_BUCKET_NAME;

		if (!this.bucket) {
			throw new Error('S3_BUCKET_NAME environment variable is required');
		}

		logger.info('S3Service initialized:', {
			region: clientConfig.region,
			bucket: this.bucket,
			hasCustomEndpoint: !!process.env.S3_ENDPOINT,
			forcePathStyle: clientConfig.forcePathStyle
		});
	}

	async testConnection() {
		return await testS3Connection(this.s3Client, this.bucket);
	}

	async getObject(key) {
		try {
			logger.info(`Getting object from S3: ${key}`);
			const command = new GetObjectCommand({
				Bucket: this.bucket,
				Key: key
			});

			const result = await this.s3Client.send(command);

			// Convert stream to buffer for AWS SDK v3
			const chunks = [];
			for await (const chunk of result.Body) {
				chunks.push(chunk);
			}
			return Buffer.concat(chunks);
		} catch (error) {
			logger.error(`Error getting object ${key}:`, error);
			throw error;
		}
	}

	async putObject(key, body, contentType = 'image/jpeg') {
		try {
			logger.info(`Putting object to S3: ${key}`);
			const command = new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: body,
				ContentType: contentType,
				CacheControl: 'max-age=31536000' // 1 year cache
			});

			await this.s3Client.send(command);
			logger.info(`Successfully uploaded ${key}`);
		} catch (error) {
			logger.error(`Error putting object ${key}:`, error);
			throw error;
		}
	}

	async headObject(key) {
		try {
			logger.info(`Checking if object exists in S3: ${key}`);

			if (logger.level === 'debug') {
				logger.debug(`S3 Request details:`, {
					bucket: this.bucket,
					key: key,
					region: this.s3Client.config.region,
					endpoint: this.s3Client.config.endpoint
				});
			}

			const command = new HeadObjectCommand({
				Bucket: this.bucket,
				Key: key
			});

			const result = await this.s3Client.send(command);
			logger.info(`Object exists: ${key}`);

			if (logger.level === 'debug') {
				logger.debug(`HeadObject result:`, { result });
			}

			return true;
		} catch (error) {
			logger.error(`S3 HeadObject failed for ${key}: ${error.message}`);

			// Detailed error logging only in debug mode
			if (logger.level === 'debug') {
				logger.debug(`S3 HeadObject detailed error:`, {
					name: error.name,
					message: error.message,
					code: error.Code,
					statusCode: error.$metadata?.httpStatusCode,
					requestId: error.$metadata?.requestId,
					extendedRequestId: error.$metadata?.extendedRequestId,
					bucket: this.bucket,
					errorKeys: Object.keys(error),
					metadata: error.$metadata
				});
			}

			// Handle different error types for "not found"
			if (error.name === 'NotFound' ||
				error.name === 'NoSuchKey' ||
				error.$metadata?.httpStatusCode === 404) {
				return false;
			}

			// Handle bucket not found or access denied
			if (error.name === 'NoSuchBucket' ||
				error.$metadata?.httpStatusCode === 403) {
				logger.error(`Bucket access error: ${this.bucket} - check bucket name and permissions`);
			}

			throw error;
		}
	}

	generateResizedKey(originalKey, width, height) {
		const pathParts = originalKey.split('/');
		const fileName = pathParts.pop();
		const directory = pathParts.join('/');

		const fileNameParts = fileName.split('.');
		const extension = fileNameParts.pop();
		const baseName = fileNameParts.join('.');

		const resizedFileName = `${baseName}_${width}x${height}.${extension}`;

		return directory ? `${directory}/${resizedFileName}` : resizedFileName;
	}
}

module.exports = S3Service;
