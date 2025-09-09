const { ExamPDFParserWithImages } = require('../lib/exam_pdf_parser');
const constants = require('../constants');
const Format = require('response-format');
const { logger } = require('../lib');

const parserClass = function () {
    this.examParserClient = new ExamPDFParserWithImages();
};

parserClass.prototype.constructor = parserClass;

parserClass.prototype.parse = async function (file, documentType = constants.documentType.EXAM) {
    try {
        let result;
        switch (documentType) {
            case constants.documentType.EXAM:
                result = await this.examParserClient.processPDFWithImages(file.buffer);
                break;
        }

        if (!result) return Format.badRequest('Unsupported document type');

        logger.info(`Processing completed: ${result.processingId}`);

        return Format.success(null, result);
    } catch (e) {
        throw new Error(e);
    }
};
module.exports = parserClass;
