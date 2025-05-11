// admin_script.js - 管理者ページのロジック
document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const createQuestionForm = document.getElementById('create-question-form');
    const questionsTableBody = document.querySelector('#questions-table tbody');
    const editQuestionSection = document.getElementById('edit-question-section');
    const editQuestionForm = document.getElementById('edit-question-form');
    const editQuestionIdSpan = document.getElementById('edit-question-id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const addOptionBtnCreate = document.getElementById('add-option-btn-create');
    const optionsContainerCreate = document.getElementById('options-container-create');
    const addOptionBtnEdit = document.getElementById('add-option-btn-edit');
    const optionsContainerEdit = document.getElementById('options-container-edit');

    let adminUserId = localStorage.getItem('adminUserId'); // 実際のアプリではログイン時に設定
    // テスト用に、もしローカルストレージにadminUserIdがなければ、Postmanで作成したID '1' を使うか、プロンプトで入力させる
    if (!adminUserId) {
        adminUserId = prompt("管理者ユーザーIDを入力してください (例: 1)", "1");
        if (adminUserId) {
            localStorage.setItem('adminUserId', adminUserId);
        } else {
            alert("管理者IDが入力されなかったため、一部機能が動作しない可能性があります。");
            return; // 管理者IDがないと進めない
        }
    }

    const API_BASE_URL = ''; // デプロイされた環境では空でOK (相対パスになるため)

    // --- 選択肢追加機能 --- //
    function addOptionInput(container, namePrefix, isCreateMode) {
        const optionIndex = container.children.length;
        const newOptionEntry = document.createElement('div');
        newOptionEntry.classList.add('option-entry');
        newOptionEntry.innerHTML = `
            <input type="text" name="${namePrefix}_text_${optionIndex + 1}" placeholder="選択肢${optionIndex + 1}">
            <label><input type="radio" name="correct_option_${isCreateMode ? 'create' : 'edit'}" value="${optionIndex}"> 正解</label>
            <button type="button" class="remove-option-btn">削除</button>
        `;
        container.appendChild(newOptionEntry);
        newOptionEntry.querySelector('.remove-option-btn').addEventListener('click', () => {
            newOptionEntry.remove();
            // ラジオボタンのvalueを再採番 (もし必要なら)
        });
    }

    addOptionBtnCreate.addEventListener('click', () => addOptionInput(optionsContainerCreate, 'option', true));
    addOptionBtnEdit.addEventListener('click', () => addOptionInput(optionsContainerEdit, 'edit_option', false));

    // --- 登録済みクイズ問題一覧の表示 --- //
    async function fetchAndDisplayQuestions() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/questions`, {
                headers: { 'X-Admin-User-ID': adminUserId }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const questions = await response.json();

            questionsTableBody.innerHTML = ''; // テーブルをクリア
            questions.forEach(question => {
                const row = questionsTableBody.insertRow();
                row.insertCell().textContent = question.id;
                row.insertCell().textContent = question.text;
                const actionsCell = row.insertCell();
                actionsCell.classList.add('actions');

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.addEventListener('click', () => loadQuestionForEdit(question.id));
                actionsCell.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.addEventListener('click', () => deleteQuestion(question.id, question.text));
                actionsCell.appendChild(deleteButton);
            });
        } catch (error) {
            console.error('Error fetching questions:', error);
            alert('問題一覧の取得に失敗しました。');
        }
    }

    // --- 新しいクイズ問題の作成 --- //
    createQuestionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(createQuestionForm);
        const text = formData.get('text');
        const options = [];
        let correctOptionIndex = formData.get('correct_option_create');

        let optionCount = 0;
        for (let i = 1; ; i++) {
            const optionText = formData.get(`option_text_${i}`);
            if (optionText === null && i > 2) break; // 少なくとも2つの選択肢は必須と仮定
            if (optionText) {
                 options.push({
                    text: optionText,
                    is_correct: correctOptionIndex === (i - 1).toString()
                });
                optionCount++;
            }
            if (optionCount >= 4 && optionText === null) break; // 最大4つまで、空なら終了
        }
        
        if (options.length < 2) {
            alert('選択肢は少なくとも2つ入力してください。');
            return;
        }
        if (correctOptionIndex === null) {
            alert('正解の選択肢を指定してください。');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-User-ID': adminUserId
                },
                body: JSON.stringify({ text, options })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '詳細不明なエラー' }));
                throw new Error(`作成失敗: ${errorData.message || response.statusText}`);
            }
            alert('問題が作成されました！');
            createQuestionForm.reset();
            // optionsContainerCreate の中身を初期状態に戻す (最初の2つだけにするなど)
            while (optionsContainerCreate.children.length > 2) {
                 optionsContainerCreate.removeChild(optionsContainerCreate.lastChild);
            }
            fetchAndDisplayQuestions(); // リストを更新
        } catch (error) {
            console.error('Error creating question:', error);
            alert(`問題の作成に失敗しました: ${error.message}`);
        }
    });

    // --- クイズ問題の編集 --- //
    async function loadQuestionForEdit(questionId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/questions/${questionId}`, {
                 headers: { 'X-Admin-User-ID': adminUserId }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const question = await response.json();

            editQuestionIdSpan.textContent = question.id;
            editQuestionForm.elements['id'].value = question.id;
            editQuestionForm.elements['text'].value = question.text;
            
            optionsContainerEdit.innerHTML = ''; // 既存の選択肢をクリア
            question.options.forEach((option, index) => {
                const optionEntry = document.createElement('div');
                optionEntry.classList.add('option-entry');
                optionEntry.innerHTML = `
                    <input type="text" name="edit_option_text_${index + 1}" value="${option.text}" required>
                    <label><input type="radio" name="correct_option_edit" value="${index}" ${option.is_correct ? 'checked' : ''}> 正解</label>
                    <button type="button" class="remove-option-btn">削除</button>
                `;
                optionsContainerEdit.appendChild(optionEntry);
                optionEntry.querySelector('.remove-option-btn').addEventListener('click', () => {
                    optionEntry.remove();
                });
            });

            editQuestionSection.style.display = 'block';
            createQuestionSection.style.display = 'none'; // 作成フォームを隠す
            listQuestionsSection.style.display = 'none'; // 一覧を隠す
        } catch (error) {
            console.error('Error loading question for edit:', error);
            alert('編集する問題の読み込みに失敗しました。');
        }
    }

    editQuestionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(editQuestionForm);
        const id = formData.get('id');
        const text = formData.get('text');
        const options = [];
        let correctOptionIndex = formData.get('correct_option_edit');

        let optionCount = 0;
        for (let i = 1; ; i++) {
            const optionText = formData.get(`edit_option_text_${i}`);
            if (optionText === null && i > 2) break;
            if (optionText) {
                options.push({
                    text: optionText,
                    is_correct: correctOptionIndex === (i-1).toString()
                });
                optionCount++;
            }
             if (optionCount >= 4 && optionText === null) break;
        }

        if (options.length < 2) {
            alert('選択肢は少なくとも2つ入力してください。');
            return;
        }
         if (correctOptionIndex === null) {
            alert('正解の選択肢を指定してください。');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/questions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-User-ID': adminUserId
                },
                body: JSON.stringify({ text, options })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '詳細不明なエラー' }));
                throw new Error(`更新失敗: ${errorData.message || response.statusText}`);
            }
            alert('問題が更新されました！');
            editQuestionSection.style.display = 'none';
            createQuestionSection.style.display = 'block';
            listQuestionsSection.style.display = 'block';
            fetchAndDisplayQuestions(); // リストを更新
        } catch (error) {
            console.error('Error updating question:', error);
            alert(`問題の更新に失敗しました: ${error.message}`);
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        editQuestionSection.style.display = 'none';
        createQuestionSection.style.display = 'block';
        listQuestionsSection.style.display = 'block';
    });

    // --- クイズ問題の削除 --- //
    async function deleteQuestion(questionId, questionText) {
        if (!confirm(`問題「${questionText}」(ID: ${questionId}) を本当に削除しますか？`)) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/questions/${questionId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-User-ID': adminUserId }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '詳細不明なエラー' }));
                throw new Error(`削除失敗: ${errorData.message || response.statusText}`);
            }
            alert('問題が削除されました。');
            fetchAndDisplayQuestions(); // リストを更新
        } catch (error) {
            console.error('Error deleting question:', error);
            alert(`問題の削除に失敗しました: ${error.message}`);
        }
    }

    // 初期表示
    if(adminUserId) {
        fetchAndDisplayQuestions();
    }
});
