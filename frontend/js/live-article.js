/**
 * Live Article System
 * Handles inline variables, reactive calculations, and native AI integration.
 */
document.addEventListener('DOMContentLoaded', () => {
    initLiveArticle();
});

const STATE = {};

function initLiveArticle() {
    // 1. Initialize Variables
    const vars = document.querySelectorAll('.live-var');
    vars.forEach(el => {
        const name = el.dataset.name;
        // Parse initial value (remove non-numeric chars for storage, keep format for display if complex)
        // For simplicity, we assume the user types numbers or percentages.
        STATE[name] = parseValue(el.innerText);

        // Input listener
        el.addEventListener('input', () => {
            const raw = el.innerText;
            STATE[name] = parseValue(raw);
            updateCalculations();
            el.classList.add('modified');
        });

        // Blur listener to re-format (optional, skipping for MVP)
        el.addEventListener('blur', () => {
            // ensure it looks clean
        });
    });

    // 2. Initial Calculation
    updateCalculations();

    // 3. Initialize Native AI Panel
    initNativeAI();
}

function parseValue(str) {
    if (!str) return 0;
    // Remove $, %, commas
    const clean = str.replace(/[$,%]/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function formatValue(num, originalStr) {
    // Attempt to match the format of the output based on context or just standard formatting
    // If we want to be smart: look at the formula result. 
    // For MVP: built-in logic
    if (num > 1000) return num.toLocaleString();
    return num; // TODO: refined formatting
}

function updateCalculations() {
    const calcs = document.querySelectorAll('.live-calc');
    calcs.forEach(el => {
        const formula = el.dataset.formula;
        try {
            // Create a function with current state keys as arguments
            const keys = Object.keys(STATE);
            const values = Object.values(STATE);

            // Safe(ish) eval
            // We prepend 'return ' 
            const func = new Function(...keys, 'return ' + formula);
            const result = func(...values);

            // Format result
            // Check if it's currency
            let display = result;
            if (typeof result === 'number') {
                if (result > 100) {
                    display = '$' + Math.floor(result).toLocaleString();
                } else {
                    display = Math.round(result * 100) / 100;
                }
            }

            el.innerText = display;
            el.classList.add('updated');
            setTimeout(() => el.classList.remove('updated'), 500);

        } catch (e) {
            console.error("Calc error:", formula, e);
            el.innerText = "Err";
        }
    });
}

// --- Native AI UI ---

function initNativeAI() {
    // Inject the panel HTML
    const panel = document.createElement('div');
    panel.id = 'native-ai-panel';
    panel.innerHTML = `
        <div class="ai-header">
            <span class="ai-title">Author's Notes (AI)</span>
            <button class="ai-close">×</button>
        </div>
        <div class="ai-content-area" id="ai-messages">
            <p class="ai-placeholder">Highlight any text or ask a question to get context-aware insights based on your numbers.</p>
            <!-- Messages go here -->
        </div>
        <div class="ai-input-area">
            <input type="text" id="ai-input" placeholder="Ask a question..." autocomplete="off">
            <button id="ai-send">→</button>
        </div>
    `;
    document.body.appendChild(panel);

    // Floating Trigger
    const trigger = document.createElement('button');
    trigger.id = 'ai-trigger';
    trigger.innerText = '✨ Deep Dive';
    trigger.onclick = () => {
        panel.classList.add('open');
        trigger.classList.add('hidden');
    };
    document.body.appendChild(trigger);

    // Close
    panel.querySelector('.ai-close').onclick = () => {
        panel.classList.remove('open');
        trigger.classList.remove('hidden');
    };

    // Send
    const input = panel.querySelector('#ai-input');
    const sendBtn = panel.querySelector('#ai-send');
    const messages = panel.querySelector('#ai-messages');

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // User Message (Native Style)
        appendMessage('user', text);
        input.value = '';

        // Loading state
        const loadingId = appendMessage('system', 'Thinking...');

        try {
            // Get Context
            const context = {
                variables: STATE,
                // We could send the diff or the raw text? 
                // Let's send the plain text of the article
                articleTitle: document.title
            };

            const response = await fetch(window.RUNTIME_CONFIG.API_BASE_URL + '/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    mode: 'article_assistant',
                    userContext: context,
                    history: [] // simplified for now
                })
            });

            const data = await response.json();

            // Remove loading
            document.getElementById(loadingId).remove();

            if (data.reply) {
                appendMessage('assistant', data.reply);
            } else {
                appendMessage('error', 'Something went wrong.');
            }

        } catch (e) {
            console.error(e);
            document.getElementById(loadingId).remove();
            appendMessage('error', 'Network error.');
        }
    }

    sendBtn.onclick = sendMessage;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `ai-message ${role}`;
        div.id = 'msg-' + Date.now();

        // Simple markdown parsing for the AI response
        if (role === 'assistant') {
            // minimal bold/list parsing
            let html = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            div.innerHTML = `<p>${html}</p>`;
        } else {
            div.innerText = text;
        }

        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div.id;
    }
}
