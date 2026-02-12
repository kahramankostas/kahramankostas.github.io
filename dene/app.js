
document.addEventListener('DOMContentLoaded', () => {
    const questionSelect = document.getElementById('questionSelect');
    const modelSelect = document.getElementById('modelSelect');
    const resultsArea = document.getElementById('resultsArea');
    const template = document.getElementById('resultCardTemplate');

    let allData = null;

    // Fetch data
    fetch('db.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            initApp();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            resultsArea.innerHTML = `<div class="placeholder-text" style="color: var(--danger-color)">Veri yüklenirken hata oluştu: ${error.message}</div>`;
        });

    function initApp() {
        populateFilters();
        // Initial render - show first question by default if available
        if (allData.questions.length > 0) {
            questionSelect.value = allData.questions[0].id; // Set to first question ID
            renderResults();
        }

        // Add event listeners
        questionSelect.addEventListener('change', renderResults);
        modelSelect.addEventListener('change', renderResults);
    }

    function populateFilters() {
        // Populate Questions
        allData.questions.forEach((q, index) => {
            const option = document.createElement('option');
            option.value = q.id;
            // Truncate long questions for dropdown
            const displayText = q.text.length > 100 ? q.text.substring(0, 100) + '...' : q.text;
            option.textContent = `Soru ${q.id}: ${displayText}`;
            questionSelect.appendChild(option);
        });

        // Populate Models
        // We get unique model names from the models array
        allData.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }

    function renderResults() {
        const selectedQuestionId = parseInt(questionSelect.value);
        const selectedModelName = modelSelect.value;

        resultsArea.innerHTML = ''; // Clear current results

        if (!selectedQuestionId) return;

        // Get question text
        const questionObj = allData.questions.find(q => q.id === selectedQuestionId);
        if (!questionObj) return;

        // Filter models
        let modelsToRender = allData.models;
        if (selectedModelName !== 'all') {
            modelsToRender = allData.models.filter(m => m.name === selectedModelName);
        }

        let hasResult = false;

        modelsToRender.forEach(model => {
            // Find the answer for this question
            const answerData = model.answers.find(a => a.question_id === selectedQuestionId);

            if (answerData) {
                hasResult = true;
                const clone = template.content.cloneNode(true);

                // Content
                clone.querySelector('.model-name').textContent = model.name;
                clone.querySelector('.question-text').textContent = questionObj.text;

                // Total Score
                clone.querySelector('.total-score .score-value').textContent = answerData.scores.total;

                // Model Answer
                // Replace \n with <br> for basic formatting and handle markdown-like thinks
                let formattedAnswer = answerData.answer_text
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;') // Escape HTML
                    .replace(/\n/g, '<br>');

                // Highlight <think> blocks if present (though now escaped)
                // Let's try to restore basic styling for <think> blocks via regex replacement on the escaped string
                // But simplified: just show text
                clone.querySelector('.answer-text').innerHTML = formattedAnswer;

                // Sub Scores
                const scoreItems = clone.querySelectorAll('.score-item');
                // Order: K1, K2, K3
                scoreItems[0].querySelector('.score-value').textContent = answerData.scores.k1;
                scoreItems[1].querySelector('.score-value').textContent = answerData.scores.k2;
                scoreItems[2].querySelector('.score-value').textContent = answerData.scores.k3;

                // Reasoning
                clone.querySelector('.reasoning-text').textContent = answerData.reasoning || "Gerekçe belirtilmemiş.";

                resultsArea.appendChild(clone);
            }
        });

        if (!hasResult) {
            resultsArea.innerHTML = '<div class="placeholder-text">Seçilen kriterlere uygun sonuç bulunamadı.</div>';
        }
    }
});
