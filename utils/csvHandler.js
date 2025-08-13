// CSV handling utility for the Call Manager application
// Provides CSV parsing, validation, and generation functionality

const fastcsv = require('fast-csv');
const fs = require('fs');
const path = require('path');
const { validateData, sanitizeData } = require('./validation');
const { callerSchemas } = require('./validation');
const logger = require('./logger');

class CSVHandler {
  constructor() {
    this.maxRows = 200;
    this.requiredColumns = ['name', 'email', 'phone'];
  }

  // Parse CSV file and validate data
  async parseCSV(filePath) {
    try {
      const rows = [];
      const errors = [];
      let rowNumber = 0;

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(fastcsv.parse({ headers: true, skipRows: 0 }))
          .on('data', (row) => {
            rowNumber++;
            
            // Check row limit
            if (rowNumber > this.maxRows) {
              errors.push({
                row: rowNumber,
                field: 'limit',
                message: `Row exceeds maximum limit of ${this.maxRows} rows`
              });
              return;
            }

            // Validate required columns exist
            const missingColumns = this.requiredColumns.filter(col => !row.hasOwnProperty(col));
            if (missingColumns.length > 0) {
              errors.push({
                row: rowNumber,
                field: 'columns',
                message: `Missing required columns: ${missingColumns.join(', ')}`
              });
              return;
            }

            // Sanitize row data
            const sanitizedRow = sanitizeData(row);

            // Validate row data against schema
            const validation = validateData(callerSchemas.csvRow, sanitizedRow);
            if (!validation.success) {
              validation.errors.forEach(error => {
                errors.push({
                  row: rowNumber,
                  field: error.field,
                  message: error.message,
                  value: row[error.field]
                });
              });
              return;
            }

            rows.push({
              rowNumber,
              data: sanitizedRow
            });
          })
          .on('end', () => {
            resolve({
              success: errors.length === 0,
              rows,
              errors,
              totalRows: rowNumber
            });
          })
          .on('error', (error) => {
            reject(new Error(`CSV parsing error: ${error.message}`));
          });
      });
    } catch (error) {
      logger.error('Error parsing CSV file:', { filePath, error: error.message });
      throw error;
    }
  }

  // Generate CSV template with headers only
  generateTemplate() {
    try {
      const headers = this.requiredColumns;
      const csvContent = fastcsv.format({ headers });
      
      logger.upload('CSV template generated successfully');
      return csvContent;
    } catch (error) {
      logger.error('Error generating CSV template:', error);
      throw error;
    }
  }

  // Generate CSV with invalid rows for download
  generateErrorCSV(errors) {
    try {
      if (!Array.isArray(errors) || errors.length === 0) {
        throw new Error('No errors provided for error CSV generation');
      }

      // Add headers for error CSV
      const headers = ['row', 'field', 'message', 'value'];
      const csvContent = fastcsv.format({ headers });
      
      // Add error rows
      errors.forEach(error => {
        csvContent.write({
          row: error.row,
          field: error.field,
          message: error.message,
          value: error.value || ''
        });
      });

      csvContent.end();
      logger.upload(`Error CSV generated with ${errors.length} rows`);
      return csvContent;
    } catch (error) {
      logger.error('Error generating error CSV:', error);
      throw error;
    }
  }

  // Validate CSV file before processing
  async validateCSVFile(file) {
    try {
      // Check file type
      if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
        return {
          success: false,
          errors: [{
            field: 'file',
            message: 'Only CSV files are allowed'
          }]
        };
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return {
          success: false,
          errors: [{
            field: 'file',
            message: 'File size must be less than 5MB'
          }]
        };
      }

      // Check if file exists and is readable
      if (!fs.existsSync(file.path)) {
        return {
          success: false,
          errors: [{
            field: 'file',
            message: 'File not found or not readable'
          }]
        };
      }

      return { success: true, errors: [] };
    } catch (error) {
      logger.error('Error validating CSV file:', { file: file.originalname, error: error.message });
      return {
        success: false,
        errors: [{
          field: 'file',
          message: 'File validation failed'
        }]
      };
    }
  }

  // Process CSV file and return results
  async processCSV(filePath) {
    try {
      // Parse and validate CSV
      const parseResult = await this.parseCSV(filePath);
      
      if (!parseResult.success) {
        return {
          success: false,
          validRows: [],
          invalidRows: parseResult.errors,
          totalRows: parseResult.totalRows,
          message: `CSV processing failed with ${parseResult.errors.length} errors`
        };
      }

      // Check for duplicates within the file
      const duplicates = this.findDuplicates(parseResult.rows);
      if (duplicates.length > 0) {
        duplicates.forEach(duplicate => {
          parseResult.errors.push({
            row: duplicate.rowNumber,
            field: 'duplicate',
            message: `Duplicate entry found in row ${duplicate.duplicateRowNumber}`,
            value: `${duplicate.data.email} / ${duplicate.data.phone}`
          });
        });
      }

      // Separate valid and invalid rows
      const validRows = parseResult.rows.filter(row => 
        !parseResult.errors.some(error => error.row === row.rowNumber)
      );

      return {
        success: parseResult.errors.length === 0,
        validRows: validRows.map(row => row.data),
        invalidRows: parseResult.errors,
        totalRows: parseResult.totalRows,
        message: parseResult.errors.length === 0 
          ? `CSV processed successfully: ${validRows.length} valid rows`
          : `CSV processing completed with ${parseResult.errors.length} errors`
      };
    } catch (error) {
      logger.error('Error processing CSV file:', { filePath, error: error.message });
      throw error;
    }
  }

  // Find duplicate entries within CSV data
  findDuplicates(rows) {
    const duplicates = [];
    const seen = new Map();

    rows.forEach(row => {
      const key = `${row.data.email.toLowerCase()}-${row.data.phone}`;
      
      if (seen.has(key)) {
        duplicates.push({
          rowNumber: row.rowNumber,
          duplicateRowNumber: seen.get(key),
          data: row.data
        });
      } else {
        seen.set(key, row.rowNumber);
      }
    });

    return duplicates;
  }

  // Clean up temporary files
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.upload(`Temporary file cleaned up: ${filePath}`);
      }
    } catch (error) {
      logger.error('Error cleaning up temporary file:', { filePath, error: error.message });
    }
  }

  // Get CSV processing statistics
  getProcessingStats(validRows, invalidRows, totalRows) {
    const successRate = totalRows > 0 ? ((validRows.length / totalRows) * 100).toFixed(2) : 0;
    
    return {
      totalRows,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString()
    };
  }

  // Export data to CSV
  exportToCSV(data, headers) {
    try {
      const csvContent = fastcsv.format({ headers });
      
      data.forEach(row => {
        csvContent.write(row);
      });

      csvContent.end();
      logger.upload(`Data exported to CSV: ${data.length} rows`);
      return csvContent;
    } catch (error) {
      logger.error('Error exporting data to CSV:', error);
      throw error;
    }
  }
}

module.exports = new CSVHandler();
