import axios from 'axios';

// @desc    Generate a DSA question using an AI model
// @route   POST /api/ai/generate-question
// @access  Private
export const generateQuestion = async (req, res) => {
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
        return res.status(400).json({ message: 'Please provide a topic and difficulty.' });
    }

    const prompt = `
        You are an expert programming interview assistant. Your task is to fetch a well-known DSA problem from a public platform like LeetCode or GeeksforGeeks.

        Task: Find a classic question that matches the following criteria:
        - Topic: "${topic}"
        - Difficulty: "${difficulty}"

        Response Format: Your response MUST be in a valid JSON format. The JSON object must have four keys: "problemTitle", "problemStatement", "constraints", and "testCases".
        - "problemTitle": A string with the name of the problem (e.g., "Two Sum").
        - "problemStatement": A string containing the detailed question text.
        - "constraints": An array of strings detailing the constraints.
        - "testCases": An array of objects, where each object has "input" and "output" keys.

        Provide the response as a raw JSON object only, with no other text, formatting, or explanations.
    `;

    try {
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        const response = await axios.post(geminiApiUrl, requestBody);

        const responseText = response.data.candidates[0].content.parts[0].text;

        // --- THIS IS THE FIX ---
        // Use a regular expression to reliably extract the JSON from the Markdown block.
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

        if (!jsonMatch || !jsonMatch[1]) {
            // Fallback for when the AI doesn't use Markdown
            try {
                const jsonResponse = JSON.parse(responseText);
                return res.status(200).json(jsonResponse);
            } catch (parseError) {
                throw new Error("AI response was not valid JSON and could not be parsed.");
            }
        }

        const jsonString = jsonMatch[1];
        const jsonResponse = JSON.parse(jsonString);

        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("Error calling AI API or parsing response:", error.message);
        res.status(500).json({ message: 'Failed to generate question from AI service.' });
    }
};
