// utils/sort.js
function sortResults(results, { orderBy, order = 'ASC', caseSensitive = false }) {
  if (!orderBy || !results.length || results[0][orderBy] === undefined) {
    return results;
  }

  const direction = order.toUpperCase() === 'DESC' ? -1 : 1;

  return [...results].sort((a, b) => {
    let valueA = a[orderBy];
    let valueB = b[orderBy];

    if (valueA == null) return direction;
    if (valueB == null) return -direction;

    if (!caseSensitive && typeof valueA === 'string' && typeof valueB === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    if (valueA < valueB) return -direction;
    if (valueA > valueB) return direction;
    return 0;
  });
}

module.exports = { sortResults };
