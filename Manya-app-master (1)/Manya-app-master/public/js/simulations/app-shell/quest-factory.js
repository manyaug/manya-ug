import { cleanData } from './js/utils.js';

export const QuestFactory = {
    // Convert Windows paths to web paths
    resolvePath(winPath) {
        if (!winPath || winPath === "null") return null;
        const index = winPath.toLowerCase().indexOf('content');
        if (index === -1) return null;
        return '/' + winPath.substring(index).replace(/\\/g, '/');
    },

    async build(subject, subTopicId, nodeType) {
        const res = await fetch(`/content/${subject}/${subject}_bank.json`);
        const rawBank = await res.json();
        
        const pool = rawBank.map(row => cleanData(row)).filter(q => q['sub-topic'] === subTopicId);

        let steps = [];

        if (nodeType === 'WARMUP') {
            const easy = pool.filter(q => q.Question_Type === 'MCQ' && q.Difficulty === 'E').slice(0, 4);
            steps = easy.map(q => this.mapMCQ(q, true));
        } 
        else if (nodeType === 'STUDY') {
            const sims = pool.filter(q => q.Question_Type === 'SIM' && q.Mode_sim === 'study');
            for (let s of sims) {
                const data = await (await fetch(this.resolvePath(s.File_Path_sim))).json();
                steps.push({ engine: s.Engine_Type_sim, data, mode: 'study' });
            }
        }
        else if (nodeType === 'PRACTICE') {
            const med = pool.filter(q => q.Question_Type === 'MCQ' && q.Difficulty === 'M').slice(0, 5);
            steps = med.map(q => this.mapMCQ(q, true));
        }
        else if (nodeType === 'MASTERY') {
            const hard = pool.filter(q => q.Question_Type === 'MCQ' && q.Difficulty === 'H').slice(0, 4);
            steps = hard.map(q => this.mapMCQ(q, false)); // Hard = No hints
        }

        return steps;
    },

    mapMCQ(q, allowHint) {
        return {
            engine: "MCQ_STANDALONE",
            data: { 
                text: q.Question_Text, 
                options: { "Option_A":q.Option_A, "Option_B":q.Option_B, "Option_C":q.Option_C, "Option_D":q.Option_D },
                correct: q.Correct_Answer,
                hint: allowHint ? q.Hint : null,
                solution: q.Detailed_Solution,
                points: q.Difficulty === 'E' ? 1 : (q.Difficulty === 'M' ? 2 : 3)
            }
        };
    }
};