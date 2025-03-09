/**
 * Joins the items in the array with commas, adding an 'and' before the last item
 * e.g. ['James', 'Clark', 'Alex'] => 'James, Clark and Alex
 *
 * @param values The values to join
 * @param word The word to add before the final item in the list (defaults to 'and')
 */
export const joinWithWord = (values: string[], word = 'and'): string => {
  if (values.length <= 1) {
    return values.join('');
  } else if (values.length === 2) {
    return values.join(` ${word} `);
  } else {
    const clone = [...values];
    const lastItem = clone.pop();
    return clone.join(', ') + ` ${word} ` + lastItem;
  }
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
