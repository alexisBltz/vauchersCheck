// src/nlp/training/data.ts

export interface TrainingExample {
  text: string;
  metadata?: {
    source?: string;
    confidence?: number;
    tags?: string[];
  };
}

export interface TrainingCategory {
  name: string;
  description: string;
  examples: TrainingExample[];
  patterns?: RegExp[];
}

export const trainingData: Record<string, TrainingCategory> = {
  amounts: {
    name: 'Amounts',
    description: 'Ejemplos para reconocimiento de montos y totales',
    examples: [
      {
        text: 'total a pagar',
        metadata: {
          confidence: 1.0,
          tags: ['total', 'principal']
        }
      },
      {
        text: 'S/',
        metadata: {
          confidence: 1.0,
          tags: ['amount']
        }
      },
      {
        text: 'importe total',
        metadata: {
          confidence: 1.0,
          tags: ['total']
        }
      },
      {
        text: 'monto final',
        metadata: {
          confidence: 0.9,
          tags: ['total']
        }
      },
      {
        text: 'subtotal',
        metadata: {
          confidence: 0.8,
          tags: ['parcial']
        }
      },
      {
        text: 'total sin igv',
        metadata: {
          confidence: 0.9,
          tags: ['parcial', 'impuestos']
        }
      }
    ],
    patterns: [
      /TOTAL\s*S\/\.?\s*(\d+[.,]\d{2})/i,
      /IMPORTE\s*S\/\.?\s*(\d+[.,]\d{2})/i,
      /S\/\.?\s*(\d+[.,]?\d*)/i,
      /\bS\/\s*(\d+[.,]?\d*)\b/i
    ]
  },

  dates: {
    name: 'Dates',
    description: 'Ejemplos para reconocimiento de fechas',
    examples: [
      {
        text: 'fecha de emisión',
        metadata: {
          confidence: 1.0,
          tags: ['emisión']
        }
      },
      {
        text: 'emitido el',
        metadata: {
          confidence: 0.9,
          tags: ['emisión']
        }
      },
      {
        text: 'fecha del comprobante',
        metadata: {
          confidence: 0.9,
          tags: ['documento']
        }
      },
      {
        text: '21 ene. 2025',
        metadata: {
          confidence: 0.9,
          tags: ['fecha']
        }
      }
    ],
    patterns: [
      /FECHA:?\s*(\d{2})[-/](\d{2})[-/](\d{2,4})/i,
      /(\d{2})([A-Za-z]{3})(\d{2,4})/,
      /(\d{1,2})\s*([A-Za-z]{3,})\.?\s*(\d{4})/i
    ]
  },

  merchants: {
    name: 'Merchants',
    description: 'Ejemplos para reconocimiento de comercios',
    examples: [
      {
        text: 'Ely F. Leguia O.',
        metadata: {
          confidence: 1.0,
          tags: ['nombre', 'persona']
        }
      },,
      {
        text: 'razón social',
        metadata: {
          confidence: 1.0,
          tags: ['empresa']
        }
      },
      {
        text: 'denominación',
        metadata: {
          confidence: 0.9,
          tags: ['empresa']
        }
      },
      {
        text: 'nombre comercial',
        metadata: {
          confidence: 0.9,
          tags: ['empresa']
        }
      }
    ],
    patterns: [
      /RAZÓN SOCIAL:?\s*([^\\n]+)/i,
      /DENOMINACIÓN:?\s*([^\\n]+)/i,
      /Destino:?\s*([^\n]+)/i
    ]
  },

  products: {
    name: 'Products',
    description: 'Ejemplos para reconocimiento de productos',
    examples: [
      {
        text: 'N° de operación: 06144082',
        metadata: {
          confidence: 1.0,
          tags: ['operación', 'número']
        }
      },
      {
        text: 'descripción del producto',
        metadata: {
          confidence: 0.9,
          tags: ['item']
        }
      },
      {
        text: 'cantidad',
        metadata: {
          confidence: 0.8,
          tags: ['item']
        }
      },
      {
        text: 'precio unitario',
        metadata: {
          confidence: 0.9,
          tags: ['item', 'precio']
        }
      }
    ],
    patterns: [
      /(\d+)\s*x\s*(\d+[.,]\d{2})/i,
      /UNIT\.\s*(\d+[.,]\d{2})/i,
      /N°\s*de\s*operación:?\s*(\d+)/i
    ]
  }
};

// Utilidades para acceder a los datos de entrenamiento
export class TrainingDataService {
  static getExamplesByCategory(category: string): TrainingExample[] {
    return trainingData[category]?.examples || [];
  }

  static getPatternsByCategory(category: string): RegExp[] {
    return trainingData[category]?.patterns || [];
  }

  static getAllPatterns(): Record<string, RegExp[]> {
    const patterns: Record<string, RegExp[]> = {};
    Object.entries(trainingData).forEach(([category, data]) => {
      if (data.patterns) {
        patterns[category] = data.patterns;
      }
    });
    return patterns;
  }

  static addExample(category: string, example: TrainingExample): void {
    if (!trainingData[category]) {
      throw new Error(`Category ${category} does not exist`);
    }
    trainingData[category].examples.push(example);
  }

  static addPattern(category: string, pattern: RegExp): void {
    if (!trainingData[category]) {
      throw new Error(`Category ${category} does not exist`);
    }
    if (!trainingData[category].patterns) {
      trainingData[category].patterns = [];
    }
    trainingData[category].patterns.push(pattern);
  }
}