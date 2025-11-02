const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/validateEnv');
const S3Service = require('./services/s3Service');
const imageRoutes = require('./routes/images');
const { errorHandler } = require('./middleware/errorHandler');

// Validate environment variables before starting
try {
	validateEnvironment();
} catch (error) {
	logger.error('Environment validation failed:', error.message);
	process.exit(1);
}

// Test S3 connection on startup
async function testS3OnStartup() {
	try {
		const s3Service = new S3Service();
		const isConnected = await s3Service.testConnection();

		if (!isConnected) {
			logger.error('❌ S3 connection test failed - shutting down server');
			logger.error('Please check your S3 configuration in .env file');
			process.exit(1);
		} else {
			logger.info('✅ S3 connection test passed');
		}
	} catch (error) {
		logger.error('❌ S3 connection test error:', error.message);
		logger.error('Server shutting down due to S3 connection failure');
		process.exit(1);
	}
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Image routes
app.use('/images', imageRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
	res.status(404).json({ error: 'Not found' });
});

const server = app.listen(PORT, async () => {
	logger.info(`Server running on port ${PORT}`);

	// Test S3 connection after server starts
	await testS3OnStartup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('SIGTERM received, shutting down gracefully');
	server.close(() => {
		logger.info('Process terminated');
	});
});

module.exports = app;
