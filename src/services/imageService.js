const sharp = require('sharp');
const logger = require('../utils/logger');

class ImageService {
	constructor() {
		this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'];
		this.maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH) || 2048;
		this.maxHeight = parseInt(process.env.MAX_IMAGE_HEIGHT) || 2048;
		this.quality = parseInt(process.env.IMAGE_QUALITY) || 85;
	}

	validateDimensions(width, height) {
		if (!width || !height) {
			throw new Error('Width and height are required');
		}

		const w = parseInt(width);
		const h = parseInt(height);

		if (isNaN(w) || isNaN(h)) {
			throw new Error('Width and height must be valid numbers');
		}

		if (w <= 0 || h <= 0) {
			throw new Error('Width and height must be positive numbers');
		}

		if (w > this.maxWidth || h > this.maxHeight) {
			throw new Error(`Maximum dimensions are ${this.maxWidth}x${this.maxHeight}`);
		}

		return { width: w, height: h };
	}

	async resizeImage(imageBuffer, width, height, format = 'jpeg') {
		try {
			logger.info(`Resizing image to ${width}x${height}, format: ${format}`);

			const { width: validWidth, height: validHeight } = this.validateDimensions(width, height);

			let sharpInstance = sharp(imageBuffer)
				.resize(validWidth, validHeight, {
					fit: 'cover',
					position: 'center'
				});

			// Apply format-specific options
			switch (format.toLowerCase()) {
				case 'jpeg':
				case 'jpg':
					sharpInstance = sharpInstance.jpeg({
						quality: this.quality,
						progressive: true
					});
					break;
				case 'png':
					sharpInstance = sharpInstance.png({
						compressionLevel: 6,
						progressive: true
					});
					break;
				case 'webp':
					sharpInstance = sharpInstance.webp({
						quality: this.quality
					});
					break;
				default:
					sharpInstance = sharpInstance.jpeg({
						quality: this.quality,
						progressive: true
					});
			}

			const resizedBuffer = await sharpInstance.toBuffer();

			logger.info(`Successfully resized image. Original size: ${imageBuffer.length}, New size: ${resizedBuffer.length}`);

			return resizedBuffer;
		} catch (error) {
			logger.error('Error resizing image:', error);
			throw new Error(`Failed to resize image: ${error.message}`);
		}
	}

	async getImageMetadata(imageBuffer) {
		try {
			const metadata = await sharp(imageBuffer).metadata();
			return {
				width: metadata.width,
				height: metadata.height,
				format: metadata.format,
				size: metadata.size
			};
		} catch (error) {
			logger.error('Error getting image metadata:', error);
			throw new Error('Invalid image format');
		}
	}

	getContentType(format) {
		const contentTypes = {
			'jpeg': 'image/jpeg',
			'jpg': 'image/jpeg',
			'png': 'image/png',
			'webp': 'image/webp',
			'gif': 'image/gif',
			'tiff': 'image/tiff'
		};

		return contentTypes[format.toLowerCase()] || 'image/jpeg';
	}

	extractFormatFromFilename(filename) {
		const extension = filename.split('.').pop().toLowerCase();
		return this.supportedFormats.includes(extension) ? extension : 'jpeg';
	}
}

module.exports = ImageService;
