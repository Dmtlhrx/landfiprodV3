// services/aiVerification.ts
import { createHash } from 'crypto';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import Tesseract from 'tesseract.js';
import { logger } from '../utils/logger.js';

interface ExtractedEntity {
  type: 'name' | 'date' | 'number' | 'email' | 'phone' | 'address' | 
        'cadastral_reference' | 'gps_coordinate' | 'area' | 'geological_zone' | 
        'land_use' | 'property_type' | 'owner_info';
  value: string;
  confidence: number;
}

interface VerificationResult {
  isAuthentic: boolean;
  confidenceScore: number;
  manipulationDetected: boolean;
  findings: string[];
  extractedData: Record<string, any>;
  extractedEntities: ExtractedEntity[];
  risks: string[];
  timestamp: string;
  technicalDetails: {
    fileHash: string;
    metadata: any;
    anomalies: string[];
  };
}

export class AIVerificationService {
  /**
   * Verifies document authenticity
   */
  async verifyDocument(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<VerificationResult> {
    logger.info(`🤖 Starting AI verification for: ${filename}`);

    const findings: string[] = [];
    const risks: string[] = [];
    const anomalies: string[] = [];
    let confidenceScore = 100;
    let manipulationDetected = false;

    try {
      // 1. File integrity hash
      const fileHash = this.calculateFileHash(fileBuffer);
      findings.push('Digital fingerprint generated successfully');

      // 2. EXIF metadata analysis
      const metadataAnalysis = await this.analyzeMetadata(fileBuffer, mimeType);
      findings.push(...metadataAnalysis.findings);
      anomalies.push(...metadataAnalysis.anomalies);
      confidenceScore -= metadataAnalysis.suspicionScore;

      if (metadataAnalysis.edited) {
        manipulationDetected = true;
        risks.push('Metadata indicates software modification');
      }

      // 3. Compression analysis (ELA)
      if (mimeType.startsWith('image/')) {
        const compressionAnalysis = await this.analyzeCompression(fileBuffer);
        findings.push(...compressionAnalysis.findings);
        anomalies.push(...compressionAnalysis.anomalies);
        confidenceScore -= compressionAnalysis.suspicionScore;

        if (compressionAnalysis.manipulated) {
          manipulationDetected = true;
          risks.push('Inconsistent compression zones detected');
        }
      }

      // 4. Clone/copy-paste detection
      if (mimeType.startsWith('image/')) {
        const cloneAnalysis = await this.detectCloning(fileBuffer);
        findings.push(...cloneAnalysis.findings);
        
        if (cloneAnalysis.cloningDetected) {
          manipulationDetected = true;
          risks.push('Image area duplication detected (cloning)');
          confidenceScore -= 25;
        }
      }

      // 5. Lighting consistency analysis
      if (mimeType.startsWith('image/')) {
        const lightingAnalysis = await this.analyzeLighting(fileBuffer);
        findings.push(...lightingAnalysis.findings);
        
        if (lightingAnalysis.inconsistent) {
          risks.push('Lighting inconsistency detected');
          confidenceScore -= 15;
        }
      }

      // 6. OCR and entity extraction
      const { extractedData, extractedEntities } = await this.extractData(fileBuffer, mimeType);

      // Final score
      confidenceScore = Math.max(0, Math.min(100, confidenceScore));
      const isAuthentic = confidenceScore >= 70 && !manipulationDetected;

      const result: VerificationResult = {
        isAuthentic,
        confidenceScore: Math.round(confidenceScore),
        manipulationDetected,
        findings,
        extractedData,
        extractedEntities,
        risks,
        timestamp: new Date().toISOString(),
        technicalDetails: {
          fileHash,
          metadata: metadataAnalysis.metadata,
          anomalies,
        },
      };

      logger.info(`✅ AI verification completed: ${confidenceScore}% authentic`);
      return result;

    } catch (error) {
      logger.error('AI verification error:', error);
      throw new Error(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates SHA-256 file hash
   */
  private calculateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Analyzes EXIF metadata for modifications - FIX: Utiliser les bons noms de propriétés
   */


/**
 * Analyzes EXIF metadata for modifications
 */
private async analyzeMetadata(
  buffer: Buffer,
  mimeType: string
): Promise<{
  findings: string[];
  anomalies: string[];
  suspicionScore: number;
  edited: boolean;
  metadata: any;
}> {
  const findings: string[] = [];
  const anomalies: string[] = [];
  let suspicionScore = 0;
  let edited = false;
  let metadata: any = {};

  try {
    if (!mimeType.startsWith('image/')) {
      findings.push('Non-image document, EXIF analysis not applicable');
      return { findings, anomalies, suspicionScore, edited, metadata };
    }

    const image = sharp(buffer);
    const imageMetadata = await image.metadata();
    
    if (imageMetadata.exif) {
      try {
        const exifData = exifReader(imageMetadata.exif);
        metadata = exifData;

        // Check for editing software
        if (exifData.Image?.Software) {
          const software = String(exifData.Image.Software).toLowerCase();
          
          if (software.includes('photoshop') || 
              software.includes('gimp') || 
              software.includes('adobe')) {
            edited = true;
            anomalies.push(`Document edited with: ${exifData.Image.Software}`);
            suspicionScore += 30;
          } else {
            findings.push(`Device/Software: ${exifData.Image.Software}`);
          }
        }

        // Check date consistency - handle EXIF tag types properly
        if (exifData.Photo?.DateTimeOriginal && exifData.Image?.ModifyDate) {
          try {
            // EXIF dates can be strings or arrays, convert to string first
            const originalDateValue = exifData.Photo.DateTimeOriginal;
            const modifyDateValue = exifData.Image.ModifyDate;
            
            // Convert to string if it's an array or other type
            const originalStr = Array.isArray(originalDateValue) 
              ? originalDateValue.join('') 
              : String(originalDateValue);
            const modifyStr = Array.isArray(modifyDateValue)
              ? modifyDateValue.join('')
              : String(modifyDateValue);
            
            // Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
            const parseExifDate = (dateStr: string): Date | null => {
              try {
                const cleaned = dateStr.replace(/[^\d\s:]/g, '');
                const parts = cleaned.split(/[\s:]+/);
                if (parts.length >= 6) {
                  const [year, month, day, hour, minute, second] = parts.map(Number);
                  return new Date(year, month - 1, day, hour, minute, second);
                }
                return null;
              } catch {
                return null;
              }
            };

            const original = parseExifDate(originalStr);
            const modified = parseExifDate(modifyStr);
            
            if (original && modified && modified < original) {
              anomalies.push('Modification date before original date');
              suspicionScore += 20;
            }
          } catch (dateError) {
            logger.debug('Date parsing error:', dateError);
            // Don't fail the whole analysis for date parsing issues
          }
        }

        // Check for GPS data - use proper property access
        const gpsData = (exifData as any).gps || (exifData as any).GPS;
        if (gpsData && Object.keys(gpsData).length > 0) {
          findings.push('GPS data present (increases authenticity)');
          suspicionScore -= 5;
        } else {
          findings.push('No GPS data found');
        }

      } catch (exifError) {
        logger.debug('EXIF parsing error:', exifError);
        anomalies.push('EXIF read error - metadata possibly corrupted');
        suspicionScore += 15;
      }
    } else {
      findings.push('No EXIF metadata found');
      anomalies.push('Missing EXIF metadata (suspicious for recent photo)');
      suspicionScore += 10;
    }

  } catch (error) {
    logger.error('Metadata analysis error:', error);
    findings.push('Metadata analysis failed');
  }

  return { findings, anomalies, suspicionScore, edited, metadata };
}

  /**
   * Compression analysis (ELA - Error Level Analysis)
   */
  private async analyzeCompression(
    buffer: Buffer
  ): Promise<{
    findings: string[];
    anomalies: string[];
    suspicionScore: number;
    manipulated: boolean;
  }> {
    const findings: string[] = [];
    const anomalies: string[] = [];
    let suspicionScore = 0;
    let manipulated = false;

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const recompressed = await image
        .jpeg({ quality: 90 })
        .toBuffer();

      const originalSize = buffer.length;
      const recompressedSize = recompressed.length;
      const sizeRatio = recompressedSize / originalSize;

      if (sizeRatio > 1.2 || sizeRatio < 0.8) {
        anomalies.push('Unusual compression ratio detected');
        suspicionScore += 20;
        manipulated = true;
      } else {
        findings.push('Consistent compression profile');
      }

      if (metadata.format === 'jpeg') {
        findings.push('Standard JPEG format detected');
        
        const quality = this.estimateJpegQuality(buffer);
        if (quality && (quality < 70 || quality > 95)) {
          anomalies.push(`Unusual JPEG quality: ${quality}%`);
          suspicionScore += 10;
        }
      }

    } catch (error) {
      logger.error('Compression analysis error:', error);
      findings.push('Compression analysis failed');
    }

    return { findings, anomalies, suspicionScore, manipulated };
  }

  /**
   * Estimates JPEG quality
   */
  private estimateJpegQuality(buffer: Buffer): number | null {
    try {
      const hex = buffer.toString('hex');
      const dqtMarker = 'ffdb';
      const index = hex.indexOf(dqtMarker);
      
      if (index === -1) return null;

      const qtValues = hex.substring(index + 8, index + 20);
      const avgValue = parseInt(qtValues.substring(0, 2), 16);
      
      return Math.round(100 - (avgValue * 1.5));
    } catch {
      return null;
    }
  }

  /**
   * Detects cloning of areas (copy-paste)
   */
  private async detectCloning(
    buffer: Buffer
  ): Promise<{
    findings: string[];
    cloningDetected: boolean;
  }> {
    const findings: string[] = [];
    let cloningDetected = false;

    try {
      const image = sharp(buffer);
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

      const blockSize = 16;
      const blocks = this.extractImageBlocks(data, info.width, info.height, blockSize);
      const duplicates = this.findDuplicateBlocks(blocks);

      if (duplicates > 5) {
        cloningDetected = true;
        findings.push(`${duplicates} potentially cloned zones detected`);
      } else {
        findings.push('No obvious cloning detected');
      }

    } catch (error) {
      logger.error('Cloning detection error:', error);
      findings.push('Cloning detection failed');
    }

    return { findings, cloningDetected };
  }

  /**
   * Extracts image blocks for analysis
   */
  private extractImageBlocks(
    data: Buffer,
    width: number,
    height: number,
    blockSize: number
  ): string[] {
    const blocks: string[] = [];
    const channels = 3;

    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        let blockHash = '';
        
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const pixelIndex = ((y + by) * width + (x + bx)) * channels;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            blockHash += `${r},${g},${b};`;
          }
        }
        
        blocks.push(createHash('md5').update(blockHash).digest('hex'));
      }
    }

