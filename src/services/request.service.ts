import { OpenAiClient } from "../config/openai";

export const generateConnectionHighlight = async ({
  degree,
  mutuals,
  keywords,
}: {
  degree: number;
  mutuals: number;
  keywords: string[];
}): Promise<string> => {
  try {
    // Prepare keywords for the prompt
    const keywordsText = keywords && keywords.length > 0 
      ? keywords.join(', ') 
      : '';

    const prompt = `
Create a notification about someone showing interest in a post. Keep the same style but vary the wording.

Details:
- Connection degree: ${degree} (1=direct connection, 2=friend of friend, 3+=distant)
- Mutual connections: ${mutuals}
- Their interests: ${keywordsText}

Use this information naturally. Keep it similar to these examples but change the wording:

Examples:
- "Someone who loves Design and Tech showed interest in your post."
- "A second-degree connection showed interest in your post."
- "Someone with 3 mutual connections is interested in your post."
- "Someone interested in Swimming showed interest in your post."
- "A friend of a friend is interested in your post."
- "Someone who enjoys Music showed interest in your post."

Vary the language but keep the same structure:
- Instead of "showed interest" use: "is interested in", "expressed interest in", "showed interest in"
- Instead of "someone who loves" use: "someone interested in", "someone who enjoys", "a person who likes"
- For connections: "direct connection", "mutual friend", "extended network"
- For mutuals: "X shared connections", "X mutual friends", "X common contacts"

Write ONE notification with similar style but different wording:
`.trim();

    // OpenAI Completion
    const response = await OpenAiClient.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let highlight = response.choices[0]?.message?.content?.trim();

    if (highlight) {
      // Clean up quotes if present
      if (
        (highlight.startsWith('"') && highlight.endsWith('"')) ||
        (highlight.startsWith("'") && highlight.endsWith("'"))
      ) {
        highlight = highlight.slice(1, -1);
      }
      return highlight;
    }

    // Fallback if OpenAI doesn't return anything
    return generateFallbackHighlight(degree, mutuals, keywords);

  } catch (err: any) {
    console.error('Error generating connection highlight:', err);
    
    // Return fallback on error
    return generateFallbackHighlight(degree, mutuals, keywords);
  }
};

// Helper function for fallback highlights
function generateFallbackHighlight(degree: number, mutuals: number, keywords: string[]): string {
  // Interest action variations
  const actions = ["showed interest in", "is interested in", "expressed interest in"];
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  // Interest-based messages (if keywords make sense)
  if (keywords && keywords.length > 0 && keywords.some(k => k.length > 2)) {
    const interestStarters = [
      "Someone who loves",
      "Someone interested in", 
      "A person who enjoys",
      "Someone who likes"
    ];
    const starter = interestStarters[Math.floor(Math.random() * interestStarters.length)];
    const interest = keywords[0];
    return `${starter} ${interest} ${action} your post.`;
  }
  
  // Degree-based messages
  const degreeMessages = [
    degree === 1 ? [`A direct connection ${action} your post.`, `Someone in your network ${action} your post.`] : null,
    degree === 2 ? [`A second-degree connection ${action} your post.`, `A friend of a friend ${action} your post.`] : null,
    degree >= 3 ? [`A third-degree connection ${action} your post.`, `Someone from your extended network ${action} your post.`] : null,
  ].filter(Boolean).flat();
  
  // Mutual-based messages
  const mutualMessages = [
    mutuals === 0 ? `Someone with no mutual connections ${action} your post.` : null,
    mutuals === 1 ? `Someone with 1 shared connection ${action} your post.` : null,
    mutuals > 1 ? `Someone with ${mutuals} mutual friends ${action} your post.` : null,
  ].filter(Boolean);
  
  // Combine all options
  const allOptions = [...degreeMessages, ...mutualMessages];
  
  return allOptions.length > 0 
    ? allOptions[Math.floor(Math.random() * allOptions.length)] || ''
    : `Someone ${action} your post.`;
}