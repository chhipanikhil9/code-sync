import axios from 'axios';

export const executeCode = async (req, res) => {
    const { code, language, stdin } = req.body;

    if (!code) {
        return res.status(400).json({ message: "Code is required" });
    }

    const languageMap = {
        "javascript": { language: "javascript", version: "18.15.0" },
        "python": { language: "python", version: "3.10.0" },
        "java": { language: "java", version: "15.0.2" },
        "c++": { language: "c++", version: "10.2.0" },
        "cpp": { language: "c++", version: "10.2.0" }
    };

    const runtime = languageMap[language];

    if (!runtime) {
        return res.status(400).json({ message: "Unsupported language" });
    }

    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: runtime.language,
            version: runtime.version,
            files: [
                {
                    content: code
                }
            ],
            stdin: stdin || "", // Pass stdin if provided, else empty string
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error executing code:", error.message);
        res.status(500).json({ message: "Failed to execute code" });
    }
}
