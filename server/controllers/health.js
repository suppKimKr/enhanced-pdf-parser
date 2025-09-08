const express = require('express');
const { wrapRouter, uploadHandler } = require('../middleware');
const {requestCombined, validAny, logger} = require("../lib");
const {EnhancedPDFParserWithImages} = require("../lib/enhanced_pdf_parser");
const Format = require("response-format");
const uploadDoc = uploadHandler('pdf');

const router = wrapRouter(express.Router());

router.get('/', async (req, res) => {
    res.sendStatus(200);
});

router.post('/parse', [validAny, requestCombined, uploadDoc.single('file')], async (req, res) => {
    const parser = new EnhancedPDFParserWithImages(config);

    console.log(req.file);
    const result = await parser.processPDFWithImages(req.file.buffer, {
        documentType: 'exam' // or 'auto', 'textbook', etc.
    });

    logger.info(`Processing completed: ${result.processingId}`);
    logger.info(`Found ${result.questions.length} questions and ${result.allImages.length} images`);

    res.json(Format.success(null, result));
});

module.exports = router;
