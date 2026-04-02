// Global state
let currentUser = 'student-001';
let currentQuestion = null;
let selectedOption = null;
let answerSubmitted = false;
let hintUsed = false;
let questionStartTime = null;
let answerChanged = false;
let initialSelection = null;

// DOM Elements
const userSelect = document.getElementById('userSelect');
const questionText = document.getElementById('questionText');
const optionsDiv = document.getElementById('options');
const topicSpan = document.getElementById('topic');
const difficultySpan = document.getElementById('difficulty');
const hintBtn = document.getElementById('hintBtn');
const nextBtn = document.getElementById('nextBtn');
const hintDisplay = document.getElementById('hintDisplay');
const feedbackCard = document.getElementById('feedbackCard');
const questionCard = document.getElementById('questionCard');
const continueBtn = document.getElementById('continueBtn');
const streakSpan = document.getElementById('streak');
const pointsSpan = document.getElementById('points');
const totalAnsweredSpan = document.getElementById('totalAnswered');
const overallAccuracySpan = document.getElementById('overallAccuracy');
const totalPointsSpan = document.getElementById('totalPoints');
const topicsList = document.getElementById('topicsList');

// Initialize
userSelect.addEventListener('change', (e) => {
    currentUser = e.target.value;
    loadNextQuestion();
    loadUserStats();
});

hintBtn.addEventListener('click', getHint);
nextBtn.addEventListener('click', showFeedback);
continueBtn.addEventListener('click', () => {
    feedbackCard.style.display = 'none';
    questionCard.style.display = 'block';
    loadNextQuestion();
});

// Load first question
loadNextQuestion();
loadUserStats();

// Functions
async function loadNextQuestion() {
    try {
        showLoading();
        
        const response = await fetch(`/api/next-question/${currentUser}`);
        const question = await response.json();
        
        if (question.error) {
            questionText.textContent = 'No questions available';
            return;
        }
        
        currentQuestion = question;
        displayQuestion(question);
        startTimer();
        
    } catch (error) {
        console.error('Error loading question:', error);
        questionText.textContent = 'Error loading question. Please try again.';
    }
}

function displayQuestion(question) {
    // Reset state
    selectedOption = null;
    answerSubmitted = false;
    hintUsed = false;
    answerChanged = false;
    initialSelection = null;
    
    // Hide hint
    hintDisplay.style.display = 'none';
    hintDisplay.textContent = '';
    
    // Enable/disable buttons
    hintBtn.disabled = false;
    nextBtn.disabled = true;
    
    // Display question info
    topicSpan.textContent = question.Topic || 'General';
    difficultySpan.textContent = getDifficultyEmoji(question.Difficulty);
    questionText.textContent = question.Question_Text;
    
    // Display options
    const options = [
        { letter: 'A', text: question.Option_A },
        { letter: 'B', text: question.Option_B },
        { letter: 'C', text: question.Option_C },
        { letter: 'D', text: question.Option_D }
    ];
    
    optionsDiv.innerHTML = options.map(opt => `
        <div class="option" data-letter="${opt.letter}" onclick="selectOption('${opt.letter}')">
            <span class="option-letter">${opt.letter}.</span>
            <span class="option-text">${opt.text}</span>
        </div>
    `).join('');
}