    return blocks;
  }

  /**
   * Finds duplicate blocks
   */
  private findDuplicateBlocks(blocks: string[]): number {
    const seen = new Set<string>();
    let duplicates = 0;

    for (const block of blocks) {
      if (seen.has(block)) {
        duplicates++;
      } else {
        seen.add(block);
      }
    }

    return duplicates;
  }

  /**
   * Analyzes lighting consistency
   */
  private async analyzeLighting(
    buffer: Buffer
  ): Promise<{
    findings: string[];
    inconsistent: boolean;
  }> {
    const findings: string[] = [];
    let inconsistent = false;

    try {
      const image = sharp(buffer);
      const { data, info } = await image
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const quadrants = this.divideIntoQuadrants(data, info.width, info.height);
      const avgBrightness = quadrants.map(q => this.calculateAverageBrightness(q));

      const mean = avgBrightness.reduce((a, b) => a + b) / avgBrightness.length;
      const variance = avgBrightness.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgBrightness.length;

      if (variance > 2000) {
        inconsistent = true;
        findings.push(`High lighting variance: ${Math.round(variance)}`);
      } else {
        findings.push('Consistent lighting across document');
      }

    } catch (error) {
      logger.error('Lighting analysis error:', error);
      findings.push('Lighting analysis failed');
    }

    return { findings, inconsistent };
  }

  /**
   * Divides image into quadrants
   */
  private divideIntoQuadrants(data: Buffer, width: number, height: number): Buffer[] {
    const quadrants: Buffer[] = [];
    quadrants.push(data.subarray(0, Math.floor(data.length / 4)));
    quadrants.push(data.subarray(Math.floor(data.length / 4), Math.floor(data.length / 2)));
    quadrants.push(data.subarray(Math.floor(data.length / 2), Math.floor(data.length * 3 / 4)));
    quadrants.push(data.subarray(Math.floor(data.length * 3 / 4)));

    return quadrants;
  }

  /**
   * Calculates average brightness
   */
  private calculateAverageBrightness(data: Buffer): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }

  /**
   * Extracts text and entities from document using OCR
   */
  private async extractData(
    buffer: Buffer,
    mimeType: string
  ): Promise<{
    extractedData: Record<string, any>;
    extractedEntities: ExtractedEntity[];
  }> {
    const extractedData: Record<string, any> = {};
    const extractedEntities: ExtractedEntity[] = [];

    try {
      extractedData.fileSize = buffer.length;
      extractedData.mimeType = mimeType;
      extractedData.documentType = this.guessDocumentType(mimeType);

      if (mimeType.startsWith('image/')) {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        extractedData.dimensions = {
          width: metadata.width,
          height: metadata.height,
        };
        extractedData.format = metadata.format;
        extractedData.hasAlpha = metadata.hasAlpha;

        // OCR extraction using Tesseract
        logger.info('Starting OCR extraction...');
        const ocrResult = await this.performOCR(buffer);
        
        extractedData.ocrText = ocrResult.text;
        extractedData.ocrConfidence = ocrResult.confidence;

        // Extract named entities
        const entities = this.extractEntities(ocrResult.text);
        extractedEntities.push(...entities);
      }

    } catch (error) {
      logger.error('Data extraction error:', error);
    }

    return { extractedData, extractedEntities };
  }

  /**
   * Performs OCR on image buffer
   */
  private async performOCR(buffer: Buffer): Promise<{
    text: string;
    confidence: number;
  }> {
    try {
      const result = await Tesseract.recognize(buffer, 'eng+fra', {
        logger: (m: any) => logger.debug(`OCR: ${m.status} ${m.progress}`),
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      logger.error('OCR error:', error);
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Extracts named entities from text
   */
  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Date pattern
    const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;
    let match;
    while ((match = datePattern.exec(text)) !== null) {
      entities.push({
        type: 'date',
        value: match[0],
        confidence: 0.95,
      });
    }

    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern) || [];
    emails.forEach(email => {
      entities.push({
        type: 'email',
        value: email,
        confidence: 0.95,
      });
    });

    // Phone pattern
    const phonePattern = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const phones = text.match(phonePattern) || [];
    phones.forEach(phone => {
      entities.push({
        type: 'phone',
        value: phone,
        confidence: 0.85,
      });
    });

    // CADASTRAL REFERENCES
    const cadastralPattern = /(?:lot|parcel|section|plot)\s*(?:no\.?|#)?\s*([A-Z0-9\-]+)/gi;
    while ((match = cadastralPattern.exec(text)) !== null) {
      entities.push({
        type: 'cadastral_reference',
        value: match[0],
        confidence: 0.9,
      });
    }

    // GPS COORDINATES
    const gpsDecimalPattern = /\b(-?\d{1,3}\.\d{4,})[,\s]+(-?\d{1,3}\.\d{4,})\b/g;
    while ((match = gpsDecimalPattern.exec(text)) !== null) {
      entities.push({
        type: 'gps_coordinate',
        value: `${match[1]}, ${match[2]}`,
        confidence: 0.95,
      });
    }

    // AREA/SURFACE
    const areaPattern = /(\d+\.?\d*)\s*(m²|m2|hectare|ha|acre|sq\.?ft|square feet)/gi;
    while ((match = areaPattern.exec(text)) !== null) {
      entities.push({
        type: 'area',
        value: match[0],
        confidence: 0.9,
      });
    }

    // GEOLOGICAL ZONES
    const geologicalZones = [
      'clay', 'sandy', 'loamy', 'peat', 'gravel', 'limestone', 'basalt', 'granite',
      'soil type', 'bedrock', 'alluvial', 'colluvial', 'fluvial', 'volcanic',
      'sedimentary', 'metamorphic', 'igneous', 'Zone A', 'Zone B', 'Zone C', 'Zone D',
      'flood zone', 'wetland', 'marshland', 'podzol', 'chernozem'
    ];
    const geologicalPattern = new RegExp(`\\b(${geologicalZones.join('|')})\\b`, 'gi');
    const geologicalMatches = text.match(geologicalPattern) || [];
    geologicalMatches.forEach(zone => {
      entities.push({
        type: 'geological_zone',
        value: zone,
        confidence: 0.8,
      });
    });

    // LAND USE
    const landUseTerms = [
      'agricultural', 'residential', 'commercial', 'industrial', 'mixed use',
      'forest', 'pasture', 'cultivated', 'built-up', 'urban', 'rural',
      'nature reserve', 'protected area', 'green space', 'bare land'
    ];
    const landUsePattern = new RegExp(`\\b(${landUseTerms.join('|')})\\b`, 'gi');
    const landUseMatches = text.match(landUsePattern) || [];
    landUseMatches.forEach(use => {
      entities.push({
        type: 'land_use',
        value: use,
        confidence: 0.85,
      });
    });

    // PROPERTY TYPE
    const propertyTypes = [
      'house', 'villa', 'apartment', 'building', 'farm', 'barn', 'warehouse',
      'industrial plant', 'commercial space', 'office', 'garage', 'garden shed',
      'orchard', 'vineyard', 'plantation', 'cottage', 'mansion'
    ];
    const propertyPattern = new RegExp(`\\b(${propertyTypes.join('|')})\\b`, 'gi');
    const propertyMatches = text.match(propertyPattern) || [];
    propertyMatches.forEach(prop => {
      entities.push({
        type: 'property_type',
        value: prop,
        confidence: 0.85,
      });
    });

    // OWNER INFO
    const ownerPattern = /(?:owner|proprietor|holder|landowner|landlord)[\s:]*([A-Z][A-Za-z\s]+)/gi;
    while ((match = ownerPattern.exec(text)) !== null) {
      entities.push({
        type: 'owner_info',
        value: match[0],
        confidence: 0.8,
      });
    }

    // Number pattern
    const numberPattern = /\b\d{6,}\b/g;
    const numbers = text.match(numberPattern) || [];
    numbers.forEach(number => {
      entities.push({
        type: 'number',
        value: number,
        confidence: 0.6,
      });
    });

    // Address pattern
    const addressPattern = /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi;
    const addresses = text.match(addressPattern) || [];
    addresses.forEach(address => {
      entities.push({
        type: 'address',
        value: address,
        confidence: 0.75,
      });
    });

    // Name pattern
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const names = text.match(namePattern) || [];
    names.forEach(name => {
      if (name.length > 2 && !this.isCadastralTerm(name)) {
        entities.push({
          type: 'name',
          value: name,
          confidence: 0.7,
        });
      }
    });

    return entities;
  }

  /**
   * Checks if a term is cadastral/technical terminology
   */
  private isCadastralTerm(term: string): boolean {
    const cadastralTerms = [
      'Section', 'Lot', 'Block', 'Plot', 'Parcel', 'Survey', 'Map', 'Zone',
      'Township', 'Range', 'Quarter', 'Subdivision', 'Amendment'
    ];
    return cadastralTerms.some(t => t.toLowerCase() === term.toLowerCase());
  }

  /**
   * Guesses document type based on mime type
   */
  private guessDocumentType(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'PDF Document';
    if (mimeType.startsWith('image/')) return 'Image/Photo';
    return 'Document';
  }
}

export const aiVerificationService = new AIVerificationService();