// CSV handler for the Call Manager application
// Provides CSV template download and validation with configurable file size limit

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateData, uploadSchemas, callerSchemas } from './validation.js';
import config from '../config/index.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSVHandler {
  constructor() {
    this.templatesDir = path.join(__dirname, '../public/templates');
    this.maxFileSize = config.upload.maxFileSize;
    this.ensureTemplatesDirectory();
  }

  // Ensure templates directory exists
  ensureTemplatesDirectory() {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  // Create CSV template file
  createTemplate() {
    try {
      const headers = ['name', 'email', 'phone', 'batch_id'];
      const csvContent = headers.join(',') + '\n';
      
      const templatePath = path.join(this.templatesDir, 'caller_template.csv');
      fs.writeFileSync(templatePath, csvContent);
      
      logger.info('CSV template created successfully');
      return templatePath;
    } catch (error) {
      logger.error('Error creating CSV template:', error);
      throw error;
    }
  }

  // Get template file path
  getTemplatePath() {
    const templatePath = path.join(this.templatesDir, 'caller_template.csv');
    
    // Create template if it doesn't exist
    if (!fs.existsSync(templatePath)) {
      this.createTemplate();
    }
    
    return templatePath;
  }

  // Download template
  downloadTemplate(res) {
    try {
      const templatePath = this.getTemplatePath();
      const fileName = 'caller_template.csv';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(templatePath);
      fileStream.pipe(res);
      
      logger.info('CSV template downloaded successfully');
    } catch (error) {
      logger.error('Error downloading CSV template:', error);
      res.status(500).send('Error downloading template');
    }
  }

  // Validate uploaded CSV file
  validateCSVFile(file) {
    try {
      // Validate file using Zod schema with configurable file size limit
      const validation = validateData(uploadSchemas.csvUpload, { file });
      
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      return { success: true, errors: [] };
    } catch (error) {
      logger.error('Error validating CSV file:', error);
      return {
        success: false,
        errors: [{
          field: 'file',
          message: 'File validation failed'
        }]
      };
    }
  }

  // Parse and validate CSV content
  async parseCSVContent(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return {
          success: false,
          errors: [{ field: 'file', message: 'CSV file must contain headers and at least one data row' }],
          data: []
        };
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const requiredHeaders = ['name', 'email', 'phone'];
      
      // Check if required headers exist
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        return {
          success: false,
          errors: [{ field: 'file', message: `Missing required headers: ${missingHeaders.join(', ')}` }],
          data: []
        };
      }

      const data = [];
      const errors = [];
      
      // Parse data rows (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Validate each row using Zod schema
        const rowValidation = validateData(callerSchemas.csvRow, row);
        if (!rowValidation.success) {
          errors.push({
            row: i + 1,
            errors: rowValidation.errors
          });
        } else {
          data.push(rowValidation.data);
        }
      }

      return {
        success: errors.length === 0,
        data,
        errors,
        totalRows: lines.length - 1
      };
    } catch (error) {
      logger.error('Error parsing CSV content:', error);
      return {
        success: false,
        errors: [{ field: 'file', message: 'Failed to parse CSV file' }],
        data: []
      };
    }
  }

  // Process uploaded CSV file
  async processCSVUpload(file) {
    try {
      // First validate the file
      const fileValidation = this.validateCSVFile(file);
      if (!fileValidation.success) {
        return fileValidation;
      }

      // Parse and validate CSV content
      const parseResult = await this.parseCSVContent(file.path);
      
      // Clean up temporary file
      this.cleanupTempFile(file.path);
      
      return parseResult;
    } catch (error) {
      logger.error('Error processing CSV upload:', error);
      this.cleanupTempFile(file.path);
      
      return {
        success: false,
        errors: [{ field: 'file', message: 'Failed to process CSV file' }],
        data: []
      };
    }
  }

  // Clean up temporary file
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Temporary file cleaned up: ${filePath}`);
      }
    } catch (error) {
      logger.error('Error cleaning up temporary file:', { filePath, error: error.message });
    }
  }

  // Get file size limit in human readable format
  getFileSizeLimit() {
    const sizeInMB = this.maxFileSize / (1024 * 1024);
    return `${sizeInMB}MB`;
  }
}

export default new CSVHandler();
