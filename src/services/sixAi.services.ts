import { OpenAiClient } from "../config/openai";
import { logger } from "./log.services";
import { sendMessage } from "./message.services";
import { getAllActivePosts } from "./post.services";
import { getPostFromSupabase, getUserDetailsFromSupabase } from "./supabasePosts.service";
import { getMutualConnections } from "./userService";

const SYSTEM_SENDER_ID = '81dde3f4-d5e5-4686-937c-745a81a21e9a';

export const introduceUsersOpenai = async (userId1: string, userId2: string, postId: string, chatId: string) => {
    try {
        // 1. Fetch user details
        const [user1, user2] = await Promise.all([
            getUserDetailsFromSupabase(userId1),
            getUserDetailsFromSupabase(userId2),
        ]);

        if (!user1 || !user2) throw new Error("One or both users not found.");

        // 2. Fetch post
        const post = await getPostFromSupabase(postId);
        if (!post) throw new Error("Post not found.");

        // 3. Get mutual connections + degree
        const mutuals = await getMutualConnections(userId1, userId2);
        const mutualCount = mutuals.data?.length || 0;

        // 4. Prepare OpenAI prompt
        const prompt = `You're a fun, friendly AI. Given two user names, how many mutuals they have, and a post content, generate a short intro message (1-2 sentences) to connect them. Mention the post, mutuals, and tailor the tone casually.

        Examples:

        Post: Grabbing coffee in SoHo - anyone free to join?
        Hey Meera and Rohan, you've got 7 mutuals! Sounds like Meera's grabbing coffee in SoHo — Rohan, you always know the best cafes. Go join her!

        Post: Need to rant about Philosophy 210 - anyone taken it before?
        Hey Tara and Neil, you've got 3 mutuals! Tara's struggling with Philosophy 210 — Neil, you took it last year, so you two can definitely commiserate (or debate) over coffee.

        Post: Looking for YC application feedback from alumni
        Hey Ayaan and Ishita, 12 mutuals isn't nothing! Ishita's looking for YC feedback — Ayaan, with your pitch deck addiction and her vision, this might actually work.

        Post: Looking for a +1 to tonight's concert!
        Hey Divya and Arjun, 8 mutuals say you two are always down for music — Divya's looking for a +1 to tonight's show. Arjun, got plans?

        Post: Study sesh at LSE library tonight?
        Hey Karan and Leela, 5 mutuals think you both need a break — or maybe not. Leela's doing a study sesh at the LSE library. Karan, bring snacks.

        Now generate a message for:

        User 1: ${user1.data?.name}  
        User 2: ${user2.data?.name}  
        They have ${mutualCount} mutuals  
        Post: "${post.data?.content}"`;

        // 5. Generate intro from OpenAI
        const response = await OpenAiClient.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
        });

        const intro = response.choices[0].message.content;

        if (intro) {
            const sendResult = await sendMessage(SYSTEM_SENDER_ID, chatId, intro);
            if (!sendResult.success) throw new Error(sendResult.error || "Unknown error sending intro.");
        }
        return { success: true, message: 'Introduction sent successfully', data: intro };
    } catch (err: any) {
        await logger.error('introduceUsersOpenai', 'Error generating introduction:', err);
        return { success: false, error: err.message || 'Failed to generate introduction' };
    }
};


