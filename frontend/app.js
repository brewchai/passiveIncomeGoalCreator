// Application State
let appState = {
    currentStep: 0,
    portfolio: [],
    portfolioValue: 0,
    blendedYield: 0,
    monthlyDividendIncome: 0,
    rentalIncome: [],
    otherIncome: [],
    expenses: [],
    goals: [],
    totalPassiveIncome: 0
};

// Gate to control progression from Step 6 (calculating)
let canProceedFromStep6 = false;

// Load state from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateProgressBar();
    // Start typing effect for welcome message
    typeWelcomeMessage();
});

// Save state to localStorage
function saveState() {
    localStorage.setItem('passiveIncomeGoalTracker', JSON.stringify(appState));
}

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('passiveIncomeGoalTracker');
    if (saved) {
        appState = JSON.parse(saved);
        if (appState.currentStep > 1) {
            // Restore UI state
            renderTickerList();
            renderRentalList();
            renderOtherList();
            renderExpenseList();

            // Restore portfolio value
            if (appState.portfolioValue) {
                document.getElementById('portfolioValue').value = appState.portfolioValue;
                updateDividendIncome();
            }

            // Restore portfolio summary display if tickers exist
            if (appState.portfolio && appState.portfolio.length > 0) {
                calculateBlendedYield();
            }

            if (appState.currentStep === 8) {
                renderDashboard();
            }
        }
    }
}

// Navigation Functions
function nextStep() {
    const currentStepEl = document.getElementById(`step${appState.currentStep}`);
    currentStepEl.classList.remove('active');

    appState.currentStep++;

    // Special handling for calculation step
    if (appState.currentStep === 6) {
        showStep(6);
        canProceedFromStep6 = false;

        setTimeout(() => {
            calculateGoals();

            // Show all steps sequentially at same pace
            setTimeout(() => {
                const step1 = document.getElementById('calcStep1');
                if (step1) step1.style.display = 'block';
            }, 1000);

            setTimeout(() => {
                const step2 = document.getElementById('calcStep2');
                if (step2) step2.style.display = 'block';
            }, 2000);

            setTimeout(() => {
                const step3 = document.getElementById('calcStep3');
                if (step3) step3.style.display = 'block';
            }, 3000);

            setTimeout(() => {
                const step4 = document.getElementById('calcStep4');
                if (step4) step4.style.display = 'block';
            }, 4000);

            setTimeout(() => {
                const step5 = document.getElementById('calcStep5');
                if (step5) step5.style.display = 'block';
            }, 5000);

            // Show completion state
            setTimeout(() => {
                const spinner = document.getElementById('calcSpinner');
                const header = document.getElementById('calcHeader');
                const signupBanner = document.getElementById('signupBanner');

                if (spinner) spinner.style.display = 'none';
                if (header) {
                    header.textContent = 'All your goals have been setup';
                    header.style.color = '#10b981';
                }
                if (signupBanner) signupBanner.style.display = 'flex';

                // Trigger confetti animation
                if (typeof confetti !== 'undefined') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            }, 6000);
        }, 100);
        return;
    }

    // Special handling for congratulations step
    if (appState.currentStep === 7) {
        showStep(7);
        updateCongratsScreen();
        saveState();
        return;
    }

    // Special handling for dashboard
    if (appState.currentStep === 8) {
        showStep(8);
        renderDashboard();
        saveState();
        return;
    }

    showStep(appState.currentStep);
    saveState();
}

function prevStep() {
    const currentStepEl = document.getElementById(`step${appState.currentStep}`);
    currentStepEl.classList.remove('active');

    appState.currentStep--;
    showStep(appState.currentStep);
    saveState();
}

function showStep(stepNumber) {
    const stepEl = document.getElementById(`step${stepNumber}`);
    stepEl.classList.add('active');
    updateProgressBar();
}

function updateProgressBar() {
    const progressIndicator = document.getElementById('progressIndicator');

    // Hide progress bar on landing page (step 0), transition screens (steps 6-7), and dashboard (step 8)
    if (appState.currentStep === 0 || appState.currentStep >= 6) {
        progressIndicator.style.display = 'none';
        return;
    }

    progressIndicator.style.display = 'block';
    const progress = (appState.currentStep / 5) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `Step ${appState.currentStep} of 5`;
}

