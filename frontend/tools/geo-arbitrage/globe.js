const MODES = {
    income: {
        label: 'Monthly income',
        min: 1000,
        max: 10000,
        step: 100,
        value: 3500,
        formatter: formatCurrency,
        monthlyIncome(value) {
            return value;
        }
    },
    netWorth: {
        label: 'Net worth',
        min: 50000,
        max: 3000000,
        step: 25000,
        value: 600000,
        formatter: formatCurrency,
        monthlyIncome(value) {
            return (value * 0.04) / 12;
        }
    }
};

const state = {
    mode: 'income',
    value: MODES.income.value,
    household: 'solo',
    profile: 'remote_worker',
    lifestyle: 'lean',
    mobileView: 'list',
    mobileSheetOpen: false,
    mobileGlobeExpanded: false,
    allCities: [],
    affordableCities: [],
    selectedCityId: null,
    globe: null,
    resumeTimeoutId: null,
    rampIntervalId: null,
    suppressNextStageClick: false
};

const DEFAULT_AUTO_ROTATE_SPEED = 0.45;
const RESUME_AUTO_ROTATE_SPEED = 0.18;
const RESUME_DELAY_MS = 3000;
const EXPAND_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
    </svg>
`;
const CLOSE_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
`;
const LIFESTYLE_EXPLANATIONS = {
    lean: 'Lower-cost apartment, local-food-heavy routine, and tighter discretionary spending.',
    moderate: 'Comfortable apartment, regular cafes and meals out, and a balanced everyday lifestyle.',
    luxury: 'Better location, stronger comfort, and more convenience, dining out, and premium spending.'
};

const els = {
    controlPanel: document.querySelector('.control-panel'),
    mobileSheetToggle: document.getElementById('mobileSheetToggle'),
    mobileSheetSummary: document.getElementById('mobileSheetSummary'),
    budgetLabel: document.getElementById('budgetLabel'),
    budgetValue: document.getElementById('budgetValue'),
    monthlyEquivalentPill: document.getElementById('monthlyEquivalentPill'),
    budgetSlider: document.getElementById('budgetSlider'),
    filterChips: document.querySelectorAll('[data-filter-group]'),
    sliderMin: document.getElementById('sliderMin'),
    sliderMax: document.getElementById('sliderMax'),
    lifestyleDetail: document.getElementById('lifestyleDetail'),
    affordableCount: document.getElementById('affordableCount'),
    cheapestCity: document.getElementById('cheapestCity'),
    fastestInternet: document.getElementById('fastestInternet'),
    mobileAffordableCount: document.getElementById('mobileAffordableCount'),
    mobileCheapestCity: document.getElementById('mobileCheapestCity'),
    mobileFastestInternet: document.getElementById('mobileFastestInternet'),
    cityList: document.getElementById('cityList'),
    mobileCityList: document.getElementById('mobileCityList'),
    resultsHint: document.getElementById('resultsHint'),
    mobileResultsHint: document.getElementById('mobileResultsHint'),
    stageValue: document.getElementById('stageValue'),
    incomeModeButton: document.getElementById('incomeModeButton'),
    netWorthModeButton: document.getElementById('netWorthModeButton'),
    mobileGlobeTab: document.getElementById('mobileGlobeTab'),
    mobileListTab: document.getElementById('mobileListTab'),
    mobileGlobeShell: document.getElementById('mobileGlobeShell'),
    mobileGlobeExpand: document.getElementById('mobileGlobeExpand'),
    mobileListPane: document.getElementById('mobileListPane'),
    globeLegend: document.querySelector('.globe-legend'),
    cityDrawer: document.getElementById('cityDrawer'),
    drawerClose: document.getElementById('drawerClose'),
    drawerTitle: document.getElementById('drawerTitle'),
    drawerSubtitle: document.getElementById('drawerSubtitle'),
    drawerContext: document.getElementById('drawerContext'),
    drawerStats: document.getElementById('drawerStats'),
    drawerVisa: document.getElementById('drawerVisa'),
    drawerVibe: document.getElementById('drawerVibe'),
    datasetStamp: document.getElementById('datasetStamp'),
    globeViz: document.getElementById('globeViz')
};

init().catch((error) => {
    console.error('Failed to initialize globe tool:', error);
    els.resultsHint.textContent = 'The globe failed to load. Please refresh and try again.';
});

async function init() {
    setupInteractions();
    applyMode('income');

    const response = await fetch('./data.json');
    if (!response.ok) {
        throw new Error(`Unable to load data.json: ${response.status}`);
    }

    const payload = await response.json();
    state.allCities = Array.isArray(payload) ? payload : payload.cities || [];
    const datasetVersion = Array.isArray(payload) ? state.allCities[0]?.last_updated : payload.version;
    els.datasetStamp.textContent = `Dataset refreshed ${datasetVersion || 'recently'}.`;

    buildGlobe();
    updateView();
    syncMobileLayout();

    // Hide loader
    const loader = document.getElementById('globeLoader');
    if (loader) {
        loader.classList.add('hidden');
    }
}

function setupInteractions() {
    els.budgetSlider.addEventListener('input', (event) => {
        state.value = Number(event.target.value);
        updateView();
    });

    els.incomeModeButton.addEventListener('click', () => applyMode('income'));
    els.netWorthModeButton.addEventListener('click', () => applyMode('netWorth'));
    els.mobileSheetToggle.addEventListener('click', toggleMobileSheet);
    els.mobileGlobeTab.addEventListener('click', () => setMobileView('globe'));
    els.mobileListTab.addEventListener('click', () => setMobileView('list'));
    els.mobileGlobeExpand.addEventListener('click', toggleMobileGlobeExpand);
    els.drawerClose.addEventListener('click', closeDrawer);
    els.globeViz.addEventListener('click', handleStageClick);
    els.filterChips.forEach((button) => {
        button.addEventListener('click', () => {
            const group = button.dataset.filterGroup;
            const value = button.dataset.filterValue;
            state[group] = value;

            document.querySelectorAll(`[data-filter-group="${group}"]`).forEach((chip) => {
                chip.classList.toggle('active', chip === button);
            });

            updateView();
        });
    });
    window.addEventListener('resize', handleResize);
}

function applyMode(modeName) {
    const mode = MODES[modeName];
    state.mode = modeName;
    state.value = mode.value;

    els.budgetSlider.min = mode.min;
    els.budgetSlider.max = mode.max;
    els.budgetSlider.step = mode.step;
    els.budgetSlider.value = mode.value;
    els.sliderMin.textContent = formatCurrency(mode.min);
    els.sliderMax.textContent = formatCurrency(mode.max);
    els.incomeModeButton.classList.toggle('active', modeName === 'income');
    els.netWorthModeButton.classList.toggle('active', modeName === 'netWorth');

    updateView();
}

function buildGlobe() {
    state.globe = Globe()(els.globeViz)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .showAtmosphere(true)
        .atmosphereColor('#6cc6ff')
        .atmosphereAltitude(0.18)
        .pointAltitude((point) => (point.affordable ? 0.13 : 0.05))
        .pointRadius((point) => (point.affordable ? 0.38 : 0.16))
        .pointColor((point) => point.color)
        .pointResolution(20)
        .pointsMerge(false)
        .pointLabel((point) => tooltipMarkup(point))
        .labelSize(1.2)
        .labelDotRadius(0.32)
        .labelColor(() => '#f2f8ff')
        .labelText((point) => point.city)
        .labelAltitude((point) => (point.affordable ? 0.17 : 0.09))
        .labelLat((point) => point.lat)
        .labelLng((point) => point.lng)
        .labelLabel((point) => tooltipMarkup(point))
        .onPointClick((point) => {
            state.suppressNextStageClick = true;
            selectCity(point.id, { mobileView: 'globe' });
        })
        .onLabelClick((point) => {
            state.suppressNextStageClick = true;
            selectCity(point.id, { mobileView: 'globe' });
        });

    state.globe.controls().autoRotate = true;
    state.globe.controls().autoRotateSpeed = DEFAULT_AUTO_ROTATE_SPEED;
    state.globe.pointOfView({ lat: 20, lng: 12, altitude: 2.15 }, 0);
    handleResize();
}

function updateView() {
    const mode = MODES[state.mode];
    const monthlyIncome = mode.monthlyIncome(state.value);
    const formattedInput = mode.formatter(state.value);
    const formattedMonthly = `${formatCurrency(monthlyIncome)}/mo`;
    const selectionLabel = describeSelection();
    const selectionSummary = describeSelectionCompact();

    els.budgetLabel.textContent = mode.label;
    els.budgetValue.textContent = state.mode === 'netWorth'
        ? `${formattedInput}`
        : formattedMonthly.replace('/mo', '');
    els.monthlyEquivalentPill.textContent = formattedMonthly;
    els.mobileSheetSummary.textContent = `${formattedMonthly} · ${selectionSummary}`;
    els.lifestyleDetail.textContent = LIFESTYLE_EXPLANATIONS[state.lifestyle];

    const metricLabel = getProfileMetricLabel();
    state.affordableCities = state.allCities
        .map((city) => ({
            ...city,
            effective_monthly_cost: getCityCost(city)
        }))
        .filter((city) => city.effective_monthly_cost <= monthlyIncome)
        .sort((left, right) => {
            if (left.effective_monthly_cost !== right.effective_monthly_cost) {
                return left.effective_monthly_cost - right.effective_monthly_cost;
            }
            return getProfileMetricValue(right) - getProfileMetricValue(left);
        });

    const strongestMetric = [...state.affordableCities].sort((left, right) => getProfileMetricValue(right) - getProfileMetricValue(left))[0];
    const cheapest = state.affordableCities[0];

    els.affordableCount.textContent = String(state.affordableCities.length);
    els.mobileAffordableCount.textContent = String(state.affordableCities.length);
    els.cheapestCity.textContent = cheapest ? `${cheapest.city}, ${cheapest.country}` : 'None yet';
    els.mobileCheapestCity.textContent = cheapest ? `${cheapest.city}, ${cheapest.country}` : 'None yet';
    els.fastestInternet.previousElementSibling.textContent = metricLabel;
    els.fastestInternet.textContent = strongestMetric ? `${strongestMetric.city} · ${formatProfileMetric(strongestMetric)}` : 'None yet';
    els.mobileFastestInternet.previousElementSibling.textContent = metricLabel;
    els.mobileFastestInternet.textContent = strongestMetric ? `${strongestMetric.city} · ${formatProfileMetric(strongestMetric)}` : 'None yet';
    els.resultsHint.textContent = state.affordableCities.length
        ? `${state.affordableCities.length} cities fit ${selectionLabel}.`
        : `No matches yet for ${selectionLabel}.`;
    els.mobileResultsHint.textContent = state.affordableCities.length
        ? `${state.affordableCities.length} cities fit ${selectionLabel}.`
        : `No matches yet for ${selectionLabel}.`;
    els.stageValue.textContent = `${formattedMonthly} unlocks ${state.affordableCities.length} cities`;

    renderCityList(monthlyIncome);
    syncGlobe(monthlyIncome);

    if (state.selectedCityId && !state.allCities.find((city) => city.id === state.selectedCityId)) {
        state.selectedCityId = null;
    }

    if (state.selectedCityId) {
        const selected = state.allCities.find((city) => city.id === state.selectedCityId);
        if (selected) {
            openDrawer(selected, monthlyIncome);
        }
    }
}

function syncGlobe(monthlyIncome) {
    if (!state.globe) {
        return;
    }

    const pointData = state.allCities.map((city) => {
        const effectiveMonthlyCost = getCityCost(city);
        return {
        ...city,
        effective_monthly_cost: effectiveMonthlyCost,
        affordable: effectiveMonthlyCost <= monthlyIncome,
        color: effectiveMonthlyCost <= monthlyIncome ? '#41e2ba' : 'rgba(159, 182, 207, 0.48)'
    };
    });

    const labelData = pointData.filter((city) => city.affordable);
    const ringData = pointData.filter((city) => city.affordable);

    state.globe
        .pointsData(pointData)
        .labelsData(labelData)
        .ringsData(ringData)
        .ringColor(() => 'rgba(65, 226, 186, 0.65)')
        .ringMaxRadius(3.4)
        .ringPropagationSpeed(1.4)
        .ringRepeatPeriod(1100);
}

function renderCityList(monthlyIncome) {
    const topCities = [...state.affordableCities]
        .sort((left, right) => getProfileMetricValue(right) - getProfileMetricValue(left))
        .slice(0, 8);

    if (!topCities.length) {
        const emptyMarkup = `
            <div class="city-card">
                <strong>No cities unlocked yet</strong>
                <p style="margin:0.55rem 0 0;color:var(--muted);">Try a higher monthly budget or switch to net worth mode to see more options.</p>
            </div>
        `;
        els.cityList.innerHTML = emptyMarkup;
        els.mobileCityList.innerHTML = emptyMarkup;
        return;
    }

    const cardMarkup = topCities.map((city) => {
        const margin = Math.round(monthlyIncome - city.effective_monthly_cost);
        const isActive = city.id === state.selectedCityId;
        return `
            <button class="city-card ${isActive ? 'active' : ''}" data-city-id="${city.id}" type="button">
                <div class="city-card-head">
                    <div>
                        <strong>${city.city}</strong>
                        <span>${city.country}</span>
                    </div>
                    <strong>${formatCurrency(city.effective_monthly_cost)}/mo</strong>
                </div>
                <div class="city-card-meta">
                    <span>${formatProfileMetric(city)}</span>
                    <span>${margin >= 0 ? `${formatCurrency(margin)} cushion` : 'At limit'}</span>
                </div>
            </button>
        `;
    }).join('');
    els.cityList.innerHTML = cardMarkup;
    els.mobileCityList.innerHTML = cardMarkup;

    document.querySelectorAll('[data-city-id]').forEach((button) => {
        button.addEventListener('click', () => selectCity(button.getAttribute('data-city-id'), { mobileView: 'list' }));
    });
}

function selectCity(cityId, options = {}) {
    const { mobileView = state.mobileView } = options;
    const city = state.affordableCities.find((entry) => entry.id === cityId)
        || state.allCities.find((entry) => entry.id === cityId);
    if (!city) {
        return;
    }

    pauseAutoRotate();
    state.selectedCityId = cityId;
    const monthlyIncome = MODES[state.mode].monthlyIncome(state.value);
    if (isMobileLayout()) {
        setMobileView(mobileView);
        closeMobileSheet();
    }
    renderCityList(monthlyIncome);
    openDrawer(city, monthlyIncome);

    if (state.globe) {
        state.globe.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.2 }, 1100);
    }
}

function openDrawer(city, monthlyIncome) {
    const effectiveMonthlyCost = city.effective_monthly_cost ?? getCityCost(city);
    const surplus = monthlyIncome - effectiveMonthlyCost;
    const affordText = surplus >= 0 ? `+${formatCurrency(surplus)}` : `-${formatCurrency(Math.abs(surplus))}`;

    els.drawerTitle.textContent = city.city;
    els.drawerSubtitle.textContent = `${city.country} · ${city.region}`;
    els.drawerContext.textContent = `Showing costs for ${describeSelection()}.`;
    els.drawerVisa.textContent = city.top_visa;
    els.drawerVibe.textContent = city.vibe;
    els.drawerStats.innerHTML = [
        statMarkup('Monthly cost', `${formatCurrency(effectiveMonthlyCost)}/mo`),
        statMarkup(getProfileMetricLabel(true), formatProfileMetric(city)),
        statMarkup('Vs your budget', affordText),
        statMarkup('Best for', city.slug.replace(/-/g, ' '))
    ].join('');
    els.cityDrawer.classList.add('open');
}

function closeDrawer() {
    els.cityDrawer.classList.remove('open');
}

function handleStageClick() {
    if (state.suppressNextStageClick) {
        state.suppressNextStageClick = false;
        return;
    }

    if (state.mobileGlobeExpanded) {
        return;
    }

    if (isMobileLayout() && state.mobileSheetOpen) {
        closeMobileSheet();
    }

    pauseAutoRotate({ shouldResume: true });
}

function pauseAutoRotate(options = {}) {
    const { shouldResume = false, delayMs = RESUME_DELAY_MS } = options;

    clearRotationTimers();

    if (!state.globe) {
        return;
    }

    state.globe.controls().autoRotate = false;

    if (shouldResume) {
        state.resumeTimeoutId = window.setTimeout(() => {
            resumeAutoRotateGradually();
        }, delayMs);
    }
}

function resumeAutoRotateGradually() {
    if (!state.globe) {
        return;
    }

    const controls = state.globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = RESUME_AUTO_ROTATE_SPEED;

    const rampStart = RESUME_AUTO_ROTATE_SPEED;
    const rampEnd = DEFAULT_AUTO_ROTATE_SPEED;
    const rampDurationMs = 2600;
    const rampTickMs = 120;
    const startedAt = Date.now();

    state.rampIntervalId = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const progress = Math.min(elapsed / rampDurationMs, 1);
        controls.autoRotateSpeed = rampStart + ((rampEnd - rampStart) * progress);

        if (progress >= 1) {
            window.clearInterval(state.rampIntervalId);
            state.rampIntervalId = null;
        }
    }, rampTickMs);
}

function clearRotationTimers() {
    if (state.resumeTimeoutId) {
        window.clearTimeout(state.resumeTimeoutId);
        state.resumeTimeoutId = null;
    }

    if (state.rampIntervalId) {
        window.clearInterval(state.rampIntervalId);
        state.rampIntervalId = null;
    }
}

function tooltipMarkup(point) {
    return `
        <div class="globe-tooltip">
            <strong>${point.city}, ${point.country}</strong>
            <span>${formatCurrency(point.effective_monthly_cost ?? getCityCost(point))}/mo · ${formatProfileMetric(point)}</span>
        </div>
    `;
}

function getProfileMetricLabel(shortLabel = false) {
    if (state.profile === 'retiree') {
        return shortLabel ? 'Healthcare' : 'Best Healthcare';
    }

    return shortLabel ? 'Internet' : 'Fastest Internet';
}

function getProfileMetricValue(city) {
    return state.profile === 'retiree' ? city.healthcare_score : city.internet_mbps;
}

function formatProfileMetric(city) {
    if (state.profile === 'retiree') {
        return `${city.healthcare_score}/5 healthcare`;
    }

    return `${city.internet_mbps} Mbps internet`;
}

function getCityCost(city) {
    const householdCosts = city.costs?.[state.household];
    const baseCost = householdCosts?.[state.lifestyle];
    const adjustment = city.profile_adjustments?.[state.profile] ?? 0;
    return (baseCost ?? 0) + adjustment;
}

function describeSelection() {
    const householdLabels = {
        solo: 'a solo',
        couple: 'a couple',
        family: 'a family'
    };
    const profileLabels = {
        remote_worker: 'remote worker',
        retiree: 'retiree'
    };
    const lifestyleLabels = {
        lean: 'lean lifestyle',
        moderate: 'moderate lifestyle',
        luxury: 'luxury lifestyle'
    };

    return `${householdLabels[state.household]} ${profileLabels[state.profile]} with a ${lifestyleLabels[state.lifestyle]}`;
}

function describeSelectionCompact() {
    const householdLabels = {
        solo: 'Solo',
        couple: 'Couple',
        family: 'Family'
    };
    const profileLabels = {
        remote_worker: 'Remote Worker',
        retiree: 'Retiree'
    };
    const lifestyleLabels = {
        lean: 'Lean',
        moderate: 'Moderate',
        luxury: 'Luxury'
    };

    return `${householdLabels[state.household]} · ${profileLabels[state.profile]} · ${lifestyleLabels[state.lifestyle]}`;
}

function statMarkup(label, value) {
    return `
        <div class="drawer-stat">
            <span class="summary-kicker">${label}</span>
            <strong>${value}</strong>
        </div>
    `;
}

function handleResize() {
    syncMobileLayout();
    if (!state.globe) {
        return;
    }

    const width = els.globeViz.clientWidth;
    const height = els.globeViz.clientHeight;
    state.globe.width(width).height(height);
}

function isMobileLayout() {
    return window.innerWidth <= 860;
}

function toggleMobileSheet() {
    if (!isMobileLayout()) {
        return;
    }

    state.mobileSheetOpen = !state.mobileSheetOpen;
    syncMobileSheet();
}

function closeMobileSheet() {
    state.mobileSheetOpen = false;
    syncMobileSheet();
}

function syncMobileSheet() {
    const isOpen = isMobileLayout() && state.mobileSheetOpen;
    els.controlPanel.classList.toggle('mobile-open', isOpen);
    els.mobileSheetToggle.setAttribute('aria-expanded', String(isOpen));
}

function setMobileView(viewName) {
    const activeView = isMobileLayout() ? viewName : 'globe';
    state.mobileView = activeView;
    if (activeView !== 'globe') {
        state.mobileGlobeExpanded = false;
    }
    els.mobileGlobeTab.classList.toggle('active', activeView === 'globe');
    els.mobileListTab.classList.toggle('active', activeView === 'list');
    els.mobileGlobeTab.setAttribute('aria-selected', String(activeView === 'globe'));
    els.mobileListTab.setAttribute('aria-selected', String(activeView === 'list'));
    els.mobileListPane.classList.toggle('active', activeView === 'list');
    els.mobileGlobeShell.classList.toggle('mobile-hidden', activeView === 'list');
    els.mobileGlobeExpand.classList.toggle('mobile-hidden', activeView !== 'globe');

    if (activeView === 'globe' && state.globe) {
        state.globe.width(els.globeViz.clientWidth).height(els.globeViz.clientHeight);
    }
}

function syncMobileLayout() {
    if (!isMobileLayout()) {
        state.mobileSheetOpen = false;
        state.mobileGlobeExpanded = false;
    }

    setMobileView(state.mobileView);
    syncMobileSheet();
    syncMobileGlobeExpand();
}

function toggleMobileGlobeExpand() {
    if (!isMobileLayout() || state.mobileView !== 'globe') {
        return;
    }

    state.mobileGlobeExpanded = !state.mobileGlobeExpanded;
    syncMobileGlobeExpand();

    if (state.globe) {
        state.globe.width(els.globeViz.clientWidth).height(els.globeViz.clientHeight);
    }
}

function syncMobileGlobeExpand() {
    const isExpanded = isMobileLayout() && state.mobileView === 'globe' && state.mobileGlobeExpanded;
    els.mobileGlobeShell.classList.toggle('mobile-expanded', isExpanded);
    els.mobileGlobeExpand.innerHTML = isExpanded ? CLOSE_ICON : EXPAND_ICON;
    els.mobileGlobeExpand.setAttribute('aria-expanded', String(isExpanded));
    els.mobileGlobeExpand.setAttribute('aria-label', isExpanded ? 'Close expanded globe' : 'Expand globe');
    document.body.classList.toggle('globe-modal-open', isExpanded);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}
