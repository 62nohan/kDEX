let tradeSection, loginButton, walletConnectArea, walletStatus, walletAddressSpan,
    addUsdcButton, usdcBalanceSpan, tokenBalanceSpan, tokenPriceSpan, priceChangeSpan,
    buyAmountInput, buyCostSpan, buyButton, buySpinner, buyBtnText,
    sellAmountInput, sellRevenueSpan, sellButton, sellSpinner, sellBtnText,
    transactionListUl, noTransactionsLi, buyMaxButton, sellMaxButton,
    priceChartCanvas, marketCapSpan, totalSupplySpan, circulatingSupplySpan,
    circulatingPercentSpan, dailyHighSpan, dailyLowSpan, dailyVolumeSpan,
    chainSpan, communitySpan, websiteSpan, notificationArea,
    buyLimitPriceInput, buyLimitButton, buyLimitSpinner, buyLimitBtnText,
    sellLimitPriceInput, sellLimitButton, sellLimitSpinner, sellLimitBtnText,
    openOrdersSection, openOrdersListUl, noOrdersLi;

function queryDOMElements() {
    tradeSection = document.getElementById('trade-section');
    loginButton = document.getElementById('login-button');
    walletConnectArea = document.getElementById('wallet-connect-area');
    walletStatus = document.getElementById('wallet-status');
    walletAddressSpan = document.getElementById('wallet-address');
    addUsdcButton = document.getElementById('add-usdc-button');
    usdcBalanceSpan = document.getElementById('usdc-balance');
    tokenBalanceSpan = document.getElementById('token-balance');
    tokenPriceSpan = document.getElementById('token-price');
    priceChangeSpan = document.getElementById('price-change');
    buyAmountInput = document.getElementById('buy-amount');
    buyCostSpan = document.getElementById('buy-cost');
    buyButton = document.getElementById('buy-button');
    buySpinner = buyButton?.querySelector('.spinner');
    buyBtnText = buyButton?.querySelector('.btn-text');
    sellAmountInput = document.getElementById('sell-amount');
    sellRevenueSpan = document.getElementById('sell-revenue');
    sellButton = document.getElementById('sell-button');
    sellSpinner = sellButton?.querySelector('.spinner');
    sellBtnText = sellButton?.querySelector('.btn-text');
    transactionListUl = document.getElementById('transaction-list');
    noTransactionsLi = transactionListUl?.querySelector('.no-transactions');
    buyMaxButton = document.getElementById('buy-max-button');
    sellMaxButton = document.getElementById('sell-max-button');
    priceChartCanvas = document.getElementById('price-chart');
    marketCapSpan = document.getElementById('market-cap');
    totalSupplySpan = document.getElementById('total-supply');
    circulatingSupplySpan = document.getElementById('circulating-supply');
    circulatingPercentSpan = document.getElementById('circulating-percent');
    dailyHighSpan = document.getElementById('24h-high');
    dailyLowSpan = document.getElementById('24h-low');
    dailyVolumeSpan = document.getElementById('24h-volume');
    chainSpan = document.getElementById('Chain');
    communitySpan = document.getElementById('Community');
    websiteSpan = document.getElementById('Website');
    notificationArea = document.getElementById('notification-area');
    buyLimitPriceInput = document.getElementById('buy-limit-price');
    buyLimitButton = document.getElementById('buy-limit-button');
    buyLimitSpinner = buyLimitButton?.querySelector('.spinner');
    buyLimitBtnText = buyLimitButton?.querySelector('.btn-text');
    sellLimitPriceInput = document.getElementById('sell-limit-price');
    sellLimitButton = document.getElementById('sell-limit-button');
    sellLimitSpinner = sellLimitButton?.querySelector('.spinner');
    sellLimitBtnText = sellLimitButton?.querySelector('.btn-text');
    openOrdersSection = document.getElementById('open-orders-section');
    openOrdersListUl = document.getElementById('open-orders-list');
    noOrdersLi = openOrdersListUl?.querySelector('.no-orders');
    console.log("DOM Elements queried.");
    return !!(loginButton && tradeSection && priceChartCanvas && usdcBalanceSpan && tokenBalanceSpan);
}