// Start Builder from Landing Page
function startBuilder() {
    const landingPage = document.getElementById('step0');
    landingPage.classList.remove('active');

    appState.currentStep = 1;
    showStep(1);
    saveState();
}

// Portfolio/Ticker Functions
async function addTicker() {
    const symbolInput = document.getElementById('tickerSymbol');
    const percentInput = document.getElementById('tickerPercent');

    const symbol = symbolInput.value.trim().toUpperCase();
    const percent = parseFloat(percentInput.value);

    if (!symbol || !percent || percent <= 0) {
        alert('Please enter a valid ticker symbol and percentage');
        return;
    }

    // Check if total percentage would exceed 100%
    const currentTotal = appState.portfolio.reduce((sum, item) => sum + item.percent, 0);
    if (currentTotal + percent > 100) {
        alert('Total portfolio percentage cannot exceed 100%');
        return;
    }

    // Fetch dividend yield
    const yieldData = await fetchDividendYield(symbol);

    if (yieldData) {
        appState.portfolio.push({
            symbol: symbol,
            percent: percent,
            yield: yieldData,
            name: symbol
        });

        symbolInput.value = '';
        percentInput.value = '';

        renderTickerList();
        calculateBlendedYield();
        saveState();
    }
}

// Configuration
const API_BASE_URL = (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL)
    ? window.RUNTIME_CONFIG.API_BASE_URL
    : 'http://localhost:5001/api';

// Mock dividend yield data (fallback)
const mockDividendYields = {
    'AAPL': 0.52, 'MSFT': 0.78, 'JNJ': 2.65, 'KO': 3.05, 'PG': 2.45,
    'VZ': 6.45, 'T': 7.25, 'XOM': 3.55, 'CVX': 3.75, 'PFE': 3.95,
    'MRK': 2.85, 'INTC': 1.45, 'IBM': 4.65, 'MMM': 3.35, 'CAT': 2.15,
    'SPY': 1.35, 'VOO': 1.40, 'VTI': 1.45, 'SCHD': 3.25, 'VYM': 2.95
};

// Fetch dividend yield from backend API
async function fetchDividendYield(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}/dividend-yield?symbol=${symbol}`);
        const data = await response.json();

        if (response.ok && !data.error) {
            return data.dividendYield;
        } else {
            console.warn(`API error for ${symbol}:`, data.message || 'Unknown error');
            // Fallback to mock data
            return getMockDividendYield(symbol);
        }
    } catch (error) {
        console.error(`Failed to fetch dividend yield for ${symbol}:`, error);
        // Fallback to mock data if API is unavailable
        return getMockDividendYield(symbol);
    }
}

// Get mock dividend yield (fallback)
function getMockDividendYield(symbol) {
    if (mockDividendYields[symbol]) {
        return mockDividendYields[symbol];
    }
    // Random yield between 1-4% for unknown tickers
    return parseFloat((Math.random() * 3 + 1).toFixed(2));
}

function renderTickerList() {
    const listEl = document.getElementById('tickerList');

    if (appState.portfolio.length === 0) {
        listEl.innerHTML = '';
        return;
    }

    listEl.innerHTML = appState.portfolio.map((item, index) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-name">${item.symbol}</div>
                <div class="list-item-details">${item.name} • ${item.percent}% of portfolio • ${item.yield}% yield</div>
            </div>
            <button class="delete-btn" onclick="removeTicker(${index})">×</button>
        </div>
    `).join('');
}

function removeTicker(index) {
    appState.portfolio.splice(index, 1);
    renderTickerList();
    calculateBlendedYield();
    saveState();
}

function calculateBlendedYield() {
    if (appState.portfolio.length === 0) {
        document.getElementById('blendedYield').style.display = 'none';
        appState.blendedYield = 0;
        appState.monthlyDividendIncome = 0;
        return;
    }

    const blendedYield = appState.portfolio.reduce((sum, item) => {
        return sum + (item.yield * item.percent / 100);
    }, 0);

    appState.blendedYield = blendedYield;

    document.getElementById('blendedYield').style.display = 'block';
    document.getElementById('yieldValue').textContent = `${blendedYield.toFixed(2)}%`;

    // Calculate monthly dividend income
    updateDividendIncome();
}

