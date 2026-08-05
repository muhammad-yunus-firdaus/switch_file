import type { ConverterFunction, ConversionKey, FileFormat } from '@/types';

/** Central registry mapping "source->target" keys to converter functions */
const converterRegistry = new Map<ConversionKey, ConverterFunction>();

/**
 * Register a converter function for a specific format pair.
 * @param from - Source format
 * @param to - Target format
 * @param converter - The async function that performs the conversion
 */
export function registerConverter(
  from: FileFormat,
  to: FileFormat,
  converter: ConverterFunction
): void {
  const key: ConversionKey = `${from}->${to}`;
  converterRegistry.set(key, converter);
}

/**
 * Get the converter function for a specific format pair.
 * Returns null if no converter is registered for this pair.
 */
export function getConverter(
  from: FileFormat,
  to: FileFormat
): ConverterFunction | null {
  const key: ConversionKey = `${from}->${to}`;
  return converterRegistry.get(key) ?? null;
}

/**
 * Check if a conversion pair is supported.
 */
export function isConversionSupported(
  from: FileFormat,
  to: FileFormat
): boolean {
  const key: ConversionKey = `${from}->${to}`;
  return converterRegistry.has(key);
}

/**
 * Get all registered conversion keys.
 */
export function getRegisteredConversions(): ConversionKey[] {
  return Array.from(converterRegistry.keys());
}

/**
 * Convert a file using the registered converter for its format pair.
 * Throws an error if no converter is registered.
 */
export async function convertFile(
  file: File,
  from: FileFormat,
  to: FileFormat,
  options?: Record<string, unknown>
): Promise<Blob> {
  const converter = getConverter(from, to);
  if (!converter) {
    throw new Error(
      `No converter registered for ${from.toUpperCase()} → ${to.toUpperCase()}`
    );
  }
  return converter(file, options);
}
