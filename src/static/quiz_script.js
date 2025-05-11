// quiz_script.js - クイズページのロジック

document.addEventListener('DOMContentLoaded', () => {
    const quizArea = document.getElementById('quiz-area');
    const questionTextElement = document.getElementById('question-text');
    const optionsListElement = document.getElementById('options-list');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const feedbackMessageElement = document.getElementById('feedback-message');
    const nextQuestionBtn = document.getElementById('next-question-btn');

    let currentQuestion = null;
    let selectedOptionId = null;
    let adminUserId = localStorage.getItem('adminUserId'); // 管理者IDをローカルストレージから取得（ログイン機能実装時に設定）

    // 仮の管理者ID (テスト用、実際にはログインフローで設定する)
    if (!adminUserId) {
        // adminUserId = '1'; // Postmanで作成した管理者ユーザーのIDなどを設定
        // console.warn('管理者IDが設定されていません。テスト用に仮のIDを使用します。');
    }

    async function fetchQuestion() {
        feedbackMessageElement.style.display = 'none';
        nextQuestionBtn.style.display = 'none';
        submitAnswerBtn.disabled = false;
        selectedOptionId = null;

        try {
            const response = await fetch('/api/quiz/question');
            if (!response.ok) {
                if (response.status === 404) {
                    questionTextElement.textContent = '挑戦できるクイズは以上です。お疲れ様でした！';
                    optionsListElement.innerHTML = '';
                    submitAnswerBtn.style.display = 'none';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            currentQuestion = await response.json();
            displayQuestion();
        } catch (error) {
            console.error('Error fetching question:', error);
            questionTextElement.textContent = '問題の取得に失敗しました。';
            optionsListElement.innerHTML = '';
        }
    }

    function displayQuestion() {
        if (!currentQuestion) return;
        questionTextElement.textContent = currentQuestion.text;
        optionsListElement.innerHTML = '';
        currentQuestion.options.forEach(option => {
            const li = document.createElement('li');
            li.textContent = option.text;
            li.dataset.optionId = option.id;
            li.addEventListener('click', () => {
                if (submitAnswerBtn.disabled) return;
                selectedOptionId = option.id;
                // 選択状態を視覚的に示す
                Array.from(optionsListElement.children).forEach(child => child.classList.remove('selected'));
                li.classList.add('selected');
            });
            optionsListElement.appendChild(li);
        });
    }

    async function submitAnswer() {
        if (!currentQuestion || selectedOptionId === null) {
            alert('選択肢を選んでください。');
            return;
        }

        submitAnswerBtn.disabled = true;

        try {
            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': adminUserId // ユーザーIDをヘッダーに追加
                },
                body: JSON.stringify({
                    question_id: currentQuestion.id,
                    selected_option_id: selectedOptionId, // パラメータ名を修正
                    // user_id: 1 // 本来はログインユーザーのID
                })
            });
            const result = await response.json();

            feedbackMessageElement.style.display = 'block';
            if (result.is_correct) {
                feedbackMessageElement.textContent = `正解！ ${result.message || ''}`;
                feedbackMessageElement.className = 'feedback correct';
            } else {
                feedbackMessageElement.textContent = `不正解。 ${result.message || ''}`;
                feedbackMessageElement.className = 'feedback incorrect';
            }
            nextQuestionBtn.style.display = 'block';

        } catch (error) {
            console.error('Error submitting answer:', error);
            feedbackMessageElement.textContent = '解答の送信に失敗しました。';
            feedbackMessageElement.className = 'feedback incorrect';
            feedbackMessageElement.style.display = 'block';
            submitAnswerBtn.disabled = false; // エラー時は再試行可能に
        }
    }

    submitAnswerBtn.addEventListener('click', submitAnswer);
    nextQuestionBtn.addEventListener('click', fetchQuestion);

    // 初期問題の取得
    fetchQuestion();
});