// Update dividend income based on portfolio value and blended yield
function updateDividendIncome() {
    const portfolioValueInput = document.getElementById('portfolioValue');
    const portfolioValue = parseFloat(portfolioValueInput.value) || 0;

    appState.portfolioValue = portfolioValue;

    if (portfolioValue > 0 && appState.blendedYield > 0) {
        // Annual dividend = portfolio value * yield percentage
        const annualDividend = portfolioValue * (appState.blendedYield / 100);
        const monthlyDividend = annualDividend / 12;

        appState.monthlyDividendIncome = monthlyDividend;
        document.getElementById('monthlyDividendIncome').textContent = `$${monthlyDividend.toFixed(2)}`;
    } else {
        appState.monthlyDividendIncome = 0;
        document.getElementById('monthlyDividendIncome').textContent = '$0.00';
    }

    saveState();
}

// Rental Income Functions
function addRental() {
    const nameInput = document.getElementById('rentalName');
    const amountInput = document.getElementById('rentalAmount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || !amount || amount <= 0) {
        alert('Please enter a valid property name and monthly income');
        return;
    }

    appState.rentalIncome.push({ name, amount });

    nameInput.value = '';
    amountInput.value = '';

    renderRentalList();
    saveState();
}

function renderRentalList() {
    const listEl = document.getElementById('rentalList');

    if (appState.rentalIncome.length === 0) {
        listEl.innerHTML = '';
        document.getElementById('totalRental').style.display = 'none';
        return;
    }

    listEl.innerHTML = appState.rentalIncome.map((item, index) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-name">${item.name}</div>
            </div>
            <span class="list-item-value">$${item.amount.toFixed(2)}</span>
            <button class="delete-btn" onclick="removeRental(${index})">×</button>
        </div>
    `).join('');

    const total = appState.rentalIncome.reduce((sum, item) => sum + item.amount, 0);
    document.getElementById('totalRental').style.display = 'flex';
    document.getElementById('totalRentalValue').textContent = `$${total.toFixed(2)}`;
}

function removeRental(index) {
    appState.rentalIncome.splice(index, 1);
    renderRentalList();
    saveState();
}

// Other Income Functions
function addOther() {
    const nameInput = document.getElementById('otherName');
    const amountInput = document.getElementById('otherAmount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || !amount || amount <= 0) {
        alert('Please enter a valid income source and monthly amount');
        return;
    }

    appState.otherIncome.push({ name, amount });

    nameInput.value = '';
    amountInput.value = '';

    renderOtherList();
    saveState();
}

function renderOtherList() {
    const listEl = document.getElementById('otherList');

    if (appState.otherIncome.length === 0) {
        listEl.innerHTML = '';
        document.getElementById('totalOther').style.display = 'none';
        return;
    }

    listEl.innerHTML = appState.otherIncome.map((item, index) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-name">${item.name}</div>
            </div>
            <span class="list-item-value">$${item.amount.toFixed(2)}</span>
            <button class="delete-btn" onclick="removeOther(${index})">×</button>
        </div>
    `).join('');

    const total = appState.otherIncome.reduce((sum, item) => sum + item.amount, 0);
    document.getElementById('totalOther').style.display = 'flex';
    document.getElementById('totalOtherValue').textContent = `$${total.toFixed(2)}`;
}

function removeOther(index) {
    appState.otherIncome.splice(index, 1);
    renderOtherList();
    saveState();
}

// Expense Functions
function addExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || !amount || amount <= 0) {
        alert('Please enter a valid expense name and monthly amount');
        return;
    }

    appState.expenses.push({ name, amount });

    nameInput.value = '';
    amountInput.value = '';

    renderExpenseList();
    saveState();
}