let localUsdcBalance = 0;
let localTokenBalance = 0;
let priceChart = null;
let currentOrders = [];
let currentTransactions = [];
const MAX_TRANSACTIONS_HISTORY = 100; 

const NOTIFICATION_TIMEOUT = 5000;
function formatNumber(num, decimals = 2) { if (isNaN(num) || num === null) { return decimals === 2 ? '0.00' : '0.0000'; } return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num); }
function showNotification(message, type = 'info') { if(!notificationArea) return; const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; notificationArea.appendChild(notification); setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateX(100%)'; notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease'; setTimeout(() => notification.remove(), 500); }, NOTIFICATION_TIMEOUT); }
function setButtonLoading(button, textElement, spinnerElement, isLoading) { if(!button || !textElement || !spinnerElement) return; if (isLoading) { button.disabled = true; spinnerElement.classList.remove('hidden'); textElement.style.visibility = 'hidden'; } else { button.disabled = false; spinnerElement.classList.add('hidden'); textElement.style.visibility = 'visible'; } }

function updateBalanceUI() {
    if (usdcBalanceSpan) usdcBalanceSpan.textContent = formatNumber(localUsdcBalance, 2);
    if (tokenBalanceSpan) tokenBalanceSpan.textContent = formatNumber(localTokenBalance, 4);
}

function updatePriceHeaderDisplay(price) {
    if (!tokenPriceSpan) return;
    let currentPriceNum = parseFloat(price) || 0;
    let previousPriceNum = parseFloat(tokenPriceSpan.textContent.split(' ')[0]) || 0;
    let priceColor = 'var(--color-text-dark)';
    let arrowIcon = '';
    if (currentPriceNum > previousPriceNum) { 
        priceColor = 'var(--color-success)'; 
        arrowIcon = '↑'; }
    else if (currentPriceNum < previousPriceNum) { 
        priceColor = 'var(--color-danger)'; 
        arrowIcon = '↓'; }
    tokenPriceSpan.innerHTML = `${currentPriceNum > 0 ? currentPriceNum.toFixed(6) : '0.000000'} USDC <span style="color: ${priceColor}; margin-left: 5px; display: inline-block; width: 1em;">${arrowIcon}</span>`;
}

function updateMarketStatsUI(stats) {
    if (!stats) return;
    if (marketCapSpan) marketCapSpan.textContent = '$' + stats.marketCap;
    if (totalSupplySpan) totalSupplySpan.textContent = stats.totalSupply;
    if (circulatingSupplySpan) circulatingSupplySpan.textContent = stats.circulatingSupply;
    if (circulatingPercentSpan) circulatingPercentSpan.textContent = `(${stats.circulatingPercent}%)`;
    if (dailyVolumeSpan) dailyVolumeSpan.textContent = '$' + stats.dailyVolume;
    if (dailyHighSpan) dailyHighSpan.textContent = stats.dailyHigh;
    if (dailyLowSpan) dailyLowSpan.textContent = stats.dailyLow;
    if (priceChangeSpan) {
        priceChangeSpan.textContent = stats.priceChangePercent + '%';
        const change = parseFloat(stats.priceChangePercent);
        if (change > 0) priceChangeSpan.className = 'price-change change-positive';
        else if (change < 0) priceChangeSpan.className = 'price-change change-negative';
        else priceChangeSpan.className = 'price-change change-neutral';
    }
     if (stats.poolInfo) {
        if(chainSpan) chainSpan.textContent = stats.poolInfo.chain;
        if(communitySpan) { communitySpan.innerHTML = `<i class="fa-brands fa-twitter"></i> ${stats.poolInfo.socialsName}`; communitySpan.onclick = () => window.open(stats.poolInfo.socialsLink, '_blank'); communitySpan.style.cursor = 'pointer'; }
        if(websiteSpan) { websiteSpan.innerHTML = `<i class="fa-solid fa-globe"></i> ${stats.poolInfo.websiteName}`; websiteSpan.onclick = () => window.open(stats.poolInfo.websiteLink, '_blank'); websiteSpan.style.cursor = 'pointer'; }
    }
}

function addTransactionToUI(tx) {
    if (!transactionListUl || !tx) return;
     if (noTransactionsLi && !noTransactionsLi.classList.contains('hidden')) {
        noTransactionsLi.classList.add('hidden');
    }
    const li = document.createElement('li');
    let typeClass = 'tx-neutral';
    if (tx.type) {
         const lowerType = tx.type.toLowerCase();
         if (lowerType.includes('buy') && !lowerType.includes('limit sell')) typeClass = 'tx-buy';
         if (lowerType.includes('sell') && !lowerType.includes('limit buy')) typeClass = 'tx-sell';
         if (lowerType.includes('limit buy fill')) typeClass = 'tx-limit-buy-fill';
         if (lowerType.includes('limit sell fill')) typeClass = 'tx-limit-sell-fill';
    }

    const arrow = typeClass === 'tx-buy' || typeClass === 'tx-limit-buy-fill' ? '→' : '←';
    const time = tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '??:??:??';
    const price = tx.price ? tx.price.toFixed(6) : 'N/A';

    li.innerHTML = `
        <span class="tx-time">${time}</span>
        <span class="tx-type ${typeClass}">${tx.type || 'N/A'}</span>
        <span class="tx-details">${formatNumber(tx.usdcAmount, 2)} USDC ${arrow} ${formatNumber(tx.tokenAmount, 4)} NOC</span>
        <span class="tx-price">@ ${price}</span>
    `;
    transactionListUl.prepend(li);

    while (transactionListUl.children.length > MAX_TRANSACTIONS_HISTORY + 1) {
         let lastChild = transactionListUl.lastChild;
         if(lastChild && !lastChild.classList.contains('no-transactions')) {
             transactionListUl.removeChild(lastChild);
         } else { break; }
     }
}

function updateTransactionListUI(transactionsFromServer) {
     if (!transactionListUl) return;
     const placeholder = transactionListUl.querySelector('.no-transactions');
     transactionListUl.innerHTML = ''; 
     currentTransactions = transactionsFromServer || [];

     if (currentTransactions.length === 0 && placeholder) {
         transactionListUl.appendChild(placeholder); 
         placeholder.classList.remove('hidden');
     } else {
         if (placeholder) placeholder.classList.add('hidden'); 
         currentTransactions.forEach(tx => addTransactionToUI(tx));
     }
}

function updateOpenOrdersUI(ordersFromServer) {
    if (!openOrdersListUl) return;
    const placeholder = openOrdersListUl.querySelector('.no-orders');
    openOrdersListUl.innerHTML = ''; 
    currentOrders = ordersFromServer || [];

    if (currentOrders.length === 0 && placeholder) {
         openOrdersListUl.appendChild(placeholder);
         placeholder.classList.remove('hidden');
    } else {
        if (placeholder) placeholder.classList.add('hidden');
        currentOrders.forEach(order => {
             if (!order || typeof order.id === 'undefined') return; 
             const li = document.createElement('li');
             li.id = `order-${order.id}`;
             const typeClass = order.type || 'unknown';
             const amountToken = order.inputToken || '?';
             const targetToken = order.type === 'buy' ? 'NOC' : (order.type === 'sell' ? 'USDC' : '?');
             const formattedAmount = formatNumber(order.amount, amountToken === 'USDC' ? 2 : 4);
             const limitPrice = order.limitPrice ? order.limitPrice.toFixed(6) : 'N/A';

             li.innerHTML = `
                <span class="order-type ${typeClass}">${(order.type || 'N/A').toUpperCase()}</span>
                <span class="order-details">${formattedAmount} ${amountToken} → ${targetToken}</span>
                <span class="order-limit-price">@ ${limitPrice}</span>
                <button class="cancel-order-btn" data-order-id="${order.id}">Annuler</button>
            `;
            openOrdersListUl.prepend(li);

            const cancelButton = li.querySelector('.cancel-order-btn');
            if (cancelButton) {
                 cancelButton.addEventListener('click', (e) => {
                     const btn = e.target;
                     const orderIdToCancel = parseInt(btn.getAttribute('data-order-id'), 10);
                     if (!isNaN(orderIdToCancel)) {
                         btn.disabled = true; btn.textContent = '...';
                         console.log(`Client: Envoi annulation ordre ${orderIdToCancel}`);
                         socket.emit('cancel_limit_order', orderIdToCancel);
                     }
                 });
             }
        });
    }
}

// Graphique ApexCharts
function initializeChart(initialData = []) {
    if (!priceChartCanvas) {
        return;
    }
    if (!initialData) {
        initialData = []; 
    }
     if (initialData.length === 0) {
        console.warn("[initializeChart] Aucune donnée initiale fournie pour le graphique.");
    }
    let formattedData = [];
    try {
        formattedData = initialData.map((candle, index) => {
            if (!candle || typeof candle.x !== 'number' || !Array.isArray(candle.y) || candle.y.length !== 4 || candle.y.some(val => typeof val !== 'number' || isNaN(val))) {
                console.warn(`[initializeChart] Bougie invalide à l'index ${index}:`, JSON.stringify(candle));
                return null;
            }
            const dateX = new Date(candle.x);
            if (isNaN(dateX.getTime())) {
                console.warn(`[initializeChart] Timestamp invalide à l'index ${index}:`, candle.x);
                return null;
            }
            return { x: dateX, y: candle.y };
        }).filter(data => data !== null); 

        console.log(`[initializeChart] Données valides`);
        if (formattedData.length > 0) {
            console.log('[initializeChart] Première bougie formatée pour Apex:', JSON.stringify(formattedData[0]));
            console.log('[initializeChart] Dernière bougie formatée pour Apex:', JSON.stringify(formattedData[formattedData.length - 1]));
        } else if (initialData.length > 0) {
             priceChartCanvas.innerHTML = '<p style="color: var(--color-text-dark); text-align: center; padding-top: 50px;">Données du graphique invalides.</p>';
            return;
        } else {
             console.log("[initializeChart] Aucune donnée à afficher pour le graphique initial.");
            } 
    } catch (e) {
        console.error("[initializeChart] Erreur lors du formatage des données:", e);
        return;
    }

    // Définir les options du graphique
    const options = {
         series: [{ name: 'NOC/USDC', data: formattedData }], // Nommer la série
         chart: {
             type: 'candlestick',
             height: 400,
             background: 'transparent', // Utiliser le fond du conteneur
             foreColor: 'var(--color-text-light)',
             toolbar: { show: false },
             animations: { enabled: false }, // Désactiver pour éviter les sauts initiaux
             zoom: { enabled: false } // Désactiver zoom par défaut si non désiré
         },
         plotOptions: {
             candlestick: {
                 colors: { upward: 'var(--color-success)', downward: 'var(--color-danger)' },
                 wick: { useFillColor: true }
             }
         },
         xaxis: {
             type: 'datetime',
             labels: { style: { colors: 'var(--color-text-dark)', fontSize: '11px' } },
             axisBorder: { show: true, color: 'var(--color-border)', height: 1 },
             axisTicks: { show: true, color: 'var(--color-border)', height: 6 },
             tooltip: { enabled: false } // Désactiver tooltip par défaut sur l'axe X
         },
         yaxis: {
             labels: {
                 style: { colors: 'var(--color-text-dark)', fontSize: '11px' },
                 formatter: (val) => val ? val.toFixed(6) : '0.000000' // Gérer null/undefined
             },
             tooltip: { enabled: true },
             opposite: true // Mettre l'axe Y à droite
         },
         grid: {
             borderColor: 'var(--color-border)',
             strokeDashArray: 3,
             xaxis: { lines: { show: false } }, // Cacher lignes verticales grille X
             yaxis: { lines: { show: true } }  // Montrer lignes horizontales grille Y
         },
         tooltip: {
             enabled: true,
             theme: 'dark', // Utilise le thème ApexCharts, peut être personnalisé
             style: { fontSize: '12px', fontFamily: 'var(--font-family-base)' },
             x: { format: 'dd MMM yyyy HH:mm' }, // Format date/heure tooltip
             // Vous pouvez réutiliser votre fonction 'custom' si vous en aviez une
         }
     };

    // Vider le conteneur au cas où il y aurait un message d'erreur précédent
     if (priceChartCanvas) priceChartCanvas.innerHTML = '';

    // Détruire l'ancien graphique s'il existe
    if (priceChart) {
        console.log("[initializeChart] Destruction de l'ancien graphique existant.");
        try {
            priceChart.destroy();
        } catch (e) {
             console.warn("[initializeChart] Erreur lors de la destruction de l'ancien graphique:", e);
        }
    }
    priceChart = new ApexCharts(priceChartCanvas, options);

    console.log("[initializeChart] Tentative de rendu du graphique...");
    // Utiliser un setTimeout léger peut parfois aider si le DOM n'est pas *tout à fait* prêt
    // setTimeout(() => {
        priceChart.render()
            .then(() => console.log("[initializeChart] ===== Graphique rendu avec succès ! ====="))
            .catch(err => {
                 console.error("[initializeChart] ===== ERREUR lors du rendu initial :", err);
                 // Afficher une erreur dans la zone du graphique
                 if (priceChartCanvas) priceChartCanvas.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding-top: 50px;">Erreur lors de l\'affichage du graphique.</p>';
            });
    // }, 50); // Léger délai de 50ms

}

// --- Logique de Simulation d'Estimation (Client) ---
function updateEstimationUI() {
    const buyAmountUSDC = parseFloat(buyAmountInput?.value) || 0;
    const sellAmountNOC = parseFloat(sellAmountInput?.value) || 0;

    if (buyAmountUSDC > 0) {
        socket.emit('request_simulation', { amount: buyAmountUSDC, inputToken: 'USDC' });
    } else {
        if (buyCostSpan) buyCostSpan.textContent = '0.0000 NOC';
    }

    if (sellAmountNOC > 0) {
        socket.emit('request_simulation', { amount: sellAmountNOC, inputToken: 'NOC' });
    } else {
        if (sellRevenueSpan) sellRevenueSpan.textContent = '0.00 USDC';
    }
}

// --- Connexion Socket.IO et Gestion Événements ---
const socket = io();

socket.on('connect', () => {
    console.log('Connecté au serveur WebSocket:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('Déconnecté du serveur WebSocket:', reason);
    showNotification(`Déconnexion du serveur (${reason})`, 'error');
});

socket.on('connect_error', (err) => {
    console.error('Erreur de connexion Socket.IO:', err.message);
    showNotification(`Erreur connexion serveur: ${err.message}`, 'error');
});


socket.on('initial_state', (state) => {
    const isLateConnection = priceChart !== null;
    console.log(`[initial_state] Reçu. Connexion tardive: ${isLateConnection}`, state);

    if (!state) { console.error("État initial invalide."); return; }

    if (state.userBalance) {
        localUsdcBalance = state.userBalance.usdcBalance || 0;
        localTokenBalance = state.userBalance.tokenBalance || 0;
        updateBalanceUI();
    }
    if (state.marketStats) {
        updateMarketStatsUI(state.marketStats);
        updatePriceHeaderDisplay(state.marketStats.currentPrice || 0);
    }
    updateTransactionListUI(state.transactions || []);
    updateOpenOrdersUI(state.pendingLimitOrders || []);

    if (state.candleData && priceChartCanvas) {
        console.log(`[initial_state] Données graphiques reçues (${state.candleData.length} bougies). Tentative d'initialisation.`);
        if (state.candleData.length > 0) {
            console.log('[initial_state] Première bougie reçue:', JSON.stringify(state.candleData[0]));
            console.log('[initial_state] Dernière bougie reçue:', JSON.stringify(state.candleData[state.candleData.length - 1]));
        }
        initializeChart(state.candleData);
    } else {
        console.warn("[initial_state] Pas de données graphiques ou canvas non trouvé.");
    }
});

socket.on('update_balance', (balance) => {
    console.log('Solde mis à jour par serveur:', balance);
    localUsdcBalance = balance.usdcBalance || 0;
    localTokenBalance = balance.tokenBalance || 0;
    updateBalanceUI();
});

socket.on('update_price', (price) => {
    updatePriceHeaderDisplay(price);
    updateEstimationUI();
});

socket.on('update_pool', (newPoolState) => {
    console.log('Pool mis à jour (client):', newPoolState);
    updateEstimationUI();
});

socket.on('update_market_stats', (stats) => {
    updateMarketStatsUI(stats);

     if (stats && typeof stats.currentPrice !== 'undefined') {
        updatePriceHeaderDisplay(stats.currentPrice);
     }
});

socket.on('update_chart', (candleDataFromServer) => {
    if (priceChart) {
        const formattedData = candleDataFromServer.map(candle => ({
            x: new Date(candle.x),
            y: candle.y
        }));
        priceChart.updateSeries([{ data: formattedData }])
            .catch(err => console.error("Erreur updateSeries:", err));
    } else {
        console.warn("[update_chart] Instance de graphique non trouvée lors de la mise à jour.");

    }
});

socket.on('new_transaction', (tx) => {
    addTransactionToUI(tx);
});

socket.on('update_orders', (orders) => {
    updateOpenOrdersUI(orders);
});

socket.on('order_result', (result) => {
    console.log('Résultat ordre reçu:', result);
    if (result && result.message) {
        showNotification(result.message, result.success ? 'success' : 'error');
    }

    setButtonLoading(buyButton, buyBtnText, buySpinner, false);
    setButtonLoading(sellButton, sellBtnText, sellSpinner, false);
    setButtonLoading(buyLimitButton, buyLimitBtnText, buyLimitSpinner, false);
    setButtonLoading(sellLimitButton, sellLimitBtnText, sellLimitSpinner, false);

    if (result && !result.success && typeof result.orderId !== 'undefined') {
        const cancelButton = openOrdersListUl?.querySelector(`.cancel-order-btn[data-order-id="${result.orderId}"]`);
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.textContent = 'Annuler';
        }
    }
});

socket.on('simulation_result', (sim) => {
    if(!sim) return;
    if (sim.inputToken === 'USDC') {
        if(buyCostSpan) buyCostSpan.textContent = `${formatNumber(sim.outputAmount, 4)} NOC`;
    } else if (sim.inputToken === 'NOC') {
        if(sellRevenueSpan) sellRevenueSpan.textContent = `${formatNumber(sim.outputAmount, 2)} USDC`;
    }
});

socket.on('notification', (notif) => {
    if(notif && notif.message) {
        showNotification(notif.message, notif.type || 'info');
    }
});


function addEventListeners() {
    if (!loginButton) { console.error("Login button not found"); return; }

    loginButton.addEventListener('click', () => {
        console.log("Bouton Connect Wallet cliqué");
        if(tradeSection) tradeSection.classList.remove('hidden');
        if(walletConnectArea) walletConnectArea.classList.add('hidden');
        if(walletStatus) walletStatus.classList.remove('hidden');
        if(walletAddressSpan) walletAddressSpan.textContent = "1Cat...Simulated";
        showNotification("Wallet Simulée Connectée", "success");
    });

    if(addUsdcButton) addUsdcButton.addEventListener('click', () => socket.emit('add_test_usdc'));

    if (buyMaxButton && buyAmountInput) {
        buyMaxButton.addEventListener('click', () => {
            const maxBuyFloored = Math.floor(localUsdcBalance * 100) / 100;
            buyAmountInput.value = maxBuyFloored.toFixed(2); 
            updateEstimationUI();
        });
     }
    if (sellMaxButton && sellAmountInput) {
        sellMaxButton.addEventListener('click', () => {
            const maxSellFloored = Math.floor(localTokenBalance * 10000) / 10000;
            sellAmountInput.value = maxSellFloored.toFixed(4); 
            updateEstimationUI();
        });
     }

    if(buyAmountInput) buyAmountInput.addEventListener('input', updateEstimationUI);
    if(sellAmountInput) sellAmountInput.addEventListener('input', updateEstimationUI);

    if (buyButton) {
        buyButton.addEventListener('click', () => {
            const amountUSDC = parseFloat(buyAmountInput.value);
            if (isNaN(amountUSDC) || amountUSDC <= 0) return showNotification("Montant d'achat invalide", "error");
            setButtonLoading(buyButton, buyBtnText, buySpinner, true);
            socket.emit('place_market_order', { amount: amountUSDC, inputToken: 'USDC' });
            buyAmountInput.value = '';
            if(buyCostSpan) buyCostSpan.textContent = '0.0000 NOC';
        });
    }
     if (sellButton) {
        sellButton.addEventListener('click', () => {
            const amountNOC = parseFloat(sellAmountInput.value);
             if (isNaN(amountNOC) || amountNOC <= 0) return showNotification("Montant de vente invalide", "error");
             setButtonLoading(sellButton, sellBtnText, sellSpinner, true);
             socket.emit('place_market_order', { amount: amountNOC, inputToken: 'NOC' });
             sellAmountInput.value = '';
             if(sellRevenueSpan) sellRevenueSpan.textContent = '0.00 USDC';
        });
    }

    if (buyLimitButton) {
         buyLimitButton.addEventListener('click', () => {
             const amountUSDC = parseFloat(buyAmountInput.value);
             const limitPrice = parseFloat(buyLimitPriceInput.value);
             if (isNaN(amountUSDC) || amountUSDC <= 0) return showNotification("Montant d'achat invalide", "error");
             if (isNaN(limitPrice) || limitPrice <= 0) return showNotification("Prix limite d'achat invalide", "error");
             setButtonLoading(buyLimitButton, buyLimitBtnText, buyLimitSpinner, true);
             socket.emit('place_limit_order', { type: 'buy', amount: amountUSDC, limitPrice: limitPrice });
             buyAmountInput.value = '';
             buyLimitPriceInput.value = '';
             if(buyCostSpan) buyCostSpan.textContent = '0.0000 NOC';
         });
     }
    if (sellLimitButton) {
         sellLimitButton.addEventListener('click', () => {
             const amountNOC = parseFloat(sellAmountInput.value);
             const limitPrice = parseFloat(sellLimitPriceInput.value);
              if (isNaN(amountNOC) || amountNOC <= 0) return showNotification("Montant de vente invalide", "error");
             if (isNaN(limitPrice) || limitPrice <= 0) return showNotification("Prix limite de vente invalide", "error");
              setButtonLoading(sellLimitButton, sellLimitBtnText, sellLimitSpinner, true);
              socket.emit('place_limit_order', { type: 'sell', amount: amountNOC, limitPrice: limitPrice });
              sellAmountInput.value = '';
              sellLimitPriceInput.value = '';
              if(sellRevenueSpan) sellRevenueSpan.textContent = '0.00 USDC';
         });
     }
    console.log("Event listeners added.");
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé.");
    if (queryDOMElements()) {
        console.log("Éléments DOM trouvés. Ajout des écouteurs.");
        addEventListeners();
        console.log("Script client initialisé. En attente connexion et état serveur...");
    } else {
        console.error("Échec queryDOMElements. L'application ne fonctionnera pas.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Erreur Critique: Impossible de trouver les éléments HTML essentiels. Vérifiez la console (F12).</h1>';
    }
});

console.log("script.js client-side loaded.");