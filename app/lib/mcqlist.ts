// Helper function to safely parse question options
export const safeParseOptions = (options: any): string[] => {
  try {
    if (Array.isArray(options)) {
      return options;
    }
    if (typeof options === "string") {
      const parsed = JSON.parse(options || "[]");
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error("Error parsing question options:", error);
    return [];
  }
};
