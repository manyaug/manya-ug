/**
 * QUEST FACTORY
 * The "Brain" that turns raw Question Banks (Excel rows) into Game Quests.
 */
export const QuestFactory = {
    
    // 1. Fetch the big subject bank (The converted Excel)
    async getBank(subject) {
        const res = await fetch(`content/${subject}/${subject}-p7-question-bank.json`);
        return await res.json();
    },

    /**
     * Build a Quest dynamically
     * @param {string} subject - 'math', 'science', etc.
     * @param {string} subTopic - 'finite_sets', 'skull', etc.
     */
    async buildQuest(subject, subTopic) {
        const bank = await this.getBank(subject);
        
        // 2. Filter rows from your Excel data
        const pool = bank.filter(q => q.sub_topic === subTopic);

        // 3. Select Ingredients (Logic)
        const introSim = pool.find(q => q.Question_Type === 'SIM' && q.Mode_sim === 'study');
        const mcqs = pool.filter(q => q.Question_Type === 'MCQ').sort(() => 0.5 - Math.random()).slice(0, 5);
        const recap = pool.find(q => q.Engine_Type_sim === 'READER_STUDY');

        // 4. Create the "Quest Manifest" (What the QuestRunner will play)
        return {
            title: subTopic.toUpperCase().replace('_', ' '),
            steps: [
                // Step 1: Character Greeting
                { 
                    engineType: "CHAT", 
                    data: { speaker: "manya", text: `Ready to master ${subTopic}? Let's go!` } 
                },
                // Step 2: The Interactive Lesson (The SIM row in Excel)
                { 
                    engineType: introSim?.Engine_Type_sim || "3D_SKELETON", 
                    data: JSON.parse(introSim?.Simulation_Data_sim || "{}") 
                },
                // Steps 3-7: The Questions (The MCQ rows in Excel)
                ...mcqs.map(q => ({
                    engineType: "MCQ_STANDALONE",
                    data: { 
                        text: q.Question_Text, 
                        options: [q.Option_A, q.Option_B, q.Option_C, q.Option_D], 
                        answer: q.Correct_Answer, // e.g., "Option_B"
                        hint: q.Hint 
                    }
                })),
                // Step 8: The Summary (The READER row in Excel)
                {
                    engineType: "READER_STUDY",
                    data: JSON.parse(recap?.Simulation_Data_sim || "{}")
                }
            ]
        };
    }
};