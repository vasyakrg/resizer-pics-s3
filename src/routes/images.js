const express = require('express');
const router = express.Router();
const S3Service = require('../services/s3Service');
const ImageService = require('../services/imageService');
const logger = require('../utils/logger');

const s3Service = new S3Service();
const imageService = new ImageService();

// Route for images with optional resizing
// Supports both:
// GET /images/photo.jpg - original image
// GET /images/150x150/photo.jpg - resized image
router.get('/*', async (req, res, next) => {
	try {
		const fullPath = req.params[0];
		logger.info(`Processing image request: ${fullPath}`);
		logger.info(`Full request URL: ${req.originalUrl}`);
		logger.info(`Request params:`, req.params);

		// Parse path to check for dimensions
		const pathParts = fullPath.split('/');
		let imagePath, dimensions;

		// Check if first part is dimensions (e.g., "150x150")
		const dimensionPattern = /^(\d+)x(\d+)$/;
		const firstPart = pathParts[0];

		if (dimensionPattern.test(firstPart)) {
			// Path with dimensions: /150x150/folder/photo.jpg
			const match = firstPart.match(dimensionPattern);
			dimensions = {
				width: parseInt(match[1]),
				height: parseInt(match[2])
			};
			// Keep the full path after dimensions and add images/ prefix
			imagePath = `images/${pathParts.slice(1).join('/')}`;
		} else {
			// Original image path: add images/ prefix since Express strips it
			imagePath = `images/${fullPath}`;
			dimensions = null;
		}

		if (!imagePath) {
			return res.status(400).json({ error: 'Invalid image path' });
		}

		logger.info(`Image path: ${imagePath}, Dimensions: ${dimensions ? `${dimensions.width}x${dimensions.height}` : 'original'}`);

		// If dimensions are specified, handle resized image
		if (dimensions) {
			await handleResizedImage(imagePath, dimensions, res);
		} else {
			await handleOriginalImage(imagePath, res);
		}

	} catch (error) {
		next(error);
	}
});

async function handleOriginalImage(imagePath, res) {
	try {
		// Check if original image exists
		const exists = await s3Service.headObject(imagePath);
		if (!exists) {
			return res.status(404).json({ error: 'Image not found' });
		}

		// Get original image
		const imageBuffer = await s3Service.getObject(imagePath);
		const format = imageService.extractFormatFromFilename(imagePath);
		const contentType = imageService.getContentType(format);

		res.set({
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000', // 1 year
			'ETag': `"${imagePath}"`
		});

		res.send(imageBuffer);
		logger.info(`Served original image: ${imagePath}`);
	} catch (error) {
		logger.error(`Error serving original image ${imagePath}:`, error);
		throw error;
	}
}

async function handleResizedImage(imagePath, dimensions, res) {
	try {
		// Validate dimensions
		imageService.validateDimensions(dimensions.width, dimensions.height);

		// Generate resized image key
		const resizedKey = s3Service.generateResizedKey(imagePath, dimensions.width, dimensions.height);

		// Check if resized image already exists
		const resizedExists = await s3Service.headObject(resizedKey);

		if (resizedExists) {
			logger.info(`Serving existing resized image: ${resizedKey}`);
			const resizedBuffer = await s3Service.getObject(resizedKey);
			const format = imageService.extractFormatFromFilename(imagePath);
			const contentType = imageService.getContentType(format);

			res.set({
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000', // 1 year
				'ETag': `"${resizedKey}"`
			});

			return res.send(resizedBuffer);
		}

		// Check if original image exists
		const originalExists = await s3Service.headObject(imagePath);
		if (!originalExists) {
			return res.status(404).json({ error: 'Original image not found' });
		}

		// Get original image
		logger.info(`Creating resized image: ${resizedKey}`);
		const originalBuffer = await s3Service.getObject(imagePath);

		// Resize image
		const format = imageService.extractFormatFromFilename(imagePath);
		const resizedBuffer = await imageService.resizeImage(
			originalBuffer,
			dimensions.width,
			dimensions.height,
			format
		);

		// Save resized image to S3
		const contentType = imageService.getContentType(format);
		await s3Service.putObject(resizedKey, resizedBuffer, contentType);

		// Send resized image
		res.set({
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000', // 1 year
			'ETag': `"${resizedKey}"`
		});

		res.send(resizedBuffer);
		logger.info(`Created and served resized image: ${resizedKey}`);

	} catch (error) {
		logger.error(`Error handling resized image ${imagePath}:`, error);
		throw error;
	}
}

module.exports = router;
