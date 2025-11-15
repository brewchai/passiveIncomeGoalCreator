// Supabase Configuration
const SUPABASE_URL = 'https://vyzbczmrfxwkfjtwrlzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5emJjem1yZnh3a2ZqdHdybHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjQ4MzEsImV4cCI6MjA3NzYwMDgzMX0.w0rG3obToNSx_eBmxNuf7vemHoJa7ZrLdJjVDQjS2zM';

// Initialize Supabase client with localStorage persistence
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Application State
let appState = {
    currentStep: 0,
    // Step 1: Personal & Family Info
    career: '',
    city: '',
    relationshipStatus: '', // 'single', 'married', 'partnered'
    numberOfKids: 0,
    annualIncome: 0,
    // Step 2+: Investment & Income
    portfolio: [],
    portfolioValue: 0,
    blendedYield: 0,
    monthlyDividendIncome: 0,
    rentalIncome: [],
    // Step 4: Retirement Accounts
    retirementAccounts: [],
    // Step 5: Savings Accounts
    savingsAccounts: [],
    // Step 3: Houses
    houses: [],
    // Step 6: Expenses
    expenses: [],
    goals: [],
    totalPassiveIncome: 0
};

// Gate to control progression from Step 6 (calculating)
let canProceedFromStep6 = false;
let isUserAuthenticated = false;
let step3HouseListHTML = ''; // Temporary storage for house cards

// Listen to auth state changes (MUST be registered before DOMContentLoaded)
supabase.auth.onAuthStateChange(async (event, session) => {
    // console.log('🔐 Auth event:', event);

    // Treat both SIGNED_IN and INITIAL_SESSION as authenticated states
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // console.log('✅ User authenticated:', session.user.email);
        isUserAuthenticated = true;

        // Don't modify appState here - let DOMContentLoaded handle it after loadState
        closeSignupModal();

        // Alert only once per fresh auth
        if (!localStorage.getItem('supabase_session_handled')) {
            localStorage.setItem('supabase_session_handled', 'true');
        }
    }

    if (event === 'SIGNED_OUT') {
        // console.log('👋 User signed out');
        localStorage.removeItem('supabase_session_handled');
    }

    // if (event === 'TOKEN_REFRESHED') {
    //     console.log('🔄 Session refreshed');
    // }
});

// Load state from localStorage on page load
window.addEventListener('DOMContentLoaded', async () => {
    const appBody = document.body;
    const appLoader = document.getElementById('app-loader');
    try {
        // Simple client-side router
        if (window.location.pathname === '/blog') {
            window.location.href = '/blog.html';
            return; // Stop further execution for the blog page
        }

        const appContainer = document.querySelector('.container');
        // console.log('🚀 App starting...');

        // Manually handle OAuth callback
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
            // console.log('🔐 OAuth callback detected, manually setting session...');

            // Manually set the session with tokens from URL
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) {
                console.error('❌ Error setting session:', error);
            } else {
                // console.log('✅ Session set successfully:', data.session.user.email);
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                // Wait for auth listener to process the session
                // await new Promise(resolve => setTimeout(resolve, 200));
                // console.log('✅ Session established, continuing app load...');
            }
        }

        await loadState();
        // console.log('✅ State loaded');

        // If a valid session exists at load, always land on dashboard
        const { data: { session: domSession } } = await supabase.auth.getSession();
        if (domSession) {
            // console.log('🔍 DEBUG: appState before Supabase check:', JSON.stringify(appState));

            const { data: existingData } = await supabase
                .from('user_data')
                .select('app_state')
                .eq('user_id', domSession.user.id)
                .single();

            // Check if user has meaningful data in Supabase
            const hasDataInSupabase = existingData && existingData.app_state && (
                (existingData.app_state.expenses && existingData.app_state.expenses.length > 0) ||
                (existingData.app_state.portfolio && existingData.app_state.portfolio.length > 0) ||
                (existingData.app_state.houses && existingData.app_state.houses.length > 0) ||
                (existingData.app_state.retirementAccounts && existingData.app_state.retirementAccounts.length > 0) ||
                (existingData.app_state.savingsAccounts && existingData.app_state.savingsAccounts.length > 0)
            );

            // Check if user has meaningful data in localStorage (appState loaded earlier)
            const hasDataInLocalStorage = (
                (appState.expenses && appState.expenses.length > 0) ||
                (appState.portfolio && appState.portfolio.length > 0) ||
                (appState.houses && appState.houses.length > 0) ||
                (appState.retirementAccounts && appState.retirementAccounts.length > 0) ||
                (appState.savingsAccounts && appState.savingsAccounts.length > 0)
            );

            // If no data in either location, reject
            if (!hasDataInSupabase && !hasDataInLocalStorage) {
                // console.log('⚠️ First-time user with no data - signing out and redirecting to builder');
                await supabase.auth.signOut();
                appState.currentStep = 0;
                showStep(0);
                alert('Please complete the builder first to create your financial profile, then sign in to save your data.');
                return;
            }

            // If user has data in localStorage but not Supabase, save it now (first-time sign in)
            if (hasDataInLocalStorage && !hasDataInSupabase) {
                // console.log('💾 First sign-in with local data - saving to Supabase');
                await saveState();
            }

            // User has data, proceed to dashboard
            if (appState.currentStep !== 8) {
                appState.currentStep = 8;
            }

            // console.log('✅ User has existing data, rendering dashboard');
            showStep(8);
            renderDashboard(true); // Pass true to indicate user is authenticated
            // console.log('🧭 Dashboard rendered for authenticated user');
            return;
        }

        // Restore saved step for non-authenticated users
        if (appState.currentStep && appState.currentStep > 0) {
            // console.log(`🔄 Restoring saved step: ${appState.currentStep}`);
            showStep(appState.currentStep);

            // Render dashboard if saved step was dashboard
            if (appState.currentStep === 8) {
                renderDashboard();
            }
        }

        updateProgressBar();
        setupStep3Listeners();

        // console.log('✅ App initialized');
        appLoader.style.display = 'none';
        appContainer.style.visibility = 'visible';
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
    } finally {
        // THIS BLOCK ALWAYS RUNS
        // console.log('🎬 Finalizing app load...');
        appLoader.style.display = 'none';
        appBody.classList.remove('app-loading');
    }
});


// Save state to Supabase (with localStorage fallback)
async function saveState() {
    // Always save to localStorage as backup
    localStorage.setItem('passiveIncomeGoalTracker', JSON.stringify(appState));

    // Save to Supabase if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        try {
            const { error } = await supabase
                .from('user_data')
                .upsert({
                    user_id: session.user.id,
                    app_state: appState,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('Error saving to Supabase:', error);
            }
        } catch (err) {
            console.error('Supabase save failed:', err);
        }
    }
}

// Load state from Supabase (with localStorage fallback)
async function loadState() {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();

    let loadedFromSupabase = false;

    if (session) {
        // User is logged in - ALWAYS try Supabase first
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('app_state')
                .eq('user_id', session.user.id)
                .single();

            if (data && data.app_state) {
                appState = data.app_state;
                loadedFromSupabase = true;
                // console.log('✅ Loaded from Supabase:', data.app_state);
            } else if (error) {
                console.log('⚠️ Supabase query error:', error.code, error.message);
            }
        } catch (err) {
            console.error('❌ Supabase load exception:', err);
        }

        // If Supabase didn't work, ALWAYS fall back to localStorage
        if (!loadedFromSupabase) {
            // console.log('🆕 Falling back to localStorage');
            const saved = localStorage.getItem('passiveIncomeGoalTracker');
            if (saved) {
                try {
                    appState = JSON.parse(saved);
                    console.log('📦 Loaded from localStorage:', appState);
                } catch (e) {
                    console.error('❌ Failed to parse localStorage:', e);
                }
            } else {
                console.log('⚠️ No localStorage data found');
            }
        }
    } else {
        // No session - use localStorage
        const saved = localStorage.getItem('passiveIncomeGoalTracker');
        if (saved) {
            appState = JSON.parse(saved);
            // console.log('📦 Loaded from localStorage (no session)');
        }
    }

    // Restore UI if data exists
    if (appState && appState.currentStep) {

        // Initialize new fields for backward compatibility
        if (!appState.retirementAccounts) {
            appState.retirementAccounts = [];
        }
        if (appState.currentStep > 1) {
            // Restore UI state
            renderTickerList();
            renderRentalList();
            renderRetirementList();
            renderSavingsList();
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
        }

        // Restore Step 3 houses if they exist
        if (appState.currentStep >= 3 && appState.houses && appState.houses.length > 0) {
            renderHouseList();
        }

        // Restore Step 1 fields if they exist
        if (appState.currentStep >= 1) {
            const careerField = document.getElementById('careerField');
            const cityLocation = document.getElementById('cityLocation');
            const relationshipStatus = document.getElementById('relationshipStatus');
            const numberOfKids = document.getElementById('numberOfKids');
            const annualIncome = document.getElementById('annualIncome');

            if (careerField && appState.career) careerField.value = appState.career;
            if (cityLocation && appState.city) cityLocation.value = appState.city;
            if (relationshipStatus && appState.relationshipStatus) relationshipStatus.value = appState.relationshipStatus;
            if (numberOfKids && appState.numberOfKids !== undefined) numberOfKids.value = appState.numberOfKids;
            if (annualIncome && appState.annualIncome) annualIncome.value = appState.annualIncome;
        }

        if (appState.currentStep === 8) {
            renderDashboard();
        }
    }
}

// Step 1: Save personal and family data
function saveStep1Data() {
    const career = document.getElementById('careerField').value.trim();
    const city = document.getElementById('cityLocation').value.trim();
    const relationshipStatus = document.getElementById('relationshipStatus').value;
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value) || 0;
    const annualIncome = parseFloat(document.getElementById('annualIncome').value);

    if (!career || !city || !relationshipStatus || isNaN(annualIncome) || annualIncome < 0) {
        alert('Please fill in all required fields with valid information');
        return;
    }

    if (numberOfKids < 0 || numberOfKids > 20) {
        alert('Please enter a valid number of kids (0-20)');
        return;
    }

    appState.career = career;
    appState.city = city;
    appState.relationshipStatus = relationshipStatus;
    appState.numberOfKids = numberOfKids;
    appState.annualIncome = annualIncome;

    saveState();
    nextStep();
}

// Navigation Functions
function nextStep() {
    window.scrollTo(0, 0);

    const currentStepEl = document.getElementById(`step${appState.currentStep}`);
    currentStepEl.classList.remove('active');

    appState.currentStep++;

    // Special handling for calculation step
    if (appState.currentStep === 7) {
        showStep(7);
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
                    header.textContent = 'Your dashboard is now fully setup';
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
    window.scrollTo(0, 0);

    const currentStepEl = document.getElementById(`step${appState.currentStep}`);
    currentStepEl.classList.remove('active');

    appState.currentStep--;
    showStep(appState.currentStep);
    saveState();
}

function showStep(stepNumber) {
    // Hard hide all steps to prevent any overlay (including landing page)
    const allSteps = document.querySelectorAll('.step');
    allSteps.forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    const stepEl = document.getElementById(`step${stepNumber}`);
    if (stepEl) {
        stepEl.style.display = 'block';
        stepEl.classList.add('active');
    }

    // Restore Step 3 house list if returning to it
    if (stepNumber === 3 && step3HouseListHTML) {
        setTimeout(() => {
            const houseList = document.getElementById('houseList');
            if (houseList) {
                houseList.innerHTML = step3HouseListHTML;
                updateHouseSummary();
            }
        }, 0);
    }

    updateProgressBar();
}

function updateProgressBar() {
    const progressIndicator = document.getElementById('progressIndicator');

    // Hide progress bar on landing page (step 0), transition screens (steps 7-8), and dashboard (step 9)
    if (appState.currentStep === 0 || appState.currentStep >= 7) {
        progressIndicator.style.display = 'none';
        return;
    }

    progressIndicator.style.display = 'block';
    const progress = (appState.currentStep / 6) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `Step ${appState.currentStep} of 6`;
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
const CHAT_ENDPOINT = `${API_BASE_URL}/chat`;

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

    if (!name || isNaN(amount) || amount < 0) {
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

    // Skip if element doesn't exist (Step 3 redesigned)
    if (!listEl) return;

    if (appState.rentalIncome.length === 0) {
        listEl.innerHTML = '';
        const totalEl = document.getElementById('totalRental');
        if (totalEl) totalEl.style.display = 'none';
        return;
    }

    listEl.innerHTML = appState.rentalIncome.map((item, index) => `
        <div class="income-item">
            <span>${item.name}: $${item.amount.toFixed(2)}/month</span>
            <button class="btn-remove" onclick="removeRental(${index})">Remove</button>
        </div>
    `).join('');

    const total = appState.rentalIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalEl = document.getElementById('totalRental');
    const totalValueEl = document.getElementById('totalRentalValue');
    if (totalEl) totalEl.style.display = 'flex';
    if (totalValueEl) totalValueEl.textContent = `$${total.toFixed(2)}`;
}

function removeRental(index) {
    appState.rentalIncome.splice(index, 1);
    renderRentalList();
    saveState();
}

// Savings Account Functions
function addSavings() {
    const nameInput = document.getElementById('savingsName');
    const amountInput = document.getElementById('savingsAmount');
    const rateInput = document.getElementById('savingsInterestRate');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const interestRate = parseFloat(rateInput.value);

    if (!name || isNaN(amount) || amount < 0 || isNaN(interestRate) || interestRate < 0) {
        alert('Please enter a valid account name, balance, and interest rate');
        return;
    }

    if (!appState.savingsAccounts) {
        appState.savingsAccounts = [];
    }

    appState.savingsAccounts.push({ name, amount, interestRate });

    nameInput.value = '';
    amountInput.value = '';
    rateInput.value = '';

    renderSavingsList();
    saveState();
}

function renderSavingsList() {
    const listEl = document.getElementById('savingsList');

    if (!listEl) return;

    if (!appState.savingsAccounts || appState.savingsAccounts.length === 0) {
        listEl.innerHTML = '';
        document.getElementById('totalSavings').style.display = 'none';
        return;
    }

    listEl.innerHTML = appState.savingsAccounts.map((item, index) => {
        const monthlyInterest = (item.amount * (item.interestRate / 100)) / 12;
        return `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-name">${item.name}</div>
                <div class="list-item-details">Balance: $${item.amount.toFixed(2)} • Rate: ${item.interestRate.toFixed(2)}%</div>
            </div>
            <div class="list-item-value">
                <div style="font-size: 0.875rem; color: #6b7280;">$${monthlyInterest.toFixed(2)}/mo</div>
            </div>
            <button class="delete-btn" onclick="removeSavings(${index})">×</button>
        </div>
    `;
    }).join('');

    const totalBalance = appState.savingsAccounts.reduce((sum, item) => sum + item.amount, 0);
    const totalMonthlyInterest = appState.savingsAccounts.reduce((sum, item) => sum + ((item.amount * (item.interestRate / 100)) / 12), 0);

    document.getElementById('totalSavings').style.display = 'block';
    document.getElementById('totalSavingsBalance').textContent = `$${totalBalance.toFixed(2)}`;
    document.getElementById('monthlySavingsInterest').textContent = `$${totalMonthlyInterest.toFixed(2)}`;
}

function removeSavings(index) {
    appState.savingsAccounts.splice(index, 1);
    renderSavingsList();
    saveState();
}

// Helper function to calculate total retirement value
function getTotalRetirementValue() {
    if (!appState.retirementAccounts || appState.retirementAccounts.length === 0) {
        return 0;
    }
    return appState.retirementAccounts.reduce((sum, account) => sum + account.balance, 0);
}

// Retirement Account Functions
function addRetirementAccount() {
    const typeInput = document.getElementById('retirementAccountType');
    const balanceInput = document.getElementById('retirementAccountBalance');

    const type = typeInput.value;
    const balance = parseFloat(balanceInput.value);

    if (!type) {
        alert('Please select an account type');
        return;
    }

    if (isNaN(balance) || balance < 0) {
        alert('Please enter a valid account balance');
        return;
    }

    appState.retirementAccounts.push({
        type,
        balance
    });

    typeInput.value = '';
    balanceInput.value = '';

    renderRetirementList();
    saveState();
}

function getAccountTypeLabel(type) {
    const typeLabels = {
        '401k': '401(k)',
        'roth-ira': 'Roth IRA',
        'traditional-ira': 'Traditional IRA',
        '403b': '403(b)',
        'sep-ira': 'SEP IRA',
        'simple-ira': 'SIMPLE IRA',
        'pension': 'Pension',
        'other': 'Other Retirement Account'
    };
    return typeLabels[type] || 'Retirement Account';
}

function renderRetirementList() {
    const listEl = document.getElementById('retirementList');

    if (!listEl) return;

    // Ensure retirementAccounts exists
    if (!appState.retirementAccounts || appState.retirementAccounts.length === 0) {
        listEl.innerHTML = '';
        const totalEl = document.getElementById('totalRetirement');
        if (totalEl) totalEl.style.display = 'none';
        return;
    }

    listEl.innerHTML = appState.retirementAccounts.map((account, index) => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-name">${getAccountTypeLabel(account.type)}</div>
            </div>
            <span class="list-item-value">$${account.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <button class="delete-btn" onclick="removeRetirementAccount(${index})">&times;</button>
        </div>
    `).join('');

    const total = appState.retirementAccounts.reduce((sum, account) => sum + account.balance, 0);
    const totalEl = document.getElementById('totalRetirement');
    const totalValueEl = document.getElementById('totalRetirementValue');
    if (totalEl) totalEl.style.display = 'flex';
    if (totalValueEl) totalValueEl.textContent = `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function removeRetirementAccount(index) {
    appState.retirementAccounts.splice(index, 1);
    renderRetirementList();
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
    const rentalTotal = (appState.rentalIncome && appState.rentalIncome.length > 0)
        ? appState.rentalIncome.reduce((sum, item) => sum + item.amount, 0)
        : 0;
    const savingsInterestTotal = (appState.savingsAccounts && appState.savingsAccounts.length > 0)
        ? appState.savingsAccounts.reduce((sum, item) => sum + ((item.amount * (item.interestRate / 100)) / 12), 0)
        : 0;
    const portfolioTotal = appState.monthlyDividendIncome;

    appState.totalPassiveIncome = rentalTotal + savingsInterestTotal + portfolioTotal;

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
        // Portfolio should only cover the shortfall not covered by rental + other income
        let portfolioValueNeeded = 0;
        let additionalInvestmentNeeded = 0;

        if (appState.blendedYield > 0) {
            // Compute non-portfolio income (monthly)
            const rentalTotal = (appState.rentalIncome && appState.rentalIncome.length > 0)
                ? appState.rentalIncome.reduce((sum, item) => sum + item.amount, 0)
                : 0;
            const otherTotal = (appState.otherIncome && appState.otherIncome.length > 0)
                ? appState.otherIncome.reduce((sum, item) => sum + item.amount, 0)
                : 0;
            const nonPortfolioMonthlyIncome = rentalTotal + otherTotal;

            // Monthly income needed from portfolio = max(0, goal amount - non-portfolio income)
            const monthlyIncomeNeededFromPortfolio = Math.max(0, cumulativeAmount - nonPortfolioMonthlyIncome);

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
function renderDashboard(isAuthenticated = false) {
    // Hide progress indicator on dashboard
    document.getElementById('progressIndicator').style.display = 'none';

    // Render summary section
    renderDashboardSummary();

    // Render optimization charts
    renderDashboardIncomeChart();
    renderDashboardExpenseChart();

    // Fetch AI optimization tips
    fetchIncomeTip();
    fetchExpenseTip();

    // Check if there are any goals
    if (appState.goals.length === 0) {
        // No goals - show message to add expenses
        const totalHouseValue = (appState.houses && appState.houses.length > 0)
            ? appState.houses.reduce((sum, house) => sum + house.value, 0)
            : 0;
        const totalRetirementValue = getTotalRetirementValue();
        const totalCurrentPortfolio = appState.portfolioValue + totalRetirementValue + totalHouseValue;

        document.getElementById('nextGoalTitleCompact').textContent = 'Enter expenses to create goals';
        document.getElementById('nextGoalTargetCompact').textContent = '$0/mo';
        document.getElementById('nextGoalCurrentPortfolio').textContent = `$${totalCurrentPortfolio.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        // document.getElementById('nextGoalPortfolioNeeded').textContent = '$0';
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

    // Show signup modal if user hasn't signed up yet (only for non-authenticated users)
    if (!isAuthenticated) {
        showSignupModal();
    }
}

function renderNextGoalCompact(goal) {
    const progress = Math.min((appState.totalPassiveIncome / goal.amount) * 100, 100);
    const achievedClass = goal.achieved ? 'achieved' : '';
    const statusIcon = goal.achieved ? '✓' : '○';

    // Use stored portfolio values from calculateGoals
    let investmentInfo = '';
    // Hide additional investment needed
    // if (!goal.achieved && goal.portfolioValueNeeded > 0) {
    //     investmentInfo = `
    //         <div class="goal-investment-compact">
    //             <div class="investment-label">Additional Investment:</div>
    //             <div class="investment-value highlight">+$${goal.additionalInvestmentNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    //         </div>
    //     `;
    // }

    document.getElementById('nextGoalTitleCompact').textContent = goal.name;
    document.getElementById('nextGoalTargetCompact').textContent = `$${goal.amount.toFixed(2)}/mo`;
    document.getElementById('nextGoalCurrentPortfolio').textContent = `$${(appState.portfolioValue + getTotalRetirementValue()).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    // document.getElementById('nextGoalPortfolioNeeded').textContent = `$${portfolioValueNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    // Hide additional investment needed completely
    const additionalInvestmentElement = document.getElementById('nextGoalAdditionalInvestment');
    if (additionalInvestmentElement && additionalInvestmentElement.parentElement) {
        additionalInvestmentElement.parentElement.style.display = 'none';
    }
    document.getElementById('progressPercentage').textContent = `${progress.toFixed(0)}%`;
}

// Shared FI Year calculation function
function calculateProjectedFIYear() {
    const totalMonthlyIncome = appState.totalPassiveIncome + (appState.annualIncome ? appState.annualIncome / 12 : 0);
    const totalMonthlyExpenses = (appState.expenses && appState.expenses.length > 0)
        ? appState.expenses.reduce((sum, item) => sum + item.amount, 0)
        : 0;
    const annualExpenses = totalMonthlyExpenses * 12;
    const fireNumber = annualExpenses / 0.04;
    const totalHouseValue = (appState.houses && appState.houses.length > 0)
        ? appState.houses.reduce((sum, house) => sum + house.value, 0)
        : 0;
    const totalRetirementValue = getTotalRetirementValue();
    const currentPortfolioValue = appState.portfolioValue + totalRetirementValue;
    const projectedMonthlySavings = Math.max(0, totalMonthlyIncome - totalMonthlyExpenses);
    const expectedReturnRate = 0.05;
    const currentYear = new Date().getFullYear();

    let projectedFIYear = 'Never';
    let yearsToGo = 0;
    let finalValue = currentPortfolioValue + totalHouseValue;

    if (projectedMonthlySavings > 0 && fireNumber > 0) {
        // Month-by-month simulation
        let months = 0;
        let portfolioValue = currentPortfolioValue;
        const monthlyReturn = expectedReturnRate / 12;

        // Log first few months for verification
        let loggedMonths = 0;

        // FIXED: Only compare portfolio value (not including house) to FIRE number
        while (portfolioValue < fireNumber && months < 600) {
            const beforeGrowth = portfolioValue;
            portfolioValue = portfolioValue * (1 + monthlyReturn);
            const afterGrowth = portfolioValue;
            portfolioValue += projectedMonthlySavings;
            months++;

            // Log first 3 months and every 12 months thereafter
            if (loggedMonths < 3 || months % 12 === 0) {

                loggedMonths++;
            }
        }

        const t = months / 12;
        finalValue = portfolioValue + totalHouseValue; // Total net worth for display only



        if (portfolioValue >= fireNumber && t < 50) {
            projectedFIYear = Math.ceil(currentYear + t);
            yearsToGo = Math.ceil(t);

        } else {
            console.log('\n⚠️  FI NOT ACHIEVABLE within 50 years');
        }
    } else {
        console.log('\n⚠️  CANNOT CALCULATE: Monthly savings or FIRE number is zero/negative');
    }

    return {
        projectedFIYear,
        yearsToGo,
        finalValue,
        fireNumber,
        currentNetWorth: currentPortfolioValue + totalHouseValue,
        projectedMonthlySavings,
        currentPortfolioValue,
        totalHouseValue
    };
}

function renderDashboardSummary() {
    // Total income (passive + job income)
    const totalIncome = appState.totalPassiveIncome + (appState.annualIncome ? appState.annualIncome / 12 : 0);
    document.getElementById('dashTotalIncome').textContent = `$${totalIncome.toFixed(2)}`;

    // Income breakdown - hidden
    document.getElementById('incomeBreakdown').innerHTML = '';

    // Total expenses
    const totalExpenses = (appState.expenses && appState.expenses.length > 0)
        ? appState.expenses.reduce((sum, item) => sum + item.amount, 0)
        : 0;
    document.getElementById('dashTotalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;

    // Expense breakdown - hidden
    document.getElementById('expenseBreakdown').innerHTML = '';

    // Savings Rate calculation
    const totalMonthlyIncome = appState.totalPassiveIncome + (appState.annualIncome ? appState.annualIncome / 12 : 0);
    const totalMonthlyExpenses = (appState.expenses && appState.expenses.length > 0)
        ? appState.expenses.reduce((sum, item) => sum + item.amount, 0)
        : 0;
    const monthlySavings = Math.max(0, totalMonthlyIncome - totalMonthlyExpenses);
    const savingsRate = totalMonthlyIncome > 0 ? (monthlySavings / totalMonthlyIncome) * 100 : 0;

    document.getElementById('dashGoalsAchieved').textContent = `${savingsRate.toFixed(1)}%`;

    // FIRE Number calculation (4% safe withdrawal rule)
    const annualExpensesTarget = totalMonthlyExpenses * 12;
    const fireNumber = annualExpensesTarget / 0.04;
    document.getElementById('dashFIPercentage').textContent = `$${fireNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    // Use shared FI Year calculation
    const fiData = calculateProjectedFIYear();
    document.getElementById('dashProjectedFIYear').textContent = fiData.projectedFIYear;
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
        // Hide additional investment needed
        // if (!goal.achieved && goal.portfolioValueNeeded > 0) {
        //     investmentInfo = `
        //         <div class="goal-investment-compact">
        //             <div class="investment-label">Additional Investment:</div>
        //             <div class="investment-value highlight">+$${goal.additionalInvestmentNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        //         </div>
        //     `;
        // }

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
let expenseChart = null;

function openExpenseModal() {

    // Store original expenses for comparison
    originalExpenses = JSON.parse(JSON.stringify(appState.expenses));

    // Populate modal with current expenses
    refreshExpenseModalDisplay();

    // Show modal with Edit tab active by default
    switchExpenseTab('edit');

    // Show modal
    document.getElementById('expenseEditModal').style.display = 'flex';
}

function switchExpenseTab(tabName) {
    // Since we only have edit tab now, just make sure it's active
    const editContent = document.getElementById('contentExpenseEdit');
    if (editContent) {
        editContent.classList.add('active');
    }
}

function renderExpenseBreakdownChart() {
    const totalExpenses = appState.expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Prepare chart data
    const data = [];
    const labels = [];
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
    ];

    appState.expenses.forEach((expense, index) => {
        if (expense.amount > 0) {
            labels.push(expense.name);
            data.push(expense.amount);
        }
    });

    // Destroy existing chart if it exists
    if (expenseChart) {
        expenseChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById('expenseBreakdownChart');
    if (ctx && totalExpenses > 0) {
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            font: {
                                size: 12
                            },
                            generateLabels: function (chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / totalExpenses) * 100).toFixed(1);
                                    return {
                                        text: `${label}: $${value.toFixed(0)} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const percentage = ((value / totalExpenses) * 100).toFixed(1);
                                return `${label}: $${value.toFixed(0)}/mo (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else if (ctx) {
        // Show message if no expenses
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    }
}

function refreshExpenseModalDisplay() {


    const expenseEditList = document.getElementById('expenseEditList');
    if (!expenseEditList) {
        console.error('❌ expenseEditList element not found!');
        return;
    }

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
    renderExpenseBreakdownChart();
}

function deleteExpenseFromModal(index) {
    appState.expenses.splice(index, 1);
    refreshExpenseModalDisplay();
    renderExpenseBreakdownChart();
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
    renderExpenseBreakdownChart();
}

function saveExpenseChanges() {


    // Check if expenses actually changed
    const expensesChanged = JSON.stringify(originalExpenses) !== JSON.stringify(appState.expenses);


    try {
        if (expensesChanged) {
            // Recalculate goals with new expense data
            calculateGoals();
            renderDashboard();
            renderExpenseList(); // Update the expense list in the sidebar
            saveState();

            // Update originalExpenses to match the saved state
            originalExpenses = JSON.parse(JSON.stringify(appState.expenses));
        } else {
            console.log('⚠️ No changes detected, not saving');
        }
    } catch (error) {
        console.error('❌ Error saving expenses:', error);
    }

    // Hide modal (do this regardless of save success/failure)

    const modal = document.getElementById('expenseEditModal');
    if (modal) {
        modal.style.display = 'none';

    } else {
        console.error('❌ Modal element not found!');
    }

    // Clear input fields
    document.getElementById('modalExpenseName').value = '';
    document.getElementById('modalExpenseAmount').value = '';
}

// Income Modal Functions
let originalIncomeData = {};

// Sync rental income from houses that generate rental income
function syncRentalIncomeFromHouses() {
    // Get houses that generate rental income
    const rentalHouses = appState.houses.filter(house => house.generatesRental && house.monthlyRentalIncome > 0);

    // Clear existing rental income from houses (keep only manually added ones)
    // We'll identify house-based rentals by checking if the name matches a house name
    const houseNames = appState.houses.map(house => house.name);
    appState.rentalIncome = appState.rentalIncome.filter(rental => !houseNames.includes(rental.name));

    // Add rental income from houses
    rentalHouses.forEach(house => {
        appState.rentalIncome.push({
            name: house.name,
            amount: house.monthlyRentalIncome,
            fromHouse: true // Mark as coming from house data
        });
    });
}

// Sync mortgage payments from houses as expenses
function syncMortgageExpensesFromHouses() {
    // Get houses with mortgage payments
    const mortgageHouses = appState.houses.filter(house => house.paidOffStatus === 'no' && house.mortgagePayment > 0);

    // Clear existing mortgage expenses from houses (keep only manually added ones)
    // We'll identify house-based expenses by checking if the name contains the house name + "Mortgage"
    appState.expenses = appState.expenses.filter(expense => {
        return !appState.houses.some(house => expense.name === `${house.name} Mortgage`);
    });

    // Add mortgage payments as expenses
    mortgageHouses.forEach(house => {
        appState.expenses.push({
            name: `${house.name} Mortgage`,
            amount: house.mortgagePayment,
            fromHouse: true // Mark as coming from house data
        });
    });
}

let incomeChart = null;

function openIncomeModal() {
    // Store original income data for comparison
    originalIncomeData = {
        portfolio: JSON.parse(JSON.stringify(appState.portfolio)),
        rentalIncome: JSON.parse(JSON.stringify(appState.rentalIncome)),
        savingsAccounts: JSON.parse(JSON.stringify(appState.savingsAccounts || []))
    };

    // Populate modal with current income data
    refreshStockModalDisplay();
    refreshRentalModalDisplay();
    refreshJobIncomeDisplay();

    // Show modal with Job Income tab active by default
    switchIncomeTab('job');

    // Show modal
    document.getElementById('incomeEditModal').style.display = 'flex';
}

// Dashboard Charts
let dashboardIncomeChart = null;
let dashboardExpenseChart = null;

// AI Tips state
let incomeTip = '';
let expenseTip = '';
const MAX_TIP_HISTORY = 6;
const incomeTipHistory = [];
const expenseTipHistory = [];

function normalizeTipText(tip) {
    return (tip || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function addTipToHistory(historyArray, tip) {
    if (!tip) return;
    const normalized = normalizeTipText(tip);
    const exists = historyArray.some(existing => normalizeTipText(existing) === normalized);
    if (exists) return;
    historyArray.push(tip);
    if (historyArray.length > MAX_TIP_HISTORY) {
        historyArray.shift();
    }
}

function buildHistoryReminder(historyArray) {
    if (!historyArray || historyArray.length === 0) return '';
    const bullets = historyArray.map(item => `- ${item}`).join('\n');
    return `Previously suggested tips (do NOT repeat these ideas or topics):\n${bullets}\n`;
}

function setTipButtonState(type, isLoading) {
    const buttonId = type === 'income' ? 'refreshIncomeTipBtn' : 'refreshExpenseTipBtn';
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Refreshing…' : '↻ Refresh Tip';
}

// Fetch AI tip for income optimization
async function fetchIncomeTip({ isRefresh = false } = {}) {
    const historyPrompt = buildHistoryReminder(incomeTipHistory);
    try {
        const incomeData = {
            jobIncome: appState.annualIncome ? appState.annualIncome / 12 : 0,
            stockIncome: appState.monthlyDividendIncome || 0,
            rentalIncome: appState.rentalIncome.reduce((sum, r) => sum + r.amount, 0),
            savingsInterestIncome: (appState.savingsAccounts || []).reduce((sum, s) => sum + ((s.amount * (s.interestRate / 100)) / 12), 0),
            retirementValue: getTotalRetirementValue()
        };

        const totalIncome = incomeData.jobIncome + incomeData.stockIncome + incomeData.rentalIncome + incomeData.savingsInterestIncome;
        const jobPercent = totalIncome > 0 ? (incomeData.jobIncome / totalIncome * 100).toFixed(0) : 0;
        const randomSeed = Math.floor(Math.random() * 1000);

        const response = await fetch(CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `${historyPrompt}INCOME: Job $${incomeData.jobIncome.toFixed(0)} (${jobPercent}%), Stocks $${incomeData.stockIncome.toFixed(0)}, Rental $${incomeData.rentalIncome.toFixed(0)}, Savings Interest $${incomeData.savingsInterestIncome.toFixed(0)}

Give ONE creative financial tip using these EXACT numbers. Vary your approach each time.

GOOD examples:
"You could consider **negotiating a 5% raise** to add $${(incomeData.jobIncome * 0.05 * 12).toFixed(0)}/yr to income."
"Consider **moving $10K to 4.5% HYSA** for $450/yr extra interest."
"Try **automating $200/mo to investments** to build wealth faster."

BAD (too generic):
"Diversify income" "Invest more" "Save money"

RULES: Max 18 words. MUST start with "Consider", "Try", or "You could consider". Use **bold** for action. Include specific $ amounts. Be creative and VARY your suggestions. Seed: ${randomSeed}`
            })
        });

        const data = await response.json();
        incomeTip = data.reply || 'No tip available';
        addTipToHistory(incomeTipHistory, incomeTip);

        // Update UI with HTML rendering for markdown
        const tipElement = document.getElementById('incomeTipText');
        if (tipElement) {
            let formattedTip = incomeTip
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e40af; font-weight: 600;">$1</strong>')
                .replace(/\$(\d+)/g, '<span style="color: #059669; font-weight: 600;">$$$1</span>');
            tipElement.innerHTML = formattedTip;
        }
    } catch (error) {
        console.error('Error fetching income tip:', error);
        incomeTip = 'Unable to fetch tip';
        const tipElement = document.getElementById('incomeTipText');
        if (tipElement) {
            let formattedTip = incomeTip
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e40af; font-weight: 600;">$1</strong>')
                .replace(/\$(\d+)/g, '<span style="color: #059669; font-weight: 600;">$$$1</span>');
            tipElement.innerHTML = formattedTip;
        }
    } finally {
        if (isRefresh) {
            setTipButtonState('income', false);
        }
    }
}

// Fetch AI tip for expense optimization
async function fetchExpenseTip({ isRefresh = false } = {}) {
    if (!appState.expenses || appState.expenses.length === 0) {
        const tipElement = document.getElementById('expenseTipText');
        if (tipElement) {
            tipElement.innerHTML = 'Add expenses to get personalized tips';
        }
        if (isRefresh) {
            setTipButtonState('expense', false);
        }
        return;
    }

    const historyPrompt = buildHistoryReminder(expenseTipHistory);

    try {
        const expenseData = appState.expenses.map(e => `${e.name}: $${e.amount}`).join(', ');
        const totalExpenses = appState.expenses.reduce((sum, e) => sum + e.amount, 0);

        const sortedExpenses = appState.expenses
            .filter(e => e.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        if (sortedExpenses.length === 0) {
            const tipElement = document.getElementById('expenseTipText');
            if (tipElement) {
                tipElement.innerHTML = 'Add expenses to get personalized tips';
            }
            return;
        }

        const expenseList = sortedExpenses.map(e =>
            `${e.name} $${e.amount} (${(e.amount / totalExpenses * 100).toFixed(0)}%)`
        ).join(', ');
        const largestExpense = sortedExpenses[0];
        const randomSeed = Math.floor(Math.random() * 1000);

        const response = await fetch(CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `${historyPrompt}EXPENSES: ${expenseList}
TOTAL: $${totalExpenses}/mo

Give ONE creative money-saving tip using these EXACT numbers. Vary your approach each time.

GOOD examples:
"Consider **negotiating your $${largestExpense.amount} ${largestExpense.name}** to save $${(largestExpense.amount * 0.15).toFixed(0)}/mo."
"You could consider **automating $${(totalExpenses * 0.1).toFixed(0)}/mo to savings** before spending."
"Try **auditing subscriptions quarterly** to find $100-200/yr in waste."

BAD (too vague):
"Reduce expenses" "Cut back" "Be more frugal"

RULES: Max 18 words. MUST start with "Consider", "Try", or "You could consider". Use **bold** for action. Calculate specific $ savings. Be creative and VARY suggestions. Seed: ${randomSeed}`
            })
        });

        const data = await response.json();
        expenseTip = data.reply || 'No tip available';

        addTipToHistory(expenseTipHistory, expenseTip);

        const tipElement = document.getElementById('expenseTipText');
        if (tipElement) {
            let formattedTip = expenseTip
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e40af; font-weight: 600;">$1</strong>')
                .replace(/\$(\d+)/g, '<span style="color: #059669; font-weight: 600;">$$$1</span>')
                .replace(/(\d+)%/g, '<span style="color: #059669; font-weight: 600;">$1%</span>');
            tipElement.innerHTML = formattedTip;
        }
    } catch (error) {
        console.error('Error fetching expense tip:', error);
        expenseTip = 'Unable to fetch tip';
        const tipElement = document.getElementById('expenseTipText');
        if (tipElement) {
            let formattedTip = expenseTip
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e40af; font-weight: 600;">$1</strong>')
                .replace(/\$(\d+)/g, '<span style="color: #059669; font-weight: 600;">$$$1</span>')
                .replace(/(\d+)%/g, '<span style="color: #059669; font-weight: 600;">$1%</span>');
            tipElement.innerHTML = formattedTip;
        }
    } finally {
        if (isRefresh) {
            setTipButtonState('expense', false);
        }
    }
}

function refreshIncomeTip() {
    setTipButtonState('income', true);
    fetchIncomeTip({ isRefresh: true });
}

function refreshExpenseTip() {
    setTipButtonState('expense', true);
    fetchExpenseTip({ isRefresh: true });
}

// Open chat with context
function openChatWithContext(type) {
    // Open the chat modal/interface
    // This will be implemented when you have a chat interface
    // console.log(`Opening chat for ${type} optimization`);
    alert(`Chat feature coming soon! This will help you optimize your ${type}.`);
}

// Shared rank-based color palette for consistent coloring across charts
const RANK_COLORS = [
    '#8b5cf6', // Purple - Rank 1 (largest)
    '#3b82f6', // Blue - Rank 2
    '#10b981', // Green - Rank 3
    '#f59e0b', // Orange - Rank 4
    '#ef4444', // Red - Rank 5
    '#ec4899', // Pink - Rank 6
    '#06b6d4', // Cyan - Rank 7
    '#eab308', // Yellow - Rank 8
    '#a855f7', // Violet - Rank 9
    '#14b8a6', // Teal - Rank 10
    '#f97316', // Orange-red - Rank 11
    '#84cc16', // Lime - Rank 12
    '#6366f1', // Indigo - Rank 13
    '#d946ef', // Fuchsia - Rank 14
    '#f43f5e'  // Rose - Rank 15
];

function renderDashboardIncomeChart() {
    // Calculate monthly income from each source
    const jobIncome = appState.annualIncome ? appState.annualIncome / 12 : 0;
    const stockIncome = appState.monthlyDividendIncome || 0;
    const rentalIncome = appState.rentalIncome.reduce((sum, rental) => sum + rental.amount, 0);
    const savingsInterestIncome = (appState.savingsAccounts || []).reduce((sum, savings) => sum + ((savings.amount * (savings.interestRate / 100)) / 12), 0);

    const totalIncome = jobIncome + stockIncome + rentalIncome + savingsInterestIncome;

    // Prepare chart data with sorting
    const incomeItems = [];
    if (jobIncome > 0) incomeItems.push({ label: 'Job Income', value: jobIncome });
    if (stockIncome > 0) incomeItems.push({ label: 'Stocks', value: stockIncome });
    if (rentalIncome > 0) incomeItems.push({ label: 'Real Estate', value: rentalIncome });
    if (savingsInterestIncome > 0) incomeItems.push({ label: 'Savings Interest', value: savingsInterestIncome });

    // Sort by value descending (largest first)
    incomeItems.sort((a, b) => b.value - a.value);

    const data = incomeItems.map(item => item.value);
    const labels = incomeItems.map(item => item.label);
    const colors = incomeItems.map((item, index) => RANK_COLORS[index % RANK_COLORS.length]);

    // Destroy existing chart if it exists
    if (dashboardIncomeChart) {
        dashboardIncomeChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById('dashboardIncomeChart');
    if (ctx && totalIncome > 0) {
        dashboardIncomeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                size: 14
                            },
                            generateLabels: function (chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / totalIncome) * 100).toFixed(0);
                                    return {
                                        text: label,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const percentage = ((value / totalIncome) * 100).toFixed(1);
                                return `${label}: $${value.toFixed(0)}/mo (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else if (ctx) {
        // Show message if no income
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    }
}

function renderDashboardExpenseChart() {
    const totalExpenses = appState.expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Prepare chart data with sorting
    const expenseItems = [];
    appState.expenses.forEach((expense) => {
        if (expense.amount > 0) {
            expenseItems.push({ label: expense.name, value: expense.amount });
        }
    });

    // Sort by value descending (largest first)
    expenseItems.sort((a, b) => b.value - a.value);

    const data = expenseItems.map(item => item.value);
    const labels = expenseItems.map(item => item.label);
    const colors = expenseItems.map((item, index) => RANK_COLORS[index % RANK_COLORS.length]);

    // Destroy existing chart if it exists
    if (dashboardExpenseChart) {
        dashboardExpenseChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById('dashboardExpenseChart');
    if (ctx && totalExpenses > 0) {
        dashboardExpenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                size: 14
                            },
                            generateLabels: function (chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / totalExpenses) * 100).toFixed(0);
                                    return {
                                        text: label,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const percentage = ((value / totalExpenses) * 100).toFixed(1);
                                return `${label}: $${value.toFixed(0)}/mo (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else if (ctx) {
        // Show message if no expenses
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    }
}

function renderIncomeBreakdownChart() {
    // Calculate monthly income from each source
    const jobIncome = appState.annualIncome ? appState.annualIncome / 12 : 0;
    const stockIncome = appState.monthlyDividendIncome || 0;
    const rentalIncome = appState.rentalIncome.reduce((sum, rental) => sum + rental.amount, 0);
    const otherIncome = appState.otherIncome.reduce((sum, other) => sum + other.amount, 0);

    const totalIncome = jobIncome + stockIncome + rentalIncome + otherIncome;

    // Prepare chart data
    const data = [];
    const labels = [];
    const colors = [];

    if (jobIncome > 0) {
        labels.push('Job Income');
        data.push(jobIncome);
        colors.push('#8b5cf6'); // Purple
    }
    if (stockIncome > 0) {
        labels.push('Stocks');
        data.push(stockIncome);
        colors.push('#3b82f6'); // Blue
    }
    if (rentalIncome > 0) {
        labels.push('Rental');
        data.push(rentalIncome);
        colors.push('#10b981'); // Green
    }
    if (savingsIncome > 0) {
        labels.push('Savings Interest');
        data.push(savingsIncome);
        colors.push('#f59e0b'); // Orange
    }

    // Destroy existing chart if it exists
    if (incomeChart) {
        incomeChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById('incomeBreakdownChart');
    if (ctx && totalIncome > 0) {
        incomeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            font: {
                                size: 12
                            },
                            generateLabels: function (chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / totalIncome) * 100).toFixed(1);
                                    return {
                                        text: `${label}: $${value.toFixed(0)} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const percentage = ((value / totalIncome) * 100).toFixed(1);
                                return `${label}: $${value.toFixed(0)}/mo (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else if (ctx) {
        // Show message if no income
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    }
}

function closeIncomeModal() {
    // Restore original income data if user cancels
    appState.portfolio = JSON.parse(JSON.stringify(originalIncomeData.portfolio));
    appState.rentalIncome = JSON.parse(JSON.stringify(originalIncomeData.rentalIncome));
    appState.savingsAccounts = JSON.parse(JSON.stringify(originalIncomeData.savingsAccounts));

    // Hide modal
    document.getElementById('incomeEditModal').style.display = 'none';
}

function switchIncomeTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    if (tabName === 'overview') {
        document.getElementById('tabOverview').classList.add('active');
        document.getElementById('contentOverview').classList.add('active');
    } else if (tabName === 'job') {
        document.getElementById('tabJob').classList.add('active');
        document.getElementById('contentJob').classList.add('active');
    } else if (tabName === 'stocks') {
        document.getElementById('tabStocks').classList.add('active');
        document.getElementById('contentStocks').classList.add('active');
    } else if (tabName === 'rental') {
        document.getElementById('tabRental').classList.add('active');
        document.getElementById('contentRental').classList.add('active');
    } else if (tabName === 'other') {
        document.getElementById('tabOther').classList.add('active');
        document.getElementById('contentOther').classList.add('active');
    }
}

function saveIncomeChanges() {
    // Recalculate portfolio dividend income first (in case stocks were edited/deleted)
    calculateBlendedYield();

    // Recalculate total income and update dashboard
    const rentalTotal = (appState.rentalIncome && appState.rentalIncome.length > 0)
        ? appState.rentalIncome.reduce((sum, item) => sum + item.amount, 0)
        : 0;
    const savingsInterestTotal = (appState.savingsAccounts && appState.savingsAccounts.length > 0)
        ? appState.savingsAccounts.reduce((sum, item) => sum + ((item.amount * (item.interestRate / 100)) / 12), 0)
        : 0;
    const portfolioTotal = appState.monthlyDividendIncome || 0;

    appState.totalPassiveIncome = rentalTotal + savingsInterestTotal + portfolioTotal;

    calculateGoals();
    renderDashboard();
    saveState();

    // Hide modal
    document.getElementById('incomeEditModal').style.display = 'none';
}

function refreshStockModalDisplay() {
    const stockEditList = document.getElementById('stockEditList');
    stockEditList.innerHTML = '';

    appState.portfolio.forEach((stock, index) => {
        const stockItem = document.createElement('div');
        stockItem.className = 'stock-edit-item';

        // If yield is missing, fetch it
        if (!stock.yield) {
            stockItem.innerHTML = `
                <input type="text" value="${stock.symbol}" onchange="updateStockInModal(${index}, 'symbol', this.value)" class="input-field" placeholder="Ticker">
                <input type="number" value="${stock.percent}" onchange="updateStockInModal(${index}, 'percent', parseFloat(this.value))" class="input-field stock-percent-input" min="0" max="100" step="1" placeholder="%">
                <span class="stock-yield">Loading...</span>
                <span class="stock-income">$0.00/mo</span>
                <button onclick="deleteStockFromModal(${index})">Delete</button>
            `;
            stockEditList.appendChild(stockItem);

            // Fetch yield asynchronously
            fetchDividendYield(stock.symbol).then(yieldData => {
                if (yieldData) {
                    stock.yield = yieldData;
                    // Calculate monthly income for this stock
                    const annualDividend = (appState.portfolioValue * (stock.percent / 100)) * (yieldData / 100);
                    stock.monthlyIncome = annualDividend / 12;
                    refreshStockModalDisplay();
                }
            });
        } else {
            // Calculate monthly income if not already set
            if (!stock.monthlyIncome || stock.monthlyIncome === 0) {
                const annualDividend = (appState.portfolioValue * (stock.percent / 100)) * (stock.yield / 100);
                stock.monthlyIncome = annualDividend / 12;
            }

            stockItem.innerHTML = `
                <input type="text" value="${stock.symbol}" onchange="updateStockInModal(${index}, 'symbol', this.value)" class="input-field" placeholder="Ticker">
                <input type="number" value="${stock.percent}" onchange="updateStockInModal(${index}, 'percent', parseFloat(this.value))" class="input-field stock-percent-input" min="0" max="100" step="1" placeholder="%">
                <span class="stock-yield">${stock.yield.toFixed(2)}%</span>
                <span class="stock-income">$${stock.monthlyIncome.toFixed(2)}/mo</span>
                <button onclick="deleteStockFromModal(${index})">Delete</button>
            `;
            stockEditList.appendChild(stockItem);
        }
    });

    // Validate total percentage
    validatePortfolioPercentage();
}

function refreshRentalModalDisplay() {
    const rentalEditList = document.getElementById('rentalEditList');
    rentalEditList.innerHTML = '';

    appState.rentalIncome.forEach((rental, index) => {
        const rentalItem = document.createElement('div');
        rentalItem.className = 'rental-edit-item';
        rentalItem.innerHTML = `
            <input type="text" value="${rental.name}" onchange="updateRentalInModal(${index}, 'name', this.value)" class="input-field" placeholder="Property Name">
            <input type="number" value="${rental.amount}" onchange="updateRentalInModal(${index}, 'amount', parseFloat(this.value))" class="input-field" min="0" step="10" placeholder="Monthly Income">
            <button onclick="deleteRentalFromModal(${index})">Delete</button>
        `;
        rentalEditList.appendChild(rentalItem);
    });
}

function refreshJobIncomeDisplay() {
    const jobIncomeInput = document.getElementById('modalJobIncome');
    const jobIncomeMonthly = document.getElementById('jobIncomeMonthly');

    if (!jobIncomeInput || !jobIncomeMonthly) return;

    // Set current annual income
    jobIncomeInput.value = appState.annualIncome || 0;

    // Update monthly display
    const monthlyEquivalent = (appState.annualIncome || 0) / 12;
    jobIncomeMonthly.textContent = `$${monthlyEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month`;

    // Add input handler for real-time updates
    jobIncomeInput.oninput = function () {
        const annualAmount = parseFloat(this.value) || 0;
        const monthlyAmount = annualAmount / 12;
        jobIncomeMonthly.textContent = `$${monthlyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`;
        appState.annualIncome = annualAmount;
        renderIncomeBreakdownChart();
    };
}

// Delete functions
function deleteStockFromModal(index) {
    appState.portfolio.splice(index, 1);
    refreshStockModalDisplay();
    renderIncomeBreakdownChart();
}

function deleteRentalFromModal(index) {
    appState.rentalIncome.splice(index, 1);
    refreshRentalModalDisplay();
    renderIncomeBreakdownChart();
}

// Update functions for inline editing
function updateStockInModal(index, field, value) {
    if (field === 'symbol') {
        appState.portfolio[index].symbol = value.toUpperCase();
    } else if (field === 'percent') {
        appState.portfolio[index].percent = value;
        // Recalculate monthly income when percent changes
        if (appState.portfolio[index].yield) {
            const annualDividend = (appState.portfolioValue * (value / 100)) * (appState.portfolio[index].yield / 100);
            appState.portfolio[index].monthlyIncome = annualDividend / 12;
        }
        // Validate and refresh display
        validatePortfolioPercentage();
        refreshStockModalDisplay();
    }
}

function updateRentalInModal(index, field, value) {
    if (field === 'name') {
        appState.rentalIncome[index].name = value;
    } else if (field === 'amount') {
        appState.rentalIncome[index].amount = value;
    }
}

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
                // Houses don't have quick add
                break;
            case 'step4':
                addRetirementAccount();
                break;
            case 'step5':
                addOther();
                break;
            case 'step6':
                addExpense();
                break;
        }
    }
});

// Explicit user action to dismiss the Step 7 banner and continue
function dismissStep6Banner() {
    canProceedFromStep6 = true;
    if (appState.currentStep === 7) {
        nextStep();
    }
}

// Submit waitlist email
function submitWaitlist() {
    const emailInput = document.getElementById('waitlistEmail');
    const email = emailInput.value.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Store email in appState
    appState.userEmail = email;
    saveState();

    // console.log('Waitlist email submitted:', email);

    // Send to backend waitlist endpoint (server will persist and forward to Zapier)
    fetch(API_BASE_URL + '/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            meta: {
                source: 'signupBanner',
                builderStep: appState.currentStep || null
            }
        })
    }).catch(err => console.log('Waitlist submission error:', err));

    // Show success message
    const banner = document.getElementById('signupBanner');
    if (banner) {
        banner.innerHTML = `
            <div style="text-align:center; color:#10b981; font-weight:500;">
                ✓ You're on the waitlist! We'll notify you when new features launch.
            </div>
        `;
        setTimeout(() => {
            dismissStep6Banner();
        }, 2000);
    }
}

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

async function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const messagesContainer = document.getElementById('chatbotMessages');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chatbot-message user-message';
    userMessageDiv.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
    messagesContainer.appendChild(userMessageDiv);

    // Clear input
    input.value = '';

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message bot-message typing';
    typingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Call chat API
        const response = await fetch(API_BASE_URL + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove typing indicator
        typingDiv.remove();

        // Add bot response with typing effect
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'chatbot-message bot-message';
        const botContent = document.createElement('div');
        botContent.className = 'message-content';
        botMessageDiv.appendChild(botContent);
        messagesContainer.appendChild(botMessageDiv);

        const replyText = data.reply || 'Sorry, I could not generate a response.';
        await typeText(botContent, replyText, 15);
        // After typing completes, render Markdown safely
        botContent.innerHTML = renderMarkdownSafe(replyText);
        setTimeout(() => renderMath(botContent), 50);

    } catch (error) {
        // Remove typing indicator
        typingDiv.remove();

        // Show error message with typing effect
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chatbot-message bot-message error';
        const errorContent = document.createElement('div');
        errorContent.className = 'message-content';
        errorDiv.appendChild(errorContent);
        messagesContainer.appendChild(errorDiv);
        await typeText(errorContent, 'Sorry, I encountered an error. Please try again.', 15);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMarkdownSafe(markdownText) {
    try {
        const html = window.marked ? window.marked.parse(markdownText || '') : (markdownText || '');
        const clean = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        return clean;
    } catch (e) {
        return (markdownText || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
    }
}

function renderMath(element, attempts = 0) {
    if (window.renderMathInElement) {
        try {
            window.renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn('KaTeX rendering failed:', e);
        }
    } else if (attempts < 20) {
        setTimeout(() => renderMath(element, attempts + 1), 100);
    }
}

// Typing effect helper
async function typeText(element, text, speed = 15) {
    const safeText = String(text || '');
    element.textContent = '';
    for (let i = 0; i < safeText.length; i++) {
        element.textContent += safeText[i];
        // Keep scrolled to bottom while typing
        const container = document.getElementById('chatbotMessages');
        if (container) container.scrollTop = container.scrollHeight;
        await new Promise(res => setTimeout(res, speed));
    }
}

// Add functions
async function addStockFromModal() {
    const symbolInput = document.getElementById('modalStockSymbol');
    const percentInput = document.getElementById('modalStockPercent');

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
        // Calculate monthly income for this stock
        const annualDividend = (appState.portfolioValue * (percent / 100)) * (yieldData / 100);
        const monthlyIncome = annualDividend / 12;

        appState.portfolio.push({
            symbol: symbol,
            percent: percent,
            yield: yieldData,
            name: symbol,
            monthlyIncome: monthlyIncome
        });

        symbolInput.value = '';
        percentInput.value = '';

        refreshStockModalDisplay();
        renderIncomeBreakdownChart();
    }
}

function addRentalFromModal() {
    const nameInput = document.getElementById('modalRentalName');
    const amountInput = document.getElementById('modalRentalAmount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid property name and monthly income amount');
        return;
    }

    appState.rentalIncome.push({ name, amount });

    nameInput.value = '';
    amountInput.value = '';

    refreshRentalModalDisplay();
    renderIncomeBreakdownChart();
}

// Portfolio percentage validation
function validatePortfolioPercentage() {
    const total = appState.portfolio.reduce((sum, item) => sum + item.percent, 0);
    const percentInputs = document.querySelectorAll('.stock-percent-input');

    if (total > 100) {
        // Highlight all percentage inputs in red
        percentInputs.forEach(input => {
            input.style.borderColor = '#E53E3E';
            input.style.backgroundColor = '#FEE';
        });
    } else {
        // Remove red highlight
        percentInputs.forEach(input => {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        });
    }

    return total <= 100;
}

// --- MCP Context Pusher ---
async function pushContextToServer() {
    try {
        const dom = document.documentElement ? document.documentElement.outerHTML : '';

        // Normalize step information for chatbot context
        const contextState = {
            ...appState,
            // Add normalized step info for chatbot
            builderStep: appState.currentStep >= 1 && appState.currentStep <= 6 ? appState.currentStep : null,
            totalBuilderSteps: 6,
            screenType: getScreenType(appState.currentStep)
        };

        await fetch(API_BASE_URL + '/mcp/update-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dom,
                appState: contextState,
                url: window.location.href
            })
        });
    } catch (e) {
        // Silently fail - don't disrupt user experience
    }
}

// Helper function to categorize screen types
function getScreenType(currentStep) {
    if (currentStep === 0) return 'landing';
    if (currentStep >= 1 && currentStep <= 6) return 'builder';
    if (currentStep === 7) return 'calculating';
    if (currentStep === 8) return 'congratulations';
    if (currentStep === 9) return 'dashboard';
    return 'unknown';
}

// Push context immediately and then every 10 seconds
pushContextToServer();
setInterval(pushContextToServer, 10000);

// --- AI Chatbot Integration ---
async function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const messagesContainer = document.getElementById('chatbotMessages');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chatbot-message user-message';
    userMessageDiv.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
    messagesContainer.appendChild(userMessageDiv);

    // Clear input
    input.value = '';

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message bot-message typing';
    typingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Call chat API
        const response = await fetch(API_BASE_URL + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove typing indicator
        typingDiv.remove();

        // Add bot response with typing effect
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'chatbot-message bot-message';
        const botContent = document.createElement('div');
        botContent.className = 'message-content';
        botMessageDiv.appendChild(botContent);
        messagesContainer.appendChild(botMessageDiv);

        const replyText = data.reply || 'Sorry, I could not generate a response.';
        await typeText(botContent, replyText, 15);
        // After typing completes, render Markdown safely
        botContent.innerHTML = renderMarkdownSafe(replyText);
        setTimeout(() => renderMath(botContent), 50);

    } catch (error) {
        // Remove typing indicator
        typingDiv.remove();

        // Show error message with typing effect
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chatbot-message bot-message error';
        const errorContent = document.createElement('div');
        errorContent.className = 'message-content';
        errorDiv.appendChild(errorContent);
        messagesContainer.appendChild(errorDiv);
        await typeText(errorContent, 'Sorry, I encountered an error. Please try again.', 15);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMarkdownSafe(markdownText) {
    try {
        const html = window.marked ? window.marked.parse(markdownText || '') : (markdownText || '');
        const clean = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        return clean;
    } catch (e) {
        return (markdownText || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
    }
}

function renderMath(element, attempts = 0) {
    if (window.renderMathInElement) {
        try {
            window.renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn('KaTeX rendering failed:', e);
        }
    } else if (attempts < 20) {
        setTimeout(() => renderMath(element, attempts + 1), 100);
    }
}

// Typing effect helper
async function typeText(element, text, speed = 15) {
    const safeText = String(text || '');
    element.textContent = '';
    for (let i = 0; i < safeText.length; i++) {
        element.textContent += safeText[i];
        // Keep scrolled to bottom while typing
        const container = document.getElementById('chatbotMessages');
        if (container) container.scrollTop = container.scrollHeight;
        await new Promise(res => setTimeout(res, speed));
    }
}

// Step 3: Add house to appState and UI
function addHouse() {
    // Get form values
    const houseType = document.getElementById('houseType').value;
    const houseName = document.getElementById('houseName').value.trim();
    const paidOffStatus = document.querySelector('input[name="paidOffStatus"]:checked').value;
    const houseEstimate = parseFloat(document.getElementById('houseEstimate').value) || 0;
    const homeEquity = parseFloat(document.getElementById('homeEquity').value) || 0;
    const mortgagePayment = parseFloat(document.getElementById('mortgagePayment').value) || 0;
    const generatesRental = document.getElementById('generatesRental').checked;
    const monthlyRentalIncome = parseFloat(document.getElementById('monthlyRentalIncome').value) || 0;

    // Validate required fields
    if (!houseType) {
        alert('Please select a property type');
        return;
    }

    if (!houseName) {
        alert('Please enter a property name or address');
        return;
    }

    if (paidOffStatus === 'yes' && houseEstimate <= 0) {
        alert('Please enter the estimated property value');
        return;
    }

    if (paidOffStatus === 'no' && (homeEquity <= 0 || mortgagePayment <= 0)) {
        alert('Please enter both home equity and monthly mortgage payment');
        return;
    }

    if (generatesRental && monthlyRentalIncome <= 0) {
        alert('Please enter the monthly rental income');
        return;
    }

    // Create house data object
    const houseData = {
        id: Date.now(),
        type: houseType,
        name: houseName,
        paidOffStatus: paidOffStatus,
        value: paidOffStatus === 'yes' ? houseEstimate : homeEquity,
        mortgagePayment: paidOffStatus === 'no' ? mortgagePayment : 0,
        generatesRental: generatesRental,
        monthlyRentalIncome: generatesRental ? monthlyRentalIncome : 0
    };

    // Add to appState
    appState.houses.push(houseData);

    // Render all houses
    renderHouseList();

    // Clear form
    document.getElementById('houseType').value = '';
    document.getElementById('houseName').value = '';
    document.querySelector('input[name="paidOffStatus"][value="yes"]').checked = true;
    document.getElementById('houseEstimate').value = '';
    document.getElementById('homeEquity').value = '';
    document.getElementById('mortgagePayment').value = '';
    document.getElementById('generatesRental').checked = false;
    document.getElementById('monthlyRentalIncome').value = '';

    // Reset conditional fields visibility
    document.getElementById('paidOffGroup').style.display = 'block';
    document.getElementById('mortgageGroup').style.display = 'none';
    document.getElementById('mortgagePaymentGroup').style.display = 'none';
    document.getElementById('rentalIncomeGroup').style.display = 'none';

    // Save state
    saveState();
}

// Step 3: Render house list from appState
function renderHouseList() {
    const houseList = document.getElementById('houseList');
    if (!houseList) return;

    houseList.innerHTML = '';

    appState.houses.forEach(house => {
        const houseCard = document.createElement('div');
        houseCard.className = 'house-item';
        houseCard.dataset.houseId = house.id;

        const typeLabel = house.type.charAt(0).toUpperCase() + house.type.slice(1).replace('-', ' ');

        houseCard.innerHTML = `
            <div class="house-details">
                <h4>${house.name}</h4>
                <div class="house-meta">
                    <div class="house-meta-item">
                        <span class="house-meta-label">Type</span>
                        <span class="house-meta-value">${typeLabel}</span>
                    </div>
                    <div class="house-meta-item">
                        <span class="house-meta-label">Status</span>
                        <span class="house-meta-value">${house.paidOffStatus === 'yes' ? 'Paid Off' : 'Has Mortgage'}</span>
                    </div>
                    <div class="house-meta-item">
                        <span class="house-meta-label">${house.paidOffStatus === 'yes' ? 'Value' : 'Equity'}</span>
                        <span class="house-meta-value">$${house.value.toLocaleString()}</span>
                    </div>
                    ${house.paidOffStatus === 'no' ? `
                    <div class="house-meta-item">
                        <span class="house-meta-label">Mortgage/Month</span>
                        <span class="house-meta-value">$${house.mortgagePayment.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    ${house.generatesRental ? `
                    <div class="house-meta-item">
                        <span class="house-meta-label">Rental Income</span>
                        <span class="house-meta-value income-highlight">$${house.monthlyRentalIncome.toLocaleString()}/mo</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="house-actions">
                <button class="btn-remove" onclick="removeHouse(this)">Remove</button>
            </div>
        `;

        houseList.appendChild(houseCard);
    });

    updateHouseSummary();

    // Sync rental income from houses
    syncRentalIncomeFromHouses();

    // Sync mortgage expenses from houses
    syncMortgageExpensesFromHouses();
}

// Step 3: Remove house from UI list
function removeHouse(button) {
    const houseItem = button.closest('.house-item');
    houseItem.remove();

    // Save the house list HTML
    step3HouseListHTML = document.getElementById('houseList').innerHTML;

    updateHouseSummary();
}

// Step 3: Update house summary totals
function updateHouseSummary() {
    const houseItems = document.querySelectorAll('.house-item');
    const summaryBox = document.getElementById('houseSummary');

    if (houseItems.length === 0) {
        summaryBox.style.display = 'none';
        return;
    }

    summaryBox.style.display = 'block';

    let totalProperties = houseItems.length;
    let totalValue = 0;
    let totalRentalIncome = 0;

    houseItems.forEach(item => {
        // Extract value from the card - find the meta-item with "Value" or "Equity" label
        const metaItems = item.querySelectorAll('.house-meta-item');
        metaItems.forEach(metaItem => {
            const label = metaItem.querySelector('.house-meta-label')?.textContent || '';
            if (label === 'Value' || label === 'Equity') {
                const valueText = metaItem.querySelector('.house-meta-value')?.textContent || '$0';
                const value = parseFloat(valueText.replace(/[$,]/g, '')) || 0;
                totalValue += value;
            }
        });

        // Extract rental income if exists
        const rentalIncomeEl = item.querySelector('.income-highlight');
        if (rentalIncomeEl) {
            const rentalText = rentalIncomeEl.textContent || '$0';
            const rental = parseFloat(rentalText.replace(/[$,/mo]/g, '')) || 0;
            totalRentalIncome += rental;
        }
    });

    document.getElementById('totalHousesCount').textContent = totalProperties;
    document.getElementById('totalPropertyValue').textContent = `$${totalValue.toLocaleString()}`;
    document.getElementById('totalRentalIncome').textContent = `$${totalRentalIncome.toLocaleString()}`;
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('expenseEditModal');
    if (e.target === modal) {
        closeExpenseModal();
    }

    const incomeModal = document.getElementById('incomeEditModal');
    if (e.target === incomeModal) {
        closeIncomeModal();
    }
});

// Add functions
async function addStockFromModal() {
    const symbolInput = document.getElementById('modalStockSymbol');
    const percentInput = document.getElementById('modalStockPercent');

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
        // Calculate monthly income for this stock
        const annualDividend = (appState.portfolioValue * (percent / 100)) * (yieldData / 100);
        const monthlyIncome = annualDividend / 12;

        appState.portfolio.push({
            symbol: symbol,
            percent: percent,
            yield: yieldData,
            name: symbol,
            monthlyIncome: monthlyIncome
        });

        symbolInput.value = '';
        percentInput.value = '';

        refreshStockModalDisplay();
        renderIncomeBreakdownChart();
    }
}

function addRentalFromModal() {
    const nameInput = document.getElementById('modalRentalName');
    const amountInput = document.getElementById('modalRentalAmount');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid property name and monthly income amount');
        return;
    }

    appState.rentalIncome.push({ name, amount });

    nameInput.value = '';
    amountInput.value = '';

    refreshRentalModalDisplay();
    renderIncomeBreakdownChart();
}

// Portfolio percentage validation
function validatePortfolioPercentage() {
    const total = appState.portfolio.reduce((sum, item) => sum + item.percent, 0);
    const percentInputs = document.querySelectorAll('.stock-percent-input');

    if (total > 100) {
        // Highlight all percentage inputs in red
        percentInputs.forEach(input => {
            input.style.borderColor = '#E53E3E';
            input.style.backgroundColor = '#FEE';
        });
    } else {
        // Remove red highlight
        percentInputs.forEach(input => {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        });
    }

    return total <= 100;
}

// --- MCP Context Pusher ---
async function pushContextToServer() {
    try {
        const dom = document.documentElement ? document.documentElement.outerHTML : '';

        // Normalize step information for chatbot context
        const contextState = {
            ...appState,
            // Add normalized step info for chatbot
            builderStep: appState.currentStep >= 1 && appState.currentStep <= 6 ? appState.currentStep : null,
            totalBuilderSteps: 6,
            screenType: getScreenType(appState.currentStep)
        };

        await fetch(API_BASE_URL + '/mcp/update-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dom,
                appState: contextState,
                url: window.location.href
            })
        });
    } catch (e) {
        // Silently fail - don't disrupt user experience
    }
}

// Helper function to categorize screen types
function getScreenType(currentStep) {
    if (currentStep === 0) return 'landing';
    if (currentStep >= 1 && currentStep <= 6) return 'builder';
    if (currentStep === 7) return 'calculating';
    if (currentStep === 8) return 'congratulations';
    if (currentStep === 9) return 'dashboard';
    return 'unknown';
}

// Push context immediately and then every 10 seconds
pushContextToServer();
setInterval(pushContextToServer, 10000);

// --- AI Chatbot Integration ---
async function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const messagesContainer = document.getElementById('chatbotMessages');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chatbot-message user-message';
    userMessageDiv.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
    messagesContainer.appendChild(userMessageDiv);

    // Clear input
    input.value = '';

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message bot-message typing';
    typingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Call chat API
        const response = await fetch(API_BASE_URL + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove typing indicator
        typingDiv.remove();

        // Add bot response with typing effect
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'chatbot-message bot-message';
        const botContent = document.createElement('div');
        botContent.className = 'message-content';
        botMessageDiv.appendChild(botContent);
        messagesContainer.appendChild(botMessageDiv);

        const replyText = data.reply || 'Sorry, I could not generate a response.';
        await typeText(botContent, replyText, 15);
        // After typing completes, render Markdown safely
        botContent.innerHTML = renderMarkdownSafe(replyText);
        setTimeout(() => renderMath(botContent), 50);

    } catch (error) {
        // Remove typing indicator
        typingDiv.remove();

        // Show error message with typing effect
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chatbot-message bot-message error';
        const errorContent = document.createElement('div');
        errorContent.className = 'message-content';
        errorDiv.appendChild(errorContent);
        messagesContainer.appendChild(errorDiv);
        await typeText(errorContent, 'Sorry, I encountered an error. Please try again.', 15);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMarkdownSafe(markdownText) {
    try {
        const html = window.marked ? window.marked.parse(markdownText || '') : (markdownText || '');
        const clean = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        return clean;
    } catch (e) {
        return (markdownText || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
    }
}

function renderMath(element, attempts = 0) {
    if (window.renderMathInElement) {
        try {
            window.renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn('KaTeX rendering failed:', e);
        }
    } else if (attempts < 20) {
        setTimeout(() => renderMath(element, attempts + 1), 100);
    }
}

// Typing effect helper
async function typeText(element, text, speed = 15) {
    const safeText = String(text || '');
    element.textContent = '';
    for (let i = 0; i < safeText.length; i++) {
        element.textContent += safeText[i];
        // Keep scrolled to bottom while typing
        const container = document.getElementById('chatbotMessages');
        if (container) container.scrollTop = container.scrollHeight;
        await new Promise(res => setTimeout(res, speed));
    }
}

// Allow Enter key to send chat message
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatbotInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }

    // Start typing effect for welcome message
    typeWelcomeMessage();

    // Set minimize button to '+' since chatbot starts minimized
    const minimizeBtn = document.querySelector('.chatbot-minimize');
    if (minimizeBtn) {
        minimizeBtn.textContent = '+';
    }
});