function renderExpenseList() {
    const listEl = document.getElementById('expenseList');

    if (appState.expenses.length === 0) {
        listEl.innerHTML = '';
        document.getElementById('totalExpenses').style.display = 'none';
        return;
    }

    listEl.innerHTML = appState.expenses.map((item, index) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-name">${item.name}</div>
            </div>
            <span class="list-item-value">$${item.amount.toFixed(2)}</span>
            <button class="delete-btn" onclick="removeExpense(${index})">×</button>
        </div>
    `).join('');

    const total = appState.expenses.reduce((sum, item) => sum + item.amount, 0);
    document.getElementById('totalExpenses').style.display = 'flex';
    document.getElementById('totalExpensesValue').textContent = `$${total.toFixed(2)}`;
}

function removeExpense(index) {
    appState.expenses.splice(index, 1);
    renderExpenseList();
    saveState();
}

// Goal Calculation Functions
function calculateGoals() {
    // Calculate total passive income (monthly)
    const rentalTotal = appState.rentalIncome.reduce((sum, item) => sum + item.amount, 0);
    const otherTotal = appState.otherIncome.reduce((sum, item) => sum + item.amount, 0);
    const portfolioTotal = appState.monthlyDividendIncome;

    appState.totalPassiveIncome = rentalTotal + otherTotal + portfolioTotal;

    // Sort expenses by amount (ASCENDING - smallest to largest)
    const sortedExpenses = [...appState.expenses].sort((a, b) => a.amount - b.amount);

    // Create cumulative tiers
    appState.goals = [];
    let cumulativeAmount = 0;

    sortedExpenses.forEach((expense, index) => {
        cumulativeAmount += expense.amount;

        // Calculate if this goal is achieved
        // Compare annual income vs annual expenses
        const annualIncome = appState.totalPassiveIncome * 12;
        const annualExpenseForTier = cumulativeAmount * 12;
        const achieved = annualIncome >= annualExpenseForTier;

        // Calculate investment needed to reach this goal
        // Portfolio must generate ALL the income for this cumulative goal
        let portfolioValueNeeded = 0;
        let additionalInvestmentNeeded = 0;

        if (appState.blendedYield > 0) {
            // Monthly income needed from portfolio (total goal amount)
            const monthlyIncomeNeededFromPortfolio = cumulativeAmount;

            // Annual income needed from portfolio
            const annualIncomeNeededFromPortfolio = monthlyIncomeNeededFromPortfolio * 12;

            // Portfolio value needed = annual income needed / (yield / 100)
            portfolioValueNeeded = annualIncomeNeededFromPortfolio / (appState.blendedYield / 100);

            // Additional investment needed = portfolio needed - current portfolio
            additionalInvestmentNeeded = Math.max(0, portfolioValueNeeded - appState.portfolioValue);
        }

        appState.goals.push({
            tier: index + 1,
            name: expense.name,
            amount: cumulativeAmount,
            expenses: sortedExpenses.slice(0, index + 1).map(e => e.name),
            achieved: achieved,
            portfolioValueNeeded: portfolioValueNeeded,
            additionalInvestmentNeeded: additionalInvestmentNeeded,
            monthlyIncomeNeeded: cumulativeAmount,
            currentMonthlyIncome: appState.totalPassiveIncome
        });
    });

    saveState();
}

// Congratulations Screen
function updateCongratsScreen() {
    const totalExpenses = appState.expenses.reduce((sum, item) => sum + item.amount, 0);
    const achievedGoals = appState.goals.filter(g => g.achieved).length;

    document.getElementById('summaryIncome').textContent = `$${appState.totalPassiveIncome.toFixed(0)}`;
    document.getElementById('summaryExpenses').textContent = `$${totalExpenses.toFixed(0)}`;
    document.getElementById('summaryGoals').textContent = `${achievedGoals}/${appState.goals.length}`;
}

// Dashboard Functions
function renderDashboard() {
    // Hide progress indicator on dashboard
    document.getElementById('progressIndicator').style.display = 'none';

    // Render summary section
    renderDashboardSummary();

    // Check if there are any goals
    if (appState.goals.length === 0) {
        // No goals - show message to add expenses
        document.getElementById('nextGoalTitleCompact').textContent = 'Enter expenses to create goals';
        document.getElementById('nextGoalTargetCompact').textContent = '$0/mo';
        document.getElementById('nextGoalCurrentPortfolio').textContent = '$0';
        document.getElementById('nextGoalPortfolioNeeded').textContent = '$0';
        document.getElementById('nextGoalAdditionalInvestment').textContent = '$0';
        document.getElementById('progressPercentage').textContent = '0%';
    } else {
        // Find next goal (first unachieved goal)
        const nextGoal = appState.goals.find(g => !g.achieved);

        // If all goals achieved, show the last goal
        const goalToHighlight = nextGoal || appState.goals[appState.goals.length - 1];

        if (goalToHighlight) {
            renderNextGoalCompact(goalToHighlight);
        }
    }

    renderAllGoalsCompact();
}

function renderNextGoalCompact(goal) {
    const progress = Math.min((appState.totalPassiveIncome / goal.amount) * 100, 100);

    // Use the stored portfolio values from calculateGoals
    const portfolioValueNeeded = goal.portfolioValueNeeded || 0;
    const additionalInvestmentNeeded = goal.additionalInvestmentNeeded || 0;

    document.getElementById('nextGoalTitleCompact').textContent = goal.name;
    document.getElementById('nextGoalTargetCompact').textContent = `$${goal.amount.toFixed(2)}/mo`;
    document.getElementById('nextGoalCurrentPortfolio').textContent = `$${appState.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('nextGoalPortfolioNeeded').textContent = `$${portfolioValueNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('nextGoalAdditionalInvestment').textContent = additionalInvestmentNeeded > 0
        ? `+$${additionalInvestmentNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : '$0';
    document.getElementById('progressPercentage').textContent = `${progress.toFixed(0)}%`;
}

function renderDashboardSummary() {
    // Total income
    const totalIncome = appState.totalPassiveIncome;
    document.getElementById('dashTotalIncome').textContent = `$${totalIncome.toFixed(2)}`;

    // Income breakdown - hidden
    document.getElementById('incomeBreakdown').innerHTML = '';

    // Total expenses
    const totalExpenses = appState.expenses.reduce((sum, item) => sum + item.amount, 0);
    document.getElementById('dashTotalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;

    // Expense breakdown - hidden
    document.getElementById('expenseBreakdown').innerHTML = '';

    // Goals achieved
    const achievedGoals = appState.goals.filter(g => g.achieved).length;
    document.getElementById('dashGoalsAchieved').textContent = `${achievedGoals}/${appState.goals.length}`;
}

function renderAllGoalsCompact() {
    const gridEl = document.getElementById('goalsGridCompact');

    if (appState.goals.length === 0) {
        gridEl.innerHTML = '<p>No goals created yet.</p>';
        return;
    }

    gridEl.innerHTML = appState.goals.map(goal => {
        const progress = Math.min((appState.totalPassiveIncome / goal.amount) * 100, 100);
        const achievedClass = goal.achieved ? 'achieved' : '';
        const statusIcon = goal.achieved ? '✓' : '○';

        // Use stored portfolio values from calculateGoals
        let investmentInfo = '';
        if (!goal.achieved && goal.portfolioValueNeeded > 0) {
            investmentInfo = `
                <div class="goal-investment-compact">
                    <div class="investment-label">Additional Investment:</div>
                    <div class="investment-value highlight">+$${goal.additionalInvestmentNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
            `;
        }

        return `
            <div class="goal-card-compact ${achievedClass}">
                <div class="goal-header-compact">
                    <span class="goal-tier-compact">Tier ${goal.tier}</span>
                    <span class="goal-status-compact">${statusIcon}</span>
                </div>
                <h4>${goal.name}</h4>
                <div class="goal-amount-compact">$${goal.amount.toFixed(2)}/mo</div>
                ${investmentInfo}
                <div class="goal-progress-compact">
                    <div class="goal-progress-fill-compact" style="width: ${progress}%"></div>
                </div>
                <div class="goal-progress-text-compact">${progress.toFixed(0)}% Complete</div>
            </div>
        `;
    }).join('');
}

// Reset Application
function resetApp() {
    if (confirm('Are you sure you want to start over? All data will be lost.')) {
        localStorage.removeItem('passiveIncomeGoalTracker');
        location.reload();
    }
}

// Expense Modal Functions
let originalExpenses = [];

function openExpenseModal() {
    // Store original expenses for comparison
    originalExpenses = JSON.parse(JSON.stringify(appState.expenses));

    // Populate modal with current expenses
    refreshExpenseModalDisplay();

    // Show modal
    document.getElementById('expenseEditModal').style.display = 'flex';
}

function refreshExpenseModalDisplay() {
    const expenseEditList = document.getElementById('expenseEditList');
    expenseEditList.innerHTML = '';

    appState.expenses.forEach((expense, index) => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-edit-item';
        expenseItem.innerHTML = `
            <input type="text" value="${expense.name}" onchange="updateExpenseInModal(${index}, 'name', this.value)" class="input-field">
            <input type="number" value="${expense.amount}" onchange="updateExpenseInModal(${index}, 'amount', parseFloat(this.value))" class="input-field" min="0" step="10">
            <button onclick="deleteExpenseFromModal(${index})">Delete</button>
        `;
        expenseEditList.appendChild(expenseItem);
    });
}

function closeExpenseModal() {
    // Restore original expenses if user cancels
    appState.expenses = JSON.parse(JSON.stringify(originalExpenses));

    // Clear input fields
    document.getElementById('modalExpenseName').value = '';
    document.getElementById('modalExpenseAmount').value = '';

    // Hide modal
    document.getElementById('expenseEditModal').style.display = 'none';
}

function updateExpenseInModal(index, field, value) {
    if (field === 'name') {
        appState.expenses[index].name = value;
    } else if (field === 'amount') {
        appState.expenses[index].amount = value;
    }
}

function deleteExpenseFromModal(index) {
    appState.expenses.splice(index, 1);
    refreshExpenseModalDisplay(); // Refresh display without resetting originalExpenses
}

function addExpenseFromModal() {
    const nameInput = document.getElementById('modalExpenseName');
    const amountInput = document.getElementById('modalExpenseAmount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid expense name and amount');
        return;
    }

    appState.expenses.push({ name, amount });

    // Clear inputs
    nameInput.value = '';
    amountInput.value = '';

    // Refresh modal display without resetting originalExpenses
    refreshExpenseModalDisplay();
}

function saveExpenseChanges() {
    // Check if expenses actually changed
    const expensesChanged = JSON.stringify(originalExpenses) !== JSON.stringify(appState.expenses);

    if (expensesChanged) {
        // Recalculate goals with new expense data
        calculateGoals();
        renderDashboard();
        saveState();
    }

    // Hide modal
    document.getElementById('expenseEditModal').style.display = 'none';

    // Clear input fields
    document.getElementById('modalExpenseName').value = '';
    document.getElementById('modalExpenseAmount').value = '';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('expenseEditModal');
    if (e.target === modal) {
        closeExpenseModal();
    }
});

// Allow Enter key to submit forms
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const activeStep = document.querySelector('.step.active');
        if (!activeStep) return;

        const stepId = activeStep.id;

        switch (stepId) {
            case 'step2':
                addTicker();
                break;
            case 'step3':
                addRental();
                break;
            case 'step4':
                addOther();
                break;
            case 'step5':
                addExpense();
                break;
        }
    }
});

// Typewriter effect for welcome message
function typeWelcomeMessage() {
    const welcomeText = "Hi! I'm your AI assistant. Ask me anything about passive income and financial goals.";
    const welcomeElement = document.getElementById('welcomeMessage');

    if (!welcomeElement) return;

    let charIndex = 0;
    welcomeElement.textContent = '';

    function typeChar() {
        if (charIndex < welcomeText.length) {
            welcomeElement.textContent += welcomeText.charAt(charIndex);
            charIndex++;
            setTimeout(typeChar, 30); // 30ms delay between characters
        }
    }

    // Start typing after a short delay
    setTimeout(typeChar, 500);
}

// Chatbot Functions
function toggleChatbot() {
    const chatbot = document.getElementById('chatbotContainer');
    const minimizeBtn = document.querySelector('.chatbot-minimize');

    chatbot.classList.toggle('minimized');

    // Update button text
    if (chatbot.classList.contains('minimized')) {
        minimizeBtn.textContent = '+';
    } else {
        minimizeBtn.textContent = '−';
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    addChatMessage(message, 'user');

    // Clear input
    input.value = '';

    // TODO: Send to AI backend
    // For now, show a placeholder response
    setTimeout(() => {
        addChatMessage('We are currently still working on adding the AI integration. Check back soon for an update!', 'bot');
    }, 500);
}

function addChatMessage(text, sender) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add Enter key support for chatbot input
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatbotInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

// Explicit user action to dismiss the Step 6 banner and continue
function dismissStep6Banner() {
    canProceedFromStep6 = true;
    if (appState.currentStep === 6) {
        nextStep();
    }
}
