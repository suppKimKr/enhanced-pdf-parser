# Enhanced PDF Parser

A sophisticated PDF parsing service that leverages AWS Bedrock with Claude 4.0 AI to extract structured data and images from PDF documents.

## Overview

Enhanced PDF Parser is a Node.js application designed to process PDF documents by converting them to high-resolution images, analyzing their content using Claude 4.0 AI, extracting and identifying images within the documents, and organizing the extracted data into a structured format. The service is particularly useful for processing educational or assessment documents containing questions and images.

## Features

- **PDF to Image Conversion**: Converts PDF documents to high-resolution images for analysis
- **AI-Powered Analysis**: Uses Claude 4.0 via AWS Bedrock for comprehensive document analysis
- **Image Extraction**: Automatically identifies and extracts images from documents
- **Structured Data Output**: Organizes extracted content into a structured format with questions and related images
- **Cloud Storage Integration**: Uploads extracted images to AWS S3 for storage and retrieval
- **Database Integration**: Supports storing results in MySQL and MongoDB
- **Performance Tracking**: Monitors and reports processing performance metrics

## Installation

### Prerequisites

- Node.js (latest LTS version recommended)
- AWS account with access to S3 and Bedrock services
- MongoDB database (optional)
- MySQL database (optional)
- Redis (optional)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/enhanced-pdf-parser.git
   cd enhanced-pdf-parser
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure the application by updating the `config/default.json` file with your AWS credentials, database connections, and other settings.

## Configuration

The application is configured using the `config/default.json` file. Key configuration sections include:

### Application Settings
```json
{
    "app": {
        "env": "default",
        "name": "enhanced-pdf-parser",
        "version": "v1",
        "domain": "http://localhost:3993/",
        "port": 3993
    }
}
```

### Database Settings
```json
{
    "database": {
        "mysql": {
            "host": ["your-mysql-host"],
            "dbname": ["your-dbname"],
            "user": "your-username",
            "password": "your-password",
            "protocol": "mysql",
            "port": "3306",
            "logging": true
        },
        "redis": {
            "port": 6379,
            "host": "localhost",
            "db": 0
        },
        "mongo": {
            "host": "your-mongodb-connection-string",
            "db": "your-db-name"
        }
    }
}
```

### AWS Settings
```json
{
    "aws": {
        "region": "your-aws-region",
        "accessKey": "your-access-key",
        "secretAccessKey": "your-secret-access-key",
        "s3Image": "your-s3-bucket-name",
        "s3ImageUrl": "your-s3-url",
        "s3Repository": "your-repository",
        "bedrock": {
            "modelId": "your-bedrock-model-id"
        }
    }
}
```

## Usage

### Basic Usage

```javascript
const { EnhancedPDFParserWithImages } = require('./server/lib/enhanced_pdf_parser');
const fs = require('fs');
const config = require('config');

// Initialize the parser
const parser = new EnhancedPDFParserWithImages(config);

// Process a PDF file
async function processPDF(filePath) {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const result = await parser.processPDFWithImages(pdfBuffer, {
            documentType: 'exam' // or 'auto', 'textbook', etc.
        });
        
        logger.info(`Processing completed: ${result.processingId}`);
        logger.info(`Found ${result.questions.length} questions and ${result.allImages.length} images`);
        
        return result;
    } catch (error) {
        logger.error('Error processing PDF:', error);
    }
}

// Example usage
processPDF('./path/to/your/document.pdf');
```

### Processing Workflow

The PDF processing workflow consists of several steps:

1. **PDF to Image Conversion**: The PDF is converted to high-resolution images
2. **Claude 4.0 Analysis**: The images are analyzed by Claude 4.0 to identify text and image coordinates
3. **Image Extraction**: Identified images are cropped and uploaded to S3
4. **Data Structuring**: Questions and images are linked together in a structured format
5. **Database Storage**: Results are saved to databases (if configured)
6. **Cleanup**: Temporary files are removed

## API

The service provides a minimal API with a health check endpoint:

- `GET /health`: Returns the health status of the service

## Dependencies

Major dependencies include:

- Express: Web server framework
- AWS SDK: For S3 and Bedrock integration
- pdf-poppler: For PDF to image conversion
- canvas: For image processing
- sharp: For image manipulation
- MongoDB and Mongoose: For NoSQL database integration
- Sequelize: For SQL database integration
- Winston: For logging

## License

This project is proprietary software.

## Contributing

For internal use only. Please contact the repository owner for contribution guidelines.