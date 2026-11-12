// Retail codes remain strings. OFF normalizes UPC-A/EAN padding on reads.
export const normalizeBarcode = (value: unknown): string => typeof value === 'string' && /^\d+$/.test(value.trim()) ? value.trim() : '';
export const isRetailBarcode = (value: unknown): boolean => {
 const code=normalizeBarcode(value);
 if(!/^(?:\d{8}|\d{12,14})$/.test(code)||/^0+$/.test(code))return false;
 return [...code].reverse().reduce((sum,digit,index)=>sum+Number(digit)*(index%2===0?1:3),0)%10===0;
};
export const barcodeIdentity = (value: unknown): string => normalizeBarcode(value).replace(/^0+(?=\d)/, '');
export const sameBarcode = (requested: unknown, returned: unknown): boolean => isRetailBarcode(requested) && isRetailBarcode(returned) && barcodeIdentity(requested) === barcodeIdentity(returned);