// Step 3: Setup event listeners for house form
function setupStep3Listeners() {
    // Toggle mortgage/estimate fields based on paid off status
    const paidOffRadios = document.querySelectorAll('input[name="paidOffStatus"]');
    paidOffRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const paidOffGroup = document.getElementById('paidOffGroup');
            const mortgageGroup = document.getElementById('mortgageGroup');
            const mortgagePaymentGroup = document.getElementById('mortgagePaymentGroup');

            if (!paidOffGroup || !mortgageGroup || !mortgagePaymentGroup) return;

            if (e.target.value === 'no') {
                // Has mortgage: show home equity and mortgage payment
                paidOffGroup.style.display = 'none';
                mortgageGroup.style.display = 'block';
                mortgagePaymentGroup.style.display = 'block';
                const houseEstimate = document.getElementById('houseEstimate');
                if (houseEstimate) houseEstimate.value = '';
            } else {
                // Paid off: show only estimated value
                paidOffGroup.style.display = 'block';
                mortgageGroup.style.display = 'none';
                mortgagePaymentGroup.style.display = 'none';
                const homeEquity = document.getElementById('homeEquity');
                const mortgagePayment = document.getElementById('mortgagePayment');
                if (homeEquity) homeEquity.value = '';
                if (mortgagePayment) mortgagePayment.value = '';
            }
        });
    });

    // Toggle rental income field based on checkbox
    const rentalCheckbox = document.getElementById('generatesRental');
    if (rentalCheckbox) {
        rentalCheckbox.addEventListener('change', (e) => {
            const rentalIncomeGroup = document.getElementById('rentalIncomeGroup');
            if (e.target.checked) {
                rentalIncomeGroup.style.display = 'block';
            } else {
                rentalIncomeGroup.style.display = 'none';
                document.getElementById('monthlyRentalIncome').value = '';
            }
        });
    }
}

// FIRE Number Modal Functions
function openFireModal() {
    // Calculate current values
    const totalMonthlyExpenses = (appState.expenses && appState.expenses.length > 0)
        ? appState.expenses.reduce((sum, item) => sum + item.amount, 0)
        : 0;
    const annualExpenses = totalMonthlyExpenses * 12;
    const fireNumber = annualExpenses / 0.04;
    const totalHouseValue = (appState.houses && appState.houses.length > 0)
        ? appState.houses.reduce((sum, house) => sum + house.value, 0)
        : 0;
    const totalRetirementValue = getTotalRetirementValue();
    const liquidAssets = appState.portfolioValue + totalRetirementValue;
    const currentNetWorth = liquidAssets + totalHouseValue;
    const stillNeed = Math.max(0, fireNumber - liquidAssets);
    const progress = fireNumber > 0 ? Math.min(100, (liquidAssets / fireNumber) * 100) : 0;

    // Populate modal with calculated values
    document.getElementById('fireModalExpenses').textContent = `$${totalMonthlyExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalAnnualExpenses').textContent = `$${annualExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalFireNumber').textContent = `$${fireNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalFireNumberText').textContent = `$${fireNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalAnnualWithdrawal').textContent = `$${annualExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalCurrentNetWorth').textContent = `$${currentNetWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })} (includes house & retirement)`;
    document.getElementById('fireModalGrowingAssets').textContent = `$${liquidAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalStillNeed').textContent = `$${stillNeed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fireModalProgress').textContent = `${progress.toFixed(1)}%`;

    // Show modal
    document.getElementById('fireExplanationModal').style.display = 'flex';
}

function closeFireModal() {
    document.getElementById('fireExplanationModal').style.display = 'none';
}

function showSwrCustomization() {
    // Placeholder for future SWR customization feature
    alert('Safe Withdrawal Rate customization coming soon! This will allow you to experiment with different withdrawal rates (3.5%, 4%, 4.5%, etc.) to see how it affects your FIRE number.');
}

// FI Year Modal Functions
function openFIYearModal() {
    // Use shared FI Year calculation
    const fiData = calculateProjectedFIYear();
    const { projectedFIYear, yearsToGo, finalValue, fireNumber, currentNetWorth, projectedMonthlySavings, currentPortfolioValue } = fiData;

    // Populate modal with calculated values
    document.getElementById('fiYearModalFireNumber').textContent = `$${fireNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fiYearModalCurrentNetWorth').textContent = `$${currentNetWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })} (includes house & retirement)`;
    document.getElementById('fiYearModalMonthlySavings').textContent = `$${projectedMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fiYearModalProjectedYear').textContent = projectedFIYear;
    document.getElementById('fiYearModalStartingPoint').textContent = `$${currentPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (portfolio + retirement)`;
    document.getElementById('fiYearModalMonthlyContrib').textContent = `$${projectedMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('fiYearModalFinalValue').textContent = `$${finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    // Update explanation text based on whether FI is achievable
    const explanationElement = document.getElementById('fiYearModalExplanation');
    const yearsToGoElement = document.getElementById('fiYearModalYearsToGo');

    if (projectedFIYear === 'Never') {
        explanationElement.innerHTML = "Based on your current savings rate, you may not reach financial independence within a reasonable timeframe. Consider increasing your income, reducing expenses, or optimizing your investment strategy.";
        yearsToGoElement.textContent = "∞";
    } else {
        explanationElement.innerHTML = `Based on your current savings and investment strategy, you're projected to reach financial independence in <span id="fiYearModalYearsToGo">${yearsToGo}</span> years (by ${projectedFIYear}).`;
        yearsToGoElement.textContent = yearsToGo;
    }

    // Show modal
    document.getElementById('fiYearExplanationModal').style.display = 'flex';
}

function closeFIYearModal() {
    document.getElementById('fiYearExplanationModal').style.display = 'none';
}

function showFIOptimization() {
    // Placeholder for future FI optimization feature
    alert('FI Timeline optimization coming soon! This will help you explore different scenarios to reach financial independence faster by adjusting savings rate, investment returns, and expenses.');
}

// Signup Modal Functions
async function showSignupModal() {
    // console.log('🔔 showSignupModal called');

    // Delay and check session inside setTimeout to avoid race conditions
    setTimeout(async () => {
        // Fresh session check right before showing modal
        const { data: { session } } = await supabase.auth.getSession();
        // console.log('📧 Session check before modal:', session ? session.user.email : 'No session');

        // Only show if user is NOT logged in
        if (!session) {
            const modal = document.getElementById('signupModal');
            // console.log('📦 Modal element:', modal);
            if (modal) {
                // console.log('✅ Setting modal display to flex');
                modal.style.display = 'flex';
                // console.log('✅ Modal display is now:', modal.style.display);
            } else {
                console.error('❌ Modal element #signupModal not found in DOM!');
            }
        }
    }, 1000);
}

function closeSignupModal() {
    document.getElementById('signupModal').style.display = 'none';
}

async function submitSignupModal() {
    try {
        // Sign in with Google OAuth
        // Always redirect to production URL after OAuth
        const redirectUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/'
            : 'https://butfirstfire.com/';

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            console.error('OAuth error:', error);
            alert('Sign in failed. Please try again.');
            return;
        }

        // OAuth redirect will happen automatically
        // After redirect, the auth state change listener will handle saving data
        // console.log('🚀 Redirecting to Google OAuth...');

    } catch (err) {
        console.error('Signup error:', err);
        alert('An error occurred. Please try again.');
    }
}