export const suggestPostsToUserOpenai = async (keyword_summary: string[]) => {
    try {
        // 1. Fetch active posts (but don't fail if none available)
        const posts = await getAllActivePosts();
            
        // Filter out posts that are too short or don't make sense
        const validPosts = posts.data?.filter((post: any) =>  
            post.content && 
            post.content.trim().length > 10 && 
            !post.content.match(/^[a-zA-Z]{1,3}$/) // Filter out single words or very short nonsense
        ) || [];

        // Randomly decide whether to use posts or go fully creative (70% creative, 30% posts)
        const useRandomApproach = Math.random() > 0.3;
        
        // Prepare user posts content for the prompt (only sometimes)
        const userPostsContent = !useRandomApproach && validPosts.length > 0 
            ? validPosts.map((post: any) => `- ${post.content}`).join('\n')
            : '';

        const prompt = `
You're a spontaneous, creative AI that suggests fun activities based on user interests. Be totally random and creative!

User's interests: ${keyword_summary.join(', ')}

${userPostsContent ? `Some user posts for context:\n${userPostsContent}\n\n` : ''}

APPROACH: ${useRandomApproach ? 'IGNORE the posts completely. Create something totally new and unexpected based ONLY on the user interests.' : 'You can reference posts if relevant, but still be creative.'}

Activity categories to randomly pick from:
• Social hangouts (coffee, meals, parties)
• Creative sessions (art, music, writing, crafts)
• Learning/study groups (coding, languages, skills)
• Sports/fitness (gym, hiking, running, yoga)
• Entertainment (movies, games, concerts, shows)
• Food adventures (cooking, restaurants, food tours)
• Outdoor activities (parks, photography, exploring)
• Professional networking (startup meetups, career stuff)
• Volunteer work (community service, causes)
• Random unique experiences (workshops, classes, weird stuff)

INSTRUCTIONS:
1. Pick a random activity category that loosely matches the user interests
2. Create a SHORT, punchy one-liner (max 15 words)
3. Make it sound like a friend texting you spontaneously
4. Be unpredictable - don't always suggest the obvious thing
5. Sometimes be totally random and surprising
6. NO quotes, NO "post" mentions, NO explanations

Examples of the vibe:
- "Midnight ramen run anyone? I know a hidden gem!"
- "Rooftop yoga at sunrise - who's brave enough?"
- "Building blanket forts and watching 90s movies tonight!"
- "Anyone want to learn salsa dancing badly with me?"
- "3am coding session with energy drinks and questionable life choices?"

Generate ONE random, short suggestion now:
`.trim();

        // 2. OpenAI Completion with higher randomness
        const response = await OpenAiClient.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9, // Higher randomness
            top_p: 0.9, // More creative responses
        });

        let suggestion = response.choices[0]?.message?.content?.trim();

        if (suggestion) {
            // Clean up quotes if present
            if (
                (suggestion.startsWith('"') && suggestion.endsWith('"')) ||
                (suggestion.startsWith("'") && suggestion.endsWith("'"))
            ) {
                suggestion = suggestion.slice(1, -1);
            }
            return { 
                success: true, 
                message: 'Post suggestion generated successfully', 
                data: suggestion 
            };
        }

        // Dynamic fallback suggestions based on keywords
        const keywordBasedFallbacks = [
            // Tech/coding related
            ...(keyword_summary.some(k => k.match(/code|tech|program|dev/i)) ? [
                "Debugging session with pizza and terrible jokes?",
                "Hackathon prep - let's build something ridiculous!",
                "Code review party - bring your worst spaghetti code!"
            ] : []),
            
            // Food related
            ...(keyword_summary.some(k => k.match(/food|eat|cook|restaurant/i)) ? [
                "Mystery food truck hunt - first one to find tacos wins!",
                "Cooking disaster challenge - who can mess up pasta?",
                "Late night diner philosophy discussions over pie!"
            ] : []),
            
            // Fitness/sports
            ...(keyword_summary.some(k => k.match(/gym|fit|sport|run|yoga/i)) ? [
                "Sunrise yoga followed by terrible selfies?",
                "Gym buddies needed for embarrassing workout faces!",
                "Running club for people who hate running!"
            ] : []),
            
            // Generic random ones
            "Spontaneous museum adventure - let's get cultured!",
            "Board game marathon with snacks and chaos!",
            "Photography walk through the weirdest neighborhoods!",
            "Book club for people who never finish books!",
            "Karaoke night for tone-deaf legends only!"
        ];
        
        const availableFallbacks = keywordBasedFallbacks.length > 0 ? keywordBasedFallbacks : [
            "Adventure time - let's try something completely random!",
            "Spontaneous meetup for cool people (that's you)!",
            "Random fun activity - trust me, it'll be great!",
            "Mystery hangout spot - dress code: bring good vibes!"
        ];
        
        const randomSuggestion = availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)];
        
        return { 
            success: true, 
            message: 'Fallback suggestion generated', 
            data: randomSuggestion 
        };

    } catch (err: any) {
        await logger.error('suggestPostsToUserOpenai', 'Error generating post suggestion:', err);
        
        // Emergency keyword-aware fallbacks
        const emergencyFallbacks = [
            "Something awesome is about to happen - you in?",
            "Random adventure calling your name right now!",
            "Perfect timing for trying something totally new!",
            "Spontaneous fun alert - who's ready to join?"
        ];
        
        const emergencySuggestion = emergencyFallbacks[Math.floor(Math.random() * emergencyFallbacks.length)];
        
        return { 
            success: true, 
            message: 'Emergency fallback suggestion', 
            data: emergencySuggestion 
        };
    }
};