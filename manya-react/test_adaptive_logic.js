
// MANYA ADAPTIVE SELECTION TEST v2.0
// ---------------------------------
function scoreQuestionMock(question, history) {
    let score = 100; // Base score
    const factors = [];
    const questionId = question.id;

    // ─── INDIVIDUAL QUESTION EXCLUSION (The new 24h rule) ───
    const qLastSeen = history.filter(ans => (ans.questionId || ans.id) === questionId).pop();
    if (qLastSeen) {
        const hoursSince = (Date.now() - new Date(qLastSeen.answeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
            score -= 10000; // Strict exclusion
            factors.push('duplicate_exclusion');
        }
    } else {
        score += 100; // Boost never-seen
        factors.push('never_seen_question');
    }

    return { score, factors };
}

// TEST CASE
const mockBank = [
    { id: 'q1', text: 'Question 1' },
    { id: 'q2', text: 'Question 2' },
    { id: 'q3', text: 'Question 3' },
    { id: 'q4', text: 'Question 4' },
    { id: 'q5', text: 'Question 5' },
    { id: 'q6', text: 'Question 6' },
    { id: 'q7', text: 'Fresh Question 7' },
    { id: 'q8', text: 'Fresh Question 8' }
];

const mockHistory = [
    { questionId: 'q1', answeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }, // 2h ago
    { questionId: 'q2', answeredAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }, // 5h ago
    { questionId: 'q3', answeredAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() }, // 10h ago
    { questionId: 'q4', answeredAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() }, // 20h ago
    { questionId: 'q5', answeredAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() }, // 23h ago
    { questionId: 'q6', answeredAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }, // 25h ago (Should be ALLOWED)
];

console.log('--- ADAPTIVE SELECTION TEST ---');
const results = mockBank.map(q => ({
    id: q.id,
    ...scoreQuestionMock(q, mockHistory)
}));

results.sort((a, b) => b.score - a.score);

console.log('Final Ranking:');
results.forEach(r => {
    const status = r.score < 0 ? '❌ EXCLUDED' : '✅ TARGET';
    console.log(`[${r.id}] Score: ${r.score} | Status: ${status} | Factors: ${r.factors.join(', ')}`);
});

const selected = results.filter(r => r.score > 0).map(r => r.id);
console.log('\nSelected Questions:', selected);

if (selected.includes('q1') || selected.includes('q5')) {
    console.error('FAIL: Recent duplicates were not excluded!');
} else if (!selected.includes('q6')) {
    console.error('FAIL: q6 (25h ago) should have been allowed!');
} else {
    console.log('SUCCESS: Question selection logic is correct!');
}
