// utils/FromJson.js
export const getFromJson = async (key) => {
  try {
    const response = await fetch('/data.json'); // served from public/
    if (!response.ok) {
      throw new Error('Failed to fetch data.json');
    }
    const json = await response.json();
    return json[key] || [];
  } catch (error) {
    console.error("❌ Failed to load JSON:", error);
    return [];
  }
};
