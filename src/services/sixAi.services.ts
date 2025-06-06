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
        // 1. Fetch active posts
        const posts = await getAllActivePosts();
        if (!posts || posts.data?.length === 0) {
        }

const prompt = `
You're a casual, friendly AI that helps users discover experiences or meetups based on what they enjoy.

The user's interests: ${keyword_summary.join(', ')}

Here are some sample posts people have shared:

- Catching the sunset at Brooklyn Bridge — who’s down to join?
- Need quick feedback on my startup pitch deck, especially from YC folks!
- Anyone want to hit the new taco place tonight? I’m buying!
- Late-night coding marathon at the co-working space — need company!
- Group study for the midterms at the library, snacks included!
- Philosophy 210 drove me nuts. Anyone want to vent or swap notes?
- Free tickets to the jazz show downtown if anyone’s interested!
- Morning jog in Central Park — let’s make it a running club!
- Looking for partners for the hackathon this weekend. Who’s in?
- Trying to find a roommate in SoHo — anyone moving soon?

Choose ONE post that matches the user's interests. Write a **short (1 sentence), fun, casual message** suggesting it.

Do NOT mention post numbers or the word "post". Just a cool suggestion in one line.

Examples:
- "Coding + late nights? That co-working marathon sounds like your kind of scene!"
- "Love jazz and free stuff? Tonight’s jazz show might be just your vibe."
- "Startup pitch deck feedback? Sounds like your next move!"

Write the suggestion now.
`.trim();


        // 3. OpenAI Completion
        const response = await OpenAiClient.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
        });

        let suggestion = response.choices[0]?.message?.content?.trim();

        if (suggestion) {
            if (
                (suggestion.startsWith('"') && suggestion.endsWith('"')) ||
                (suggestion.startsWith("'") && suggestion.endsWith("'"))
            ) {
                suggestion = suggestion.slice(1, -1);
                return { success: true, message: 'Post suggestion generated successfully', data: suggestion };
            }
        }
        return { success: true, message: 'No posts available', data: null };

    } catch (err: any) {
        await logger.error('suggestPostsToUserOpenai', 'Error generating post suggestion:', err);
        return { success: false, error: err.message || 'Failed to generate post suggestion' };
    }
};
