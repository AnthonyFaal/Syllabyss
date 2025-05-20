export async function fetchInterestData() {
  const response = await fetch('/data.json'); // <- This should work when data.json is in public/
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
}
