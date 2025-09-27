type SExpr = number | string | boolean | SExpr[];

/**
 * Parses a string containing an S-expression into a JavaScript array.
 */
export default function parseSexpr(s: string): SExpr {
  let i = 0;

  function parse(): SExpr {
    // 1. Skip any leading whitespace.
    while (/\s/.test(s[i])) i++;
    if (i >= s.length) {
      return false;
    }

    // 2. Check for the start of a list.
    if (s[i] === '(') {
      i++; // Consume the opening parenthesis '('.
      const list: SExpr[] = [];

      // Loop until we find the corresponding closing parenthesis ')'.
      // Skip whitespace before checking for the closing paren.
      while (/\s/.test(s[i])) i++;
      while (s[i] !== ')') {
        if (i >= s.length) {
          throw new Error('Syntax Error: Unmatched opening parenthesis.');
        }
        // Recursively call `parse` to get the next element in the list.
        // The recursive call will handle any necessary whitespace skipping.
        list.push(parse());

        // After parsing an element, skip whitespace before the next one.
        while (/\s/.test(s[i])) i++;
      }
      i++; // Consume the closing parenthesis ')'.
      return list;
    }

    // 3. If it's not a list, it must be an atom (a number or a string).

    // Guard against unexpected closing parentheses.
    const atomStart = s[i];
    if (atomStart === ')') {
      throw new Error('Syntax Error: Unexpected closing parenthesis ');
    }

    // 3.1. A string
    if (atomStart === '"') {
      let sb = '';
      let j = i + 1;
      let k = j;
      while (true) {
        if (s[k] === '"') {
          sb += s.substring(j, k);
          break;
        }
        if (s[k] === '\\') {
          sb += s.substring(j, k);
          k++;
          sb += s[k];
          j = k + 1;
        }
        k++;
      }
      i = k + 1;
      return sb;
    }

    const start = i;
    // An atom is terminated by whitespace or a parenthesis.
    while (i < s.length && !/\s|\(|\)/.test(s[i])) {
      i++;
    }
    const atom = s.substring(start, i);

    // Try to interpret the atom as a number.
    const num = parseFloat(atom);

    // If it's a valid number, return it. Otherwise, return it as a string.
    if (!isNaN(num) && isFinite(num)) {
      return num;
    } else if (atom === 't') {
      return true;
    } else if (atom === 'nil') {
      return false;
    }
    throw new Error(`Unknown atom: ${atom}`);
  }

  const result = parse();

  // After parsing is complete, check for any trailing characters.
  // Skip any final whitespace.
  while (i < s.length && /\s/.test(s[i])) i++;

  if (i < s.length) {
    throw new Error(`Syntax Error: Unexpected token at end of input: '${s.substring(i)}'`);
  }

  return result;
}
