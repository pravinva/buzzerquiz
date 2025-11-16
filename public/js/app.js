// ICC Quiz Cards - Interactive Flashcard App

class QuizApp {
    constructor() {
        this.quizzes = [];
        this.currentQuiz = null;
        this.allCards = [];
        this.currentCardIndex = 0;
        this.isFlipped = false;

        // Text-to-speech
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.autoRead = false;
        this.selectedVoice = null;

        // DOM elements
        this.flashcard = document.getElementById('flashcard');
        this.quizSelect = document.getElementById('quiz-select');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.voiceBtn = document.getElementById('voice-btn');
        this.autoReadCheckbox = document.getElementById('auto-read');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.currentRound = document.getElementById('current-round');
        this.currentPlayer = document.getElementById('current-player');
        this.totalCards = document.getElementById('total-cards');

        this.init();
    }

    async init() {
        await this.loadQuizList();
        this.initializeVoice();
        this.setupEventListeners();
    }

    initializeVoice() {
        // Wait for voices to be loaded
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.selectBestVoice();
            });
        } else {
            this.selectBestVoice();
        }
    }

    selectBestVoice() {
        const voices = this.synthesis.getVoices();

        // Prefer male English voices, prioritizing neutral accents
        const preferredVoices = [
            // Google voices
            'Google UK English Male',
            'Google US English Male',
            // Microsoft voices
            'Microsoft David - English (United States)',
            'Microsoft George - English (United Kingdom)',
            // Apple voices
            'Daniel',
            'Alex',
            // Any male English voice
            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')),
            // Fallback to any English voice
            voices.find(v => v.lang.startsWith('en'))
        ];

        for (const voiceName of preferredVoices) {
            if (typeof voiceName === 'string') {
                const voice = voices.find(v => v.name === voiceName);
                if (voice) {
                    this.selectedVoice = voice;
                    return;
                }
            } else if (voiceName) {
                this.selectedVoice = voiceName;
                return;
            }
        }

        // Ultimate fallback
        this.selectedVoice = voices[0];
    }

    async loadQuizList() {
        try {
            // Try to load quiz index
            const response = await fetch('/data/quiz-index.json');
            if (response.ok) {
                const index = await response.json();
                this.quizzes = index.quizzes;
            } else {
                // Fallback: load sample quiz
                this.quizzes = [
                    {
                        name: 'Sample Quiz',
                        file: '/data/quizzes/sample_quiz.json'
                    }
                ];
            }

            this.populateQuizSelector();
        } catch (error) {
            console.error('Error loading quiz list:', error);
            this.showError('Failed to load quiz list');
        }
    }

    populateQuizSelector() {
        this.quizSelect.innerHTML = '<option value="">Select a quiz...</option>';

        this.quizzes.forEach((quiz, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = quiz.name;
            this.quizSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        this.quizSelect.addEventListener('change', () => this.loadQuiz());
        this.flashcard.addEventListener('click', () => this.flipCard());
        this.prevBtn.addEventListener('click', () => this.previousCard());
        this.nextBtn.addEventListener('click', () => this.nextCard());
        this.voiceBtn.addEventListener('click', () => this.toggleSpeak());
        this.autoReadCheckbox.addEventListener('change', (e) => {
            this.autoRead = e.target.checked;
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.previousCard();
            if (e.key === 'ArrowRight') this.nextCard();
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.flipCard();
            }
            if (e.key === 'r' || e.key === 'R') {
                this.toggleSpeak();
            }
        });
    }

    speak(text) {
        // Stop any ongoing speech
        this.stopSpeaking();

        // Create new utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);

        // Set voice
        if (this.selectedVoice) {
            this.currentUtterance.voice = this.selectedVoice;
        }

        // Configure speech parameters
        this.currentUtterance.rate = 0.9; // Slightly slower for clarity
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;

        // Update UI when speaking starts
        this.currentUtterance.onstart = () => {
            this.voiceBtn.classList.add('speaking');
        };

        // Update UI when speaking ends
        this.currentUtterance.onend = () => {
            this.voiceBtn.classList.remove('speaking');
            this.currentUtterance = null;
        };

        // Handle errors
        this.currentUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.voiceBtn.classList.remove('speaking');
            this.currentUtterance = null;
        };

        // Start speaking
        this.synthesis.speak(this.currentUtterance);
    }

    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        this.voiceBtn.classList.remove('speaking');
        this.currentUtterance = null;
    }

    toggleSpeak() {
        if (this.synthesis.speaking) {
            this.stopSpeaking();
        } else {
            const card = this.allCards[this.currentCardIndex];
            if (card) {
                this.speak(card.question_text);
            }
        }
    }

    async loadQuiz() {
        const selectedIndex = this.quizSelect.value;
        if (selectedIndex === '') return;

        try {
            const quiz = this.quizzes[selectedIndex];
            const response = await fetch(quiz.file);

            if (!response.ok) {
                throw new Error(`Failed to load quiz: ${response.statusText}`);
            }

            this.currentQuiz = await response.json();
            this.prepareCards();
            this.currentCardIndex = 0;
            this.displayCard();
            this.updateStats();
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showError('Failed to load quiz data');
        }
    }

    prepareCards() {
        this.allCards = [];

        this.currentQuiz.rounds.forEach(round => {
            round.players.forEach(player => {
                player.questions.forEach(question => {
                    this.allCards.push({
                        round: round.round_number,
                        roundName: round.round_name,
                        player: player.player_number,
                        ...question
                    });
                });
            });
        });

        this.totalCards.textContent = this.allCards.length;
    }

    displayCard() {
        if (this.allCards.length === 0) return;

        const card = this.allCards[this.currentCardIndex];

        // Reset flip state
        this.isFlipped = false;
        this.flashcard.classList.remove('flipped');

        // Update question side
        const questionNumber = document.querySelector('.question-number');
        const questionText = document.querySelector('.question-text');

        questionNumber.textContent = `Round ${card.round} - Player ${card.player} - Q${card.question_number}`;

        // Stream the question text word by word
        this.streamText(questionText, card.question_text);

        // Update answer side
        const answerText = document.querySelector('.answer-text');
        answerText.textContent = card.answer;

        // Update accept answers
        const acceptAnswers = document.querySelector('.accept-answers');
        if (card.accept && card.accept.length > 0) {
            acceptAnswers.innerHTML = `
                <strong>Also Accept:</strong>
                <p>${card.accept.join(', ')}</p>
            `;
        } else {
            acceptAnswers.innerHTML = '';
        }

        // Update translations
        const translations = document.querySelector('.translations');
        if (card.translations && Object.keys(card.translations).length > 0) {
            let translationsHTML = '<strong>Translations:</strong>';
            for (const [lang, text] of Object.entries(card.translations)) {
                translationsHTML += `
                    <div class="translation-item">
                        <span class="translation-lang">${lang}:</span>
                        <span class="translation-text">${text}</span>
                    </div>
                `;
            }
            translations.innerHTML = translationsHTML;
        } else {
            translations.innerHTML = '';
        }

        // Update navigation buttons
        this.prevBtn.disabled = this.currentCardIndex === 0;
        this.nextBtn.disabled = this.currentCardIndex === this.allCards.length - 1;

        // Update progress
        this.updateProgress();
        this.updateStats();

        // Auto-read if enabled
        if (this.autoRead) {
            // Small delay to let the card animation complete
            setTimeout(() => {
                this.speak(card.question_text);
            }, 300);
        }
    }

    streamText(element, text) {
        // Clear existing content
        element.innerHTML = '';

        // Split text into words
        const words = text.split(/\s+/);

        // Average reading speed: ~250 words per minute = ~240ms per word
        // We'll use a slightly faster pace for better UX: 150ms per word
        const wordsPerMinute = 400; // Adjust for natural reading speed
        const delayPerWord = (60 * 1000) / wordsPerMinute;

        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word;
            span.style.animationDelay = `${index * delayPerWord}ms`;
            element.appendChild(span);

            // Add space after word (except last word)
            if (index < words.length - 1) {
                element.appendChild(document.createTextNode(' '));
            }
        });
    }

    flipCard() {
        this.isFlipped = !this.isFlipped;
        this.flashcard.classList.toggle('flipped');
    }

    previousCard() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.displayCard();
        }
    }

    nextCard() {
        if (this.currentCardIndex < this.allCards.length - 1) {
            this.currentCardIndex++;
            this.displayCard();
        }
    }

    updateProgress() {
        const progress = ((this.currentCardIndex + 1) / this.allCards.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${this.currentCardIndex + 1} / ${this.allCards.length}`;
    }

    updateStats() {
        if (this.allCards.length === 0) {
            this.currentRound.textContent = '-';
            this.currentPlayer.textContent = '-';
            return;
        }

        const card = this.allCards[this.currentCardIndex];
        this.currentRound.textContent = card.round;
        this.currentPlayer.textContent = card.player;
    }

    showError(message) {
        const questionText = document.querySelector('.question-text');
        questionText.innerHTML = `<span style="color: var(--secondary-color);">Error: ${message}</span>`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
