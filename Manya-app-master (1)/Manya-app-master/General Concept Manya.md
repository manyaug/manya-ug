MANYA - Complete System Logic Summary
🎯 Core Philosophy
Manya is designed as an intelligent, psychologically-aware PLE exam preparation system that adapts to each student's unique learning pattern, ensuring both concept mastery and exam readiness.

📚 Curriculum Structure
Topics Progression
Topics are strictly sequential (learned in order)

Student must achieve 70% mastery in current topic before advancing

Topics loaded from database in correct order via MIN(Q_ID) grouping

Concept Variants (V1, V2, V3)
Each concept has 3 versions of the same question:

V1 (Easy) - Foundation, basic understanding

V2 (Medium) - Application, slightly rephrased

V3 (Hard) - Mastery, complex application

Rule: Never show V1, V2, V3 of same concept together or in sequence (minimum 3 questions spacing)

PLE Mark Ratio (2:1)
66% PLE-like questions (mark = 'yes') - Actual exam style

33% Practice questions (mark = 'no') - Supporting practice

Ratio maintained dynamically over last 10 questions

🚀 Session Initialization
At Start of Every Session:
Check if Warmup Needed:

New user → Always warmup

12 hours since last session → Warmup

Every 5th question → Warmup

Warmup Questions:

3 easy (V1) questions from current topic

Builds confidence, reactivates knowledge

No pressure, purely formative

Load User State:

Fetch user stats from database

Calculate current topic based on mastery

Load session history (last 20 questions)

🤔 Question Selection Algorithm
Step 1: Analyze User Performance
javascript
For each concept, track:
- attempts, correct, accuracy
- timeSpentMs (avg)
- lastSeen (days since)
- hintsUsed, answerChanged
- variant progression (V1→V2→V3)
Step 2: Calculate Mastery Level
Mastery Level	Criteria	Next Action
new	No attempts	Start with V1
struggling_v1	V1 <60% with ≥2 attempts	Repeat V1
learning	In progress	Continue current variant
ready_for_v2	V1 ≥80% with ≥3 attempts	Advance to V2
struggling_v2	V2 <60% with ≥2 attempts	Review V1 first
ready_for_v3	V2 ≥80% with ≥3 attempts	Advance to V3
mastered	V3 ≥80% with ≥3 attempts	Spaced repetition
Step 3: Apply Priority Scoring
Factor	Weight	Why
New concept	+100	Fresh material needs attention
Struggling	+80	Intervention needed
In progress	+60	Keep momentum
Ready to advance	+50	Challenge appropriately
Mastered	+20	Lower priority
Due for review (>7 days)	+40	Spaced repetition
High hint usage (>30%)	+30	Indicates difficulty
PLE-marked question	×1.5	Exam readiness
Step 4: Apply PLE Ratio
Select pool (yes or no) based on maintaining 66/33 split

Track recent questions to ensure ratio maintained

Step 5: Variant Spacing
Ensure no same concept appears within last 3 questions

Prevents repetition fatigue

Step 6: Final Selection
Take top 5 concepts by score

Filter for variant spacing

Randomly select from valid candidates

Adds healthy variety while maintaining pedagogical soundness

📊 Psychological Tracking
Real-time Metrics
Metric	Range	Triggers	Response
Frustration	0-100%	Wrong answer +15, Time >30s +10, Correct -5	>70% → easier questions, encouragement
Confidence	0-100%	Hint -15, Answer change -10, Hesitation -5	Low → simpler variants
Engagement	0-100%	Time on question	Low → break suggestion
Cognitive Load	0-100%	Question difficulty	High → simplify
Behavioral Signals Tracked
Hesitation count (>5s pause)

Answer changes

Hint usage pattern

Time per question (too fast = guessing, too slow = struggling)

🎮 Quest System
10 Quests Structure
Quest	Name	Questions	Difficulty	Purpose
1	Introduction to Geography	6	Warm-up	Build confidence
2	Continents Basics	8	Foundation	Core knowledge
3	Rivers of Africa	8	Core	Deep dive
4	Map Reading	7	Skill Building	Application
5	Countries & Capitals	9	Application	Practice
6	Physical Features	8	Deep Dive	Reinforcement
7	Climate & Vegetation	8	Complex	Challenge
8	Population & Settlement	7	Analysis	Critical thinking
9	Economic Activities	9	Synthesis	Integration
10	PLE Exam Simulation	12	Exam Mode	Stamina building
Why These Numbers?
6-7 questions: Complex topics (prevents overwhelm)

8 questions: Optimal cognitive load (Miller's Law: 7±2)

9-12 questions: Review and exam simulation (builds stamina)

Total: 80-120 questions per complete quest cycle

🔄 Session Flow
text
Session Start
    ↓
Check Warmup Need
    ↓
Get User Stats & History
    ↓
Determine Current Topic
    ↓
Select Pool (PLE/Practice based on ratio)
    ↓
Analyze All Concepts
    ├─ Calculate Mastery
    ├─ Apply Priority Scores
    └─ Check Variant Spacing
    ↓
Select Top 5 Concepts
    ↓
Random Selection from Valid
    ↓
Serve Question
    ↓
[User Answers]
    ↓
Record Everything:
    ├─ Correct/incorrect
    ├─ Time spent
    ├─ Hint used
    ├─ Answer changes
    ├─ Hesitations
    └─ Frustration level
    ↓
Update All Metrics
    ↓
Show Feedback
    ↓
Repeat
📈 Decision Factors Summary
What Influences Question Choice?
Category	Factors	Weight
Performance	Accuracy, attempts, mastery	40%
Recency	Days since last seen, spaced repetition	20%
Difficulty	V1/V2/V3 progression	15%
Psychological	Frustration, confidence, hints	15%
Exam Readiness	PLE mark ratio	10%
What We Track Per Answer
Data Point	Why It Matters
Correct/incorrect	Core performance metric
Time spent	Detects guessing vs deep thinking
Hint usage	Measures independence
Answer changes	Indicates confidence level
Hesitations	Shows uncertainty
Frustration level	Emotional state
Session context	Fatigue management
Time of day	Optimal scheduling
🏆 Success Metrics
Learning Effectiveness
Topic mastery progression speed

Error rate reduction over time

V1→V2→V3 advancement rate

Long-term retention (spaced repetition success)

Engagement
Session completion rate

Return frequency

Quest completion pace

Points accumulation

Psychological Health
Frustration pattern (should decrease with mastery)

Confidence growth

Hint dependency reduction

Answer change reduction

🔍 Debug Information Available
For every question, we track and display:

Question ID - Which concept and variant

Selection Score - Why this question was chosen

Factors - All influencing factors

Mastery Level - Current status

Pool - PLE or Practice

Warmup Status - Whether in warmup mode

Attempts & Accuracy - Historical performance

🎯 In Summary
Manya is not just a quiz app—it's a complete adaptive learning system that:

Respects curriculum order - Topics are strictly sequential

Builds foundations first - V1 before V2 before V3

Prevents fatigue - No same-concept repetition within 3 questions

Maintains exam focus - 66% PLE-style questions

Tracks psychology - Frustration, confidence, engagement

Uses spaced repetition - Reviews mastered concepts after 7 days

Provides complete transparency - Every decision is logged and visible

Grows with the student - From warmup to exam simulation

The system ensures that every question served is the right question at the right time for that specific student's current state of knowledge and mind.