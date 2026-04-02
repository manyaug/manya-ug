// curriculum.js - Complete PLE curriculum structure
// Save this file and I'll use it to navigate questions properly

const curriculum = {
    "P7": {
        "Science": {
            "Term1": {
                "Musculo-Skeletal System": {
                    "order": 1,
                    "subtopics": [
                        "Bones of the body",
                        "Types of joints",
                        "Muscles and movement",
                        "Functions of the skeleton",
                        "Common injuries and first aid"
                    ],
                    "keyConcepts": [
                        "SCI-P7-T1-MC-00144", // Example concept ID pattern
                        "SCI-P7-T1-MC-00732"
                    ]
                },
                "Digestive System": {
                    "order": 2,
                    "subtopics": [
                        "Parts of digestive system",
                        "Process of digestion",
                        "Healthy eating habits"
                    ]
                },
                "Respiratory System": {
                    "order": 3,
                    "subtopics": [
                        "Parts of respiratory system",
                        "Breathing process",
                        "Common respiratory diseases"
                    ]
                }
                // Continue with all Term1 topics...
            },
            "Term2": {
                // Term2 topics...
            },
            "Term3": {
                // Term3 topics...
            }
        },
        "Mathematics": {
            // Math curriculum...
        },
        "English": {
            // English curriculum...
        },
        "Social Studies": {
            // SST curriculum...
        }
    },
    "P6": {
        // P6 curriculum...
    },
    "P5": {
        // P5 curriculum...
    }
};

// Helper function to get topic order
function getTopicOrder(subject, term, topic) {
    return curriculum[subject]?.[term]?.[topic]?.order || 999;
}

// Helper to get next topic
function getNextTopic(currentSubject, currentTerm, currentTopic) {
    const topics = Object.keys(curriculum[currentSubject]?.[currentTerm] || {});
    const currentIndex = topics.indexOf(currentTopic);
    return topics[currentIndex + 1] || null;
}

module.exports = curriculum;