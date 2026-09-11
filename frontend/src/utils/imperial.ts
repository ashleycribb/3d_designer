export function parseImperialToFeet(valStr: string): number | null {
  if (!valStr) return null;
  const val = valStr.trim();
  
  const num = parseFloat(val);
  if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(val)) {
    return num;
  }

  // Feet and inches like 24'-6", 24'-0", 24' 6", 24'
  const ftInMatch = val.match(/^(?:(\d+)\s*(?:'|ft))?\s*[-]?\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:"|in)?)?$/);
  if (ftInMatch && (ftInMatch[1] !== undefined || ftInMatch[2] !== undefined)) {
    let totalFeet = 0;
    if (ftInMatch[1]) totalFeet += parseFloat(ftInMatch[1]);
    if (ftInMatch[2]) totalFeet += parseInches(ftInMatch[2]) / 12.0;
    return totalFeet;
  }

  // Inches only like 8", 4 1/2"
  const inMatch = val.match(/^(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:"|in)$/);
  if (inMatch) {
    return parseInches(inMatch[1]) / 12.0;
  }

  return null;
}

function parseInches(str: string): number {
  str = str.trim();
  if (str.includes(' ')) {
    const [whole, frac] = str.split(' ');
    return parseFloat(whole) + parseFraction(frac);
  } else if (str.includes('/')) {
    return parseFraction(str);
  }
  return parseFloat(str);
}

function parseFraction(fracStr: string): number {
  const parts = fracStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (den !== 0) return num / den;
  }
  return 0;
}

export function formatFeetToImperial(feetVal: number | null | undefined): string {
  if (feetVal === null || feetVal === undefined || isNaN(feetVal)) return "0'-0\"";
  const isNeg = feetVal < 0;
  const absFeet = Math.abs(feetVal);

  let wholeFeet = Math.floor(absFeet);
  let remInches = (absFeet - wholeFeet) * 12.0;

  let wholeInches = Math.floor(remInches);
  const fracInch = remInches - wholeInches;

  let sixteenths = Math.round(fracInch * 16);
  if (sixteenths === 16) {
    wholeInches += 1;
    sixteenths = 0;
  }
  if (wholeInches === 12) {
    wholeFeet += 1;
    wholeInches = 0;
  }

  let fracStr = "";
  if (sixteenths > 0) {
    // Simplify sixteenths
    let num = sixteenths;
    let den = 16;
    if (num % 8 === 0) { num /= 8; den /= 8; }
    else if (num % 4 === 0) { num /= 4; den /= 4; }
    else if (num % 2 === 0) { num /= 2; den /= 2; }
    fracStr = ` ${num}/${den}`;
  }

  const sign = isNeg ? "-" : "";
  return `${sign}${wholeFeet}'-${wholeInches}${fracStr}"`;
}
