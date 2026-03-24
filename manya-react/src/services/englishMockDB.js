/**
 * MANYA ENGLISH MOCK DB (P7 Question Bank)
 * ---------------------------------------
 * This serves as a placeholder for the main database fetcher.
 * Categorized by topicId (matching quest folders).
 */
export const ENGLISH_MOCK_DB = {
    "01_holiday_kickoff": [
        {
            id: "mcq_01",
            question: "Which word best describes a trip to the countryside?",
            options: ["Urban", "Rural", "Commence", "Fare"],
            answer: "Rural",
            explanation: "'Rural' refers to the countryside, while 'Urban' refers to the city."
        },
        {
            id: "mcq_02",
            question: "Choose the correct verb: We need to ___ our bags for the trip.",
            options: ["commence", "prepare", "rural", "chores"],
            answer: "prepare",
            explanation: "You 'prepare' bags. 'Commence' means to start."
        },
        {
            id: "mcq_03",
            question: "A person you write letters to is called a ___.",
            options: ["Pen-pal", "Peer", "Partner", "Postman"],
            answer: "Pen-pal",
            explanation: "A pen-pal is someone you exchange letters with."
        }
    ],
    "03_question_tags_mastery": [
        {
            id: "tag_01",
            question: "You will come to the party, ___?",
            options: ["will you", "won't you", "don't you", "aren't you"],
            answer: "won't you",
            explanation: "Positive statement (+) takes a negative tag (-)."
        },
        {
            id: "tag_02",
            question: "She doesn't like milk, ___?",
            options: ["does she", "doesn't she", "is she", "has she"],
            answer: "does she",
            explanation: "Negative statement (-) takes a positive tag (+)."
        }
    ],
    "default": [
        {
            id: "def_01",
            question: "Choose the correct spelling:",
            options: ["Grammar", "Grammer", "Gramar", "Gramer"],
            answer: "Grammar",
            explanation: "Grammar ends with 'ar' not 'er'."
        }
    ]
};

export const fetchEnglishQuestions = (topicId) => {
    // Normalizing topicId to match keys (folder names)
    const key = topicId?.replace(/\.json$/, "");
    return ENGLISH_MOCK_DB[key] || ENGLISH_MOCK_DB["default"];
};
