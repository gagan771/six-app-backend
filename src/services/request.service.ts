export function generateConnectionHighlight({
  degree,
  mutuals,
  keywords,
  postOwnerName,
}: {
  degree: number;
  mutuals: number;
  keywords: string[]; 
  postOwnerName: string;
}): string {
  const mutualText = mutuals === 1 ? "1 mutual" : `${mutuals} mutuals`;
  const degreeText = `${degree}${getOrdinalSuffix(degree)} degree`;
  const keywordText = keywords.length
    ? `who ${formatKeywordText(keywords)}`
    : "";

  return `hey ${postOwnerName}! ur ${degreeText} w ${mutualText} ${keywordText} is interested in your post`;
}

// Helpers
function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatKeywordText(keywords: string[]): string {
  if (keywords.length === 1) return `likes ${keywords[0]}`;
  if (keywords.length === 2) return `likes ${keywords[0]} and ${keywords[1]}`;
  const rest = keywords.slice(0, -1).join(", ");
  return `likes ${rest}, and ${keywords[keywords.length - 1]}`;
}