function selectOption(letter) {
    if (answerSubmitted) return;
    
    const options = document.querySelectorAll('.option');
    
    // Track if answer changed
    if (selectedOption && selectedOption !== letter) {
        answerChanged = true;
    }
    
    // Track initial selection
    if (!selectedOption) {
        initialSelection = letter;
    }
    
    // Update UI
    options.forEach(opt => {
        if (opt.dataset.letter === letter) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
    
    selectedOption = letter;
    nextBtn.disabled = false;
}

async function submitAnswer() {
    if (!selectedOption || !currentQuestion) return;
    
    const timeSpent = Date.now() - questionStartTime;
    const isCorrect = selectedOption === currentQuestion.Correct_Answer.substring(0, 1);
    
    try {
        const response = await fetch('/api/submit-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser,
                questionId: currentQuestion.Q_ID,
                selectedAnswer: selectedOption,
                isCorrect: isCorrect,
                timeSpentMs: timeSpent,
                hintUsed: hintUsed,
                answerChanged: answerChanged
            })
        });
        
        const result = await response.json();
        
        // Show correct/incorrect colors on options
        const options = document.querySelectorAll('.option');
        options.forEach(opt => {
            opt.classList.remove('selected');
            opt.classList.add('disabled');
            
            const letter = opt.dataset.letter;
            if (letter === currentQuestion.Correct_Answer.substring(0, 1)) {
                opt.classList.add('correct');
            } else if (letter === selectedOption && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
        
        answerSubmitted = true;
        hintBtn.disabled = true;
        
        // Show feedback
        showAnswerFeedback(result);
        
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

function showAnswerFeedback(result) {
    const feedbackIcon = document.getElementById('feedbackIcon');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const feedbackDetails = document.getElementById('feedbackDetails');
    
    if (result.isCorrect) {
        feedbackIcon.textContent = '🎉';
        feedbackMessage.textContent = 'Correct!';
        feedbackMessage.style.color = '#48bb78';
    } else {
        feedbackIcon.textContent = '💪';
        feedbackMessage.textContent = 'Not quite right!';
        feedbackMessage.style.color = '#f56565';
    }
    
    feedbackDetails.innerHTML = `
        <p>${result.message}</p>
        <p>Points earned: ${result.pointsEarned} ⭐</p>
        <p>The correct answer was: ${result.correctAnswer}</p>
    `;
    
    // Update stats
    updatePoints(result.pointsEarned);
    loadUserStats();
}

function showFeedback() {
    if (!selectedOption) return;
    
    questionCard.style.display = 'none';
    feedbackCard.style.display = 'block';
    
    submitAnswer();
}

async function getHint() {
    if (!currentQuestion || hintUsed) return;
    
    try {
        const response = await fetch(`/api/hint/${currentQuestion.Q_ID}`);
        const data = await response.json();
        
        hintDisplay.textContent = data.hint || 'Think carefully about what you\'ve learned!';
        hintDisplay.style.display = 'block';
        
        hintUsed = true;
        hintBtn.disabled = true;
        
    } catch (error) {
        console.error('Error getting hint:', error);
    }
}

async function loadUserStats() {
    try {
        const response = await fetch(`/api/user-stats/${currentUser}`);
        const stats = await response.json();
        
        // Update summary
        if (stats.summary) {
            totalAnsweredSpan.textContent = stats.summary.totalAnswered || 0;
            overallAccuracySpan.textContent = stats.summary.totalAnswered > 0 
                ? Math.round((stats.summary.totalCorrect / stats.summary.totalAnswered) * 100) + '%'
                : '0%';
            totalPointsSpan.textContent = stats.summary.totalPoints || 0;
        }
        
        // Update topics list
        if (stats.topics && stats.topics.length > 0) {
            topicsList.innerHTML = stats.topics.map(topic => `
                <div class="topic-item">
                    <span class="topic-name">${topic.Topic}</span>
                    <span class="topic-accuracy ${topic.accuracy < 60 ? 'low' : ''}">
                        ${topic.accuracy}% (${topic.correct}/${topic.attempts})
                    </span>
                </div>
            `).join('');
        } else {
            topicsList.innerHTML = '<p class="no-data">No data yet. Answer some questions!</p>';
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updatePoints(points) {
    const currentPoints = parseInt(pointsSpan.textContent.split(' ')[1]) || 0;
    pointsSpan.textContent = `⭐ ${currentPoints + points}`;
}

function startTimer() {
    questionStartTime = Date.now();
}

function getDifficultyEmoji(diff) {
    switch(diff) {
        case 'E': return '🟢 Easy';
        case 'M': return '🟡 Medium';
        case 'H': return '🔴 Hard';
        default: return '⚪ Unknown';
    }
}

function showLoading() {
    questionText.textContent = 'Loading...';
    optionsDiv.innerHTML = '';
}

// Make selectOption available globally
window.selectOption = selectOption;