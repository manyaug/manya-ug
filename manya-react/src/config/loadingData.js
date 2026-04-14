/**
 * MANYA LOADING DATA v1.0
 * =============================================================
 * Central registry for playful facts and mascot configurations
 * used across all loading screens in the Manya World.
 */

export const SUBJECT_FACTS = {
  math: [
    '"Zero is the only number that can\'t be represented in Roman numerals!"',
    '"A \'jiffy\' is an actual unit of time — 1/100th of a second!"',
    '"The symbol for division (÷) is called an \'obelus.\'"',
    '"111,111,111 × 111,111,111 = 12,345,678,987,654,321!"',
    '"The word \'hundred\' comes from the Norse word \'hundrath,\' meaning 120!"',
    '"A pizza that has radius \'z\' and height \'a\' has volume Pi × z × z × a!"',
    '"Every odd number has the letter \'e\' in it!"',
    '"2,520 is the smallest number divisible by every number from 1 to 10!"',
    '"Pythagoras started a secret club dedicated to math and philosophy!"',
    '"A googol is 1 followed by 100 zeros — that\'s more than atoms in the universe!"'
  ],
  science: [
    '"A teaspoonful of neutron star would weigh about 6 billion tons!"',
    '"Bananas are naturally radioactive because they contain potassium-40!"',
    '"Lightning is five times hotter than the surface of the Sun!"',
    '"Your stomach gets a new lining every 3 to 4 days!"',
    '"Honey never spoils — 3,000-year-old honey was found still edible!"',
    '"Sound travels about 4 times faster in water than in air!"',
    '"A cloud can weigh more than a million pounds!"',
    '"Your body has enough iron to make a 3-inch nail!"',
    '"Octopuses have three hearts and blue blood!"',
    '"If you could fold paper 42 times, it would reach the Moon!"'
  ],
  sst: [
    '"The Great Wall of China is so long it could wrap around Earth twice!"',
    '"Vatican City is the smallest country — smaller than most shopping malls!"',
    '"The Dead Sea is so salty you can float without trying!"',
    '"Mount Everest grows about 4mm taller every year!"',
    '"Russia has 11 time zones — the most of any country!"',
    '"The Amazon Rainforest produces 20% of the world\'s oxygen!"',
    '"Antarctica is the driest continent and is technically a desert!"',
    '"The Sahara Desert was once covered in lush green vegetation!"',
    '"Canada has more lakes than all other countries combined!"',
    '"Tokyo is the most populated city in the world with 37 million people!"'
  ],
  english: [
    '"The shortest complete sentence in English is \'I am.\'"',
    '"\'Pneumonoultramicroscopicsilicovolcanoconiosis\' is the longest English word!"',
    '"Shakespeare invented over 1,700 words we still use today!"',
    '"The dot over the letters \'i\' and \'j\' is called a \'tittle.\'"',
    '"\'Set\' has the most definitions of any English word — over 430!"',
    '"A pangram uses every letter of the alphabet — like \'The quick brown fox...\'"',
    '"English is the official language of the skies — all pilots speak it!"',
    '"\'Go!\' is the shortest grammatically correct sentence in English!"',
    '"The word \'queue\' sounds the same if you remove the last 4 letters!"',
    '"More English words begin with \'S\' than any other letter!"'
  ]
};

export const LOADING_CONFIG = {
  math: {
    name: 'Manya',
    mascot: '/assets/images/manya.png',
    color: '#10b981',
    colorDark: '#059669',
    bgLight: 'rgba(16, 185, 129, 0.08)',
    title: 'Solving the Puzzle! 🏆',
    sub: 'Preparing Number Land...'
  },
  science: {
    name: 'Kiki',
    mascot: '/assets/images/kiki.png',
    color: '#0ea5e9',
    colorDark: '#0284c7',
    bgLight: 'rgba(14, 165, 233, 0.08)',
    title: 'Quantum Leap! ⚡',
    sub: 'Preparing Science Lab...'
  },
  sst: {
    name: 'Zany',
    mascot: '/assets/images/zany.png',
    color: '#f59e0b',
    colorDark: '#d97706',
    bgLight: 'rgba(245, 158, 11, 0.08)',
    title: 'Ready for Adventure! 🚀',
    sub: 'Preparing SST World...'
  },
  english: {
    name: 'Polly',
    mascot: '/assets/images/polly-removebg-preview.png',
    color: '#6366f1',
    colorDark: '#4f46e5',
    bgLight: 'rgba(99, 102, 241, 0.08)',
    title: 'Once Upon a Time... ✨',
    sub: 'Preparing Story World...'
  }
};

/**
 * Returns a random fact for the given subject.
 * Falls back to Math facts if subject is unknown.
 */
export function getRandomFact(subject) {
  const facts = SUBJECT_FACTS[subject?.toLowerCase()] || SUBJECT_FACTS.math;
  return facts[Math.floor(Math.random() * facts.length)];
}

/**
 * Returns the loading configuration for a given subject.
 */
export function getLoadingConfig(subject) {
  return LOADING_CONFIG[subject?.toLowerCase()] || LOADING_CONFIG.math;
}
