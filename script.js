const tradeSection = document.getElementById('trade-section');
const loginButton = document.getElementById('login-button');
const walletConnectArea = document.getElementById('wallet-connect-area');
const walletStatus = document.getElementById('wallet-status');          
const walletAddressSpan = document.getElementById('wallet-address');      
const addUsdcButton = document.getElementById('add-usdc-button');
const usdcBalanceSpan = document.getElementById('usdc-balance');
const tokenBalanceSpan = document.getElementById('token-balance');
const tokenPriceSpan = document.getElementById('token-price');
const priceChangeSpan = document.getElementById('price-change');
const buyAmountInput = document.getElementById('buy-amount');
const buyCostSpan = document.getElementById('buy-cost'); 
const buyButton = document.getElementById('buy-button');
const buySpinner = buyButton.querySelector('.spinner'); 
const buyBtnText = buyButton.querySelector('.btn-text'); 
const sellAmountInput = document.getElementById('sell-amount');
const sellRevenueSpan = document.getElementById('sell-revenue'); 
const sellButton = document.getElementById('sell-button');
const sellSpinner = sellButton.querySelector('.spinner'); 
const sellBtnText = sellButton.querySelector('.btn-text'); 
const transactionListUl = document.getElementById('transaction-list');
const noTransactionsLi = transactionListUl.querySelector('.no-transactions'); 
const buyMaxButton = document.getElementById('buy-max-button');
const sellMaxButton = document.getElementById('sell-max-button');
const priceChartCanvas = document.getElementById('price-chart'); 
const marketCapSpan = document.getElementById('market-cap');
const totalSupplySpan = document.getElementById('total-supply');
const circulatingSupplySpan = document.getElementById('circulating-supply');
const circulatingPercentSpan = document.getElementById('circulating-percent');
const dailyHighSpan = document.getElementById('24h-high');
const dailyLowSpan = document.getElementById('24h-low');
const dailyVolumeSpan = document.getElementById('24h-volume');
const chainSpan = document.getElementById('Chain');
const communitySpan = document.getElementById('Community');
const websiteSpan = document.getElementById('Website');
const notificationArea = document.getElementById('notification-area');

const INITIAL_USER_USDC = 5000;
const INITIAL_USER_NOC = 0; // Retirer le montant à la supply(tokenReserve)
const BOT_SIMULATION_INTERVAL = 1000; 
const CANDLE_INTERVAL = 5000; 
const MAX_TRANSACTIONS_HISTORY = 100;
const CHART_HISTORY_LENGTH = 100; 
const NOTIFICATION_TIMEOUT = 5000; 

// Pool AMM 
const pool = {
    tokenReserve: 70000000, // 70M NOC
    usdcReserve: 100000, // 100 000 USDC 
    fee: 0.003, 
    tokenName: "Noctal Coin",
    tokenSymbol: "NOC",
    chain: "Noctal Chain",
    socialsLink: "https://twitter.com/", 
    socialsName: "X",
    websiteLink: "https://noctal.com/", 
    websiteName: "noctal.com"
};

// Initialisation des variables
const totalSupply = pool.tokenReserve;
let simulationInterval = null;
let usdcBalance = INITIAL_USER_USDC;
let tokenBalance = INITIAL_USER_NOC;
let circulatingSupply = totalSupply;

// Données du market
let currentTokenPrice = pool.usdcReserve / pool.tokenReserve;
let openingPrice = currentTokenPrice;
let dailyHigh = currentTokenPrice;
let dailyLow = currentTokenPrice;
let dailyVolume = 0;
let lastDailyReset = new Date();
let transactions = []; 
let priceChart = null; 
let candleData = [];   
 

// Test bots
const bots = [
    { id: 1, usdcBalance: 10000, tokenBalance: 0, actionThreshold: 0.9 },
    { id: 2, usdcBalance: 4000, tokenBalance: 0, actionThreshold: 0.9 },
    { id: 3, usdcBalance: 6000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 4, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 5, usdcBalance: 4000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 6, usdcBalance: 10000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 7, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 8, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 9, usdcBalance: 20000, tokenBalance: 0, actionThreshold: 0.1 },
    { id: 10, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.1 },
    { id: 11, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 12, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 13, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.5 },
    { id: 14, usdcBalance: 20000, tokenBalance: 0, actionThreshold: 0.5 },
    { id: 15, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.2 },
    { id: 16, usdcBalance: 7000, tokenBalance: 0, actionThreshold: 0.9 },
    { id: 17, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 18, usdcBalance: 8000, tokenBalance: 0, actionThreshold: 0.4 },
    { id: 19, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.5 },
    { id: 20, usdcBalance: 6000, tokenBalance: 0, actionThreshold: 0.8 },
    { id: 21, usdcBalance: 20000, tokenBalance: 0, actionThreshold: 0.9 },
    { id: 22, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.9 },
    { id: 23, usdcBalance: 6000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 24, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 25, usdcBalance: 4000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 26, usdcBalance: 10000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 27, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 28, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 29, usdcBalance: 10000, tokenBalance: 0, actionThreshold: 0.1 },
    { id: 30, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.1 },
    { id: 31, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 32, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.7 },
    { id: 33, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.5 },
    { id: 34, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.5 },
    { id: 35, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.2 },
    { id: 36, usdcBalance: 7000, tokenBalance: 0, actionThreshold: 0.9 },
    { id: 37, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.3 },
    { id: 38, usdcBalance: 8000, tokenBalance: 0, actionThreshold: 0.4 },
    { id: 39, usdcBalance: 5000, tokenBalance: 0, actionThreshold: 0.5 },
    { id: 40, usdcBalance: 6000, tokenBalance: 0, actionThreshold: 0.8 }
];
let botsState = JSON.parse(JSON.stringify(bots)); 


// Formater les nombres
function formatNumber(num, decimals = 2) {
    if (isNaN(num) || num === null) {
        return '0.00'; 
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

// Fonction pour obtenir le prix actuel du token
function getCurrentPrice() {
    if (pool.tokenReserve === 0)
        return 0;
    return pool.usdcReserve/pool.tokenReserve;
}

// Notifications
function showNotification(message, type = 'info') { 
    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // Style CSS basé sur le type (ex: info, success, error)
    notification.textContent = message;
    notificationArea.appendChild(notification);

    // Supprimer après un délai (NOTIFICATION_TIMEOUT)
    setTimeout(() => {
        //CSS pour la transition de sortie
        notification.style.opacity = '0'; 
        notification.style.transform = 'translateX(100%)'; 
        notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        setTimeout(() => notification.remove(), 500); 
    }, NOTIFICATION_TIMEOUT);
}

//Buttons
function setButtonLoading(button, textElement, spinnerElement, isLoading) {
    if (isLoading) {
        button.disabled = true;
        spinnerElement.classList.remove('hidden');
        textElement.style.visibility = 'hidden'; 
    } else {
        button.disabled = false;
        spinnerElement.classList.add('hidden');
        textElement.style.visibility = 'visible';
    }
}

// Fonction de swap (simulation d'une pool AMM comme Raydium)
function swap(inputAmount, inputToken) {
    const [inputReserve, outputReserve] = inputToken === 'USDC'
        ? [pool.usdcReserve, pool.tokenReserve]
        : [pool.tokenReserve, pool.usdcReserve];

    // On vérifie si les réserves/inputAmount sont valides
    if (inputReserve <= 0 || outputReserve <= 0 || inputAmount <= 0) 
        return 0;

    // Ici on peut ajouter un calcul de frais si nécessaire
    // ex: const inputAmountAfterFee = inputAmount * (1 - pool.fee);
    // Les frais seront déduis, il faurda implémenter un système de wallet ou ajouter les frais à la réserve/créateur

    const inputAmountAfterFee = inputAmount;  // Pour l'instant, pas de frais appliqués

    // Calcul de la sortie basé sur le produit constant k = x * y
    const k = inputReserve * outputReserve;
    if (inputReserve + inputAmountAfterFee === 0) 
        return 0; // Pour éviter la division par zéro
    const outputAmount = outputReserve - k / (inputReserve + inputAmountAfterFee);

    // Vérifier si la pool a assez de liquidité pour la sortie
    if (outputAmount > outputReserve || outputAmount < 0) {
        console.error("Swap impossible: Liquidité insuffisante");
        return 0;
    }

    // Mettre à jour les variables de la pool
    if (inputToken === 'USDC') { // USDC est l'input
        pool.usdcReserve += inputAmount; // USDC ajouté à la réserve (solde utilisateur)
        pool.tokenReserve -= outputAmount; // NOC retiré de la réserve (ajouté à l'utilisateur)
        circulatingSupply -= outputAmount; 

    } else { // NOC est l'input
        pool.tokenReserve += inputAmount; // NOC ajouté à la réserve (solde de token de l'utilisateur)
        pool.usdcReserve -= outputAmount; // USDC retiré de la réserve (ajouté au solde de l'utilisateur)
        circulatingSupply += inputAmount; 
    }

     // On vérifie que les réserves ne soient pas négatives
     pool.usdcReserve = Math.max(0, pool.usdcReserve);
     pool.tokenReserve = Math.max(0, pool.tokenReserve);
     circulatingSupply = Math.max(0, circulatingSupply); 
     updateDisplay(); 
     updateChart();
     updateMarketStats();
    return outputAmount;
}


// Fonction d'investissement des bots
function simulateBotsTrading() {
    botsState.forEach(bot => {
        if (Math.random() > bot.actionThreshold) return; // Seuil d'action qui permet de faire un bot plus ou moins agressif 

        const willBuy = Math.random() > 0.5;
        let amount, received;

        try { 
            if (willBuy && bot.usdcBalance > 1) { // Acheter
                amount = bot.usdcBalance * (0.1 + Math.random() * 0.2); 
                received = swap(amount, 'USDC'); 
                if (received > 0) {
                    dailyVolume += amount; 
                    bot.usdcBalance -= amount;
                    bot.tokenBalance += received;
                    addTransaction('Bot Buy', received, amount, getCurrentPrice());
                }
            }
            else if (!willBuy && bot.tokenBalance > 0.0001) { // Vendre 
                amount = bot.tokenBalance * (0.1 + Math.random() * 0.2);
                received = swap(amount, 'NOC'); 
                if (received > 0) {
                    dailyVolume += received; 
                    bot.tokenBalance -= amount;
                    bot.usdcBalance += received;
                    addTransaction('Bot Sell', amount, received, getCurrentPrice());
                }
            }
        } catch (error) {
            console.error("Erreur pendant le trade du bot:", error);
        }
    });
}

// Fonction d'affichage
function updateDisplay() {
    usdcBalanceSpan.textContent = formatNumber(usdcBalance, 2); // 2 décimales pour l'USDC
    tokenBalanceSpan.textContent = formatNumber(tokenBalance, 4); // 4 décimales pour le token
    currentTokenPrice = getCurrentPrice(); 
    const market = pool.usdcReserve; 
    marketCapSpan.textContent = '$' + formatNumber(market, 2);

    totalSupplySpan.textContent = formatNumber(totalSupply, 0); 
    circulatingSupplySpan.textContent = formatNumber(circulatingSupply, 0); 
    const circulatingPercent = totalSupply === 0 ? 0 : (circulatingSupply / totalSupply * 100);
    circulatingPercentSpan.textContent = `(${formatNumber(circulatingPercent, 2)}%)`;
    dailyVolumeSpan.textContent = '$' + formatNumber(dailyVolume, 2); 

    chainSpan.textContent = pool.chain;

    // Ajout de liens et réseaux sociaux (comme sur les DEX)
    communitySpan.innerHTML = `<i class="fa-brands fa-twitter"></i> ${pool.socialsName}`;
    communitySpan.onclick = () => window.open(pool.socialsLink, '_blank');
    communitySpan.style.cursor = 'pointer'; 
    websiteSpan.innerHTML = `<i class="fa-solid fa-globe"></i> ${pool.websiteName}`;
    websiteSpan.onclick = () => window.open(pool.websiteLink, '_blank');
    websiteSpan.style.cursor = 'pointer';

    const buyAmountUSDC = parseFloat(buyAmountInput.value) || 0;
    const sellAmountNOC = parseFloat(sellAmountInput.value) || 0;
    const estimatedNocReceived = currentTokenPrice > 0 ? buyAmountUSDC / currentTokenPrice : 0;
    const estimatedUsdcReceived = sellAmountNOC * currentTokenPrice;
    buyCostSpan.textContent = `${formatNumber(estimatedNocReceived, 4)} NOC`;
    sellRevenueSpan.textContent = `${formatNumber(estimatedUsdcReceived, 2)} USDC`;
}

// Fonction pour formater les données liées au graphique
function updateMarketStats() {
    const now = new Date();
    if (now.getDate() !== lastDailyReset.getDate()) { // Tous les jours
        openingPrice = currentTokenPrice; 
        dailyHigh = currentTokenPrice;
        dailyLow = currentTokenPrice > 0 ? currentTokenPrice : 0; 
        dailyVolume = 0; 
        lastDailyReset = now;
        console.log("Daily market stats reset");
    }

    currentTokenPrice = getCurrentPrice(); 
    dailyHigh = Math.max(dailyHigh, currentTokenPrice);
   
    if (dailyLow === 0 && currentTokenPrice > 0) {
        dailyLow = currentTokenPrice;
    } else if (currentTokenPrice > 0) {
        dailyLow = Math.min(dailyLow, currentTokenPrice);
    }

    // Calcul et affichage de la variation 24h
    const priceChange24h = openingPrice === 0 ? 0 : ((currentTokenPrice - openingPrice) / openingPrice * 100);
    dailyHighSpan.textContent = dailyHigh.toFixed(6);
    dailyLowSpan.textContent = dailyLow.toFixed(6);
    priceChangeSpan.textContent = `${formatNumber(priceChange24h, 2)}% `; 

    // CSS pour la variation du prix
    if (priceChange24h > 0) {
        priceChangeSpan.className = 'price-change change-positive';
    } else if (priceChange24h < 0) {
        priceChangeSpan.className = 'price-change change-negative';
    } else {
        priceChangeSpan.className = 'price-change change-neutral';
    }
}


function addTransaction(type, tokenAmount, usdcAmount, price) {
    if (noTransactionsLi && !noTransactionsLi.classList.contains('hidden')) {
        noTransactionsLi.classList.add('hidden');
    }

    const newTransaction = {
        type, 
        tokenAmount, 
        usdcAmount, 
        price,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    transactions.unshift(newTransaction); 

    if (transactions.length > MAX_TRANSACTIONS_HISTORY) {
        transactions.pop();
    }
    // HTML pour chaque transaction
    const li = document.createElement('li');
    const typeClass = type.toLowerCase().includes('buy') ? 'tx-buy' : 'tx-sell';
    const arrow = typeClass === 'tx-buy' ? '→' : '←';
    li.innerHTML = `
        <span class="tx-time">${newTransaction.timestamp}</span>
        <span class="tx-type ${typeClass}">${type}</span>
        <span class="tx-details">${formatNumber(usdcAmount, 2)} USDC ${arrow} ${formatNumber(tokenAmount, 4)} NOC</span>
        <span class="tx-price">@ ${price.toFixed(6)}</span>
    `;
    transactionListUl.prepend(li); 
    
    while (transactionListUl.children.length > MAX_TRANSACTIONS_HISTORY) {
        let elementToRemove = null; 
        if (noTransactionsLi && transactionListUl.lastChild === noTransactionsLi) {
            elementToRemove = noTransactionsLi.previousElementSibling;
        } else {
            elementToRemove = transactionListUl.lastChild;
        }

        if (elementToRemove && elementToRemove !== noTransactionsLi) {
             transactionListUl.removeChild(elementToRemove);
        } else {
            break;
        }
    }
}

// Graphique ApexCharts
function initializeChart() {
    generateInitialCandles();
    const options = {
        series: [{
            data: candleData
        }],
        chart: {
            type: 'candlestick',
            height: 400,
            background: '#1E293B',
            foreColor: '#E2E8F0',
            toolbar: {
                show: false
            },
            animations: {
                enabled: false
            }
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#10B981',  // Vert
                    downward: '#EF4444' // Rouge 
                },
                wick: {
                    useFillColor: true
                },
                candleColors: {
                    upward: '#10B981',
                    downward: '#EF4444'
                }
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                style: {
                    colors: '#94A3B8',
                    fontSize: '11px'
                },
                datetimeFormatter: {
                    hour: 'HH:mm'
                }
            },
            axisBorder: {
                show: true,
                color: '#2E3A4D',
                height: 1
            },
            axisTicks: {
                show: true,
                color: '#2E3A4D',
                height: 6
            },
            tooltip: {
                enabled: false
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#94A3B8',
                    fontSize: '11px'
                },
                formatter: function(val) {
                    return val.toFixed(6);
                }
            },
            tooltip: {
                enabled: true
            },
            opposite: true
        },
        grid: {
            borderColor: '#2E3A4D',
            strokeDashArray: 3,
            position: 'back',
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        tooltip: {
            enabled: true,
            theme: 'dark',
            style: {
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif'
            },
            custom: function({ seriesIndex, dataPointIndex, w }) {
                const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
                const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
                const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
                const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
                const change = ((c - o) / o * 100).toFixed(2);
                const changeColor = c >= o ? '#10B981' : '#EF4444';
                
                return `
                    <div class="apexcharts-tooltip-candlestick" style="padding: 8px 12px; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #94A3B8;">Open:</span>
                            <span style="font-weight: 500;">${o.toFixed(6)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #94A3B8;">High:</span>
                            <span style="font-weight: 500;">${h.toFixed(6)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #94A3B8;">Low:</span>
                            <span style="font-weight: 500;">${l.toFixed(6)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #94A3B8;">Close:</span>
                            <span style="font-weight: 500;">${c.toFixed(6)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #94A3B8;">Change:</span>
                            <span style="color: ${changeColor}; font-weight: 500;">${change}%</span>
                        </div>
                    </div>
                `;
            }
        }
    };

    priceChart = new ApexCharts(document.querySelector("#price-chart"), options);
    priceChart.render();
}
function generateInitialCandles() {
    candleData = []; 
    let lastClose = getCurrentPrice(); 
    const now = Date.now();

    for (let i = 0; i < CHART_HISTORY_LENGTH; i++) {
        const time = now - (CHART_HISTORY_LENGTH - i) * CANDLE_INTERVAL;
        const volatility = 0.00001 + Math.random() * 0.000005; 
        const open = lastClose;
        let close = open * (1 + (Math.random() * 2 - 1) * volatility);
        close = Math.max(close, 0.00001); // Empêcher prix <= 0

        candleData.push({
            x: new Date(time),
            y: [0, 0, 0, 0] // 0 pour générer des bougies vides (ajouté des variables (open, high, low, close) pour générer un graphique antérieur)
        });
        lastClose = close;
    }
}

// Fonction pour mettre à jour le graphique
function updateChart() {
    const currentPrice = getCurrentPrice();
    const now = new Date();
    
    if (candleData.length === 0) {
        candleData.push({ x: now, y: [currentPrice, currentPrice, currentPrice, currentPrice] });
   } else {
        const lastCandle = candleData[candleData.length - 1];
        const lastCandleTime = new Date(lastCandle.x).getTime();
        
        if (now.getTime() - lastCandleTime < CANDLE_INTERVAL) {
            lastCandle.y[1] = Math.max(lastCandle.y[1], currentPrice );
            lastCandle.y[2] = Math.min(lastCandle.y[2], currentPrice );
            lastCandle.y[3] = currentPrice;
        } else {
            const open = lastCandle.y[3];
            const close = currentPrice;
            const high = Math.max(open, close) * (1 + Math.random() * 0.002);
            const low = Math.min(open, close) * (1 - Math.random() * 0.002);
            
            candleData.push({
                x: now,
                y: [open, high, Math.max(low, 0.00001), close] 
            });
            
            if (candleData.length > CHART_HISTORY_LENGTH) { // Limiter la taille de l'historique des bougies à 100 pour le moment
                candleData.shift(); 
            }
        }
    }
    
    priceChart.updateSeries([{
        data: candleData
    }], false); // On désactive l'animation par défaut de ApexCharts
    
    updatePriceHeaderDisplay(currentPrice);
}

// Fonction pour mettre à jour l'affichage du prix
function updatePriceHeaderDisplay(currentPrice) {
    let priceColor = '#9CA3AF'; 
    let arrowIcon = ''; 

    if (candleData.length > 1) {
        const previousClose = candleData[candleData.length - 2].y[3];

        if (currentPrice > previousClose) { // CSS pour une animation du prix avec une flèche
            priceColor = 'var(--color-success)'; 
            arrowIcon = '↑';
        } else if (currentPrice < previousClose) {
            priceColor = 'var(--color-danger)';
            arrowIcon = '↓';
        }
    }
    tokenPriceSpan.innerHTML = `${currentPrice.toFixed(6)} USDC <span style="color: ${priceColor}; margin-left: 5px;">${arrowIcon}</span>`;
}


// Fonction pour calculer le max à acheter selon le solde
function calculateMaxBuy() {
    return usdcBalance;
}

// Fonction pour calculer le max à vendre selon le solde
function calculateMaxSell() {
    const price = getCurrentPrice();
    const maxSellableFromPool = price > 0 ? pool.usdcReserve / price : 0;  
    return Math.min(tokenBalance, maxSellableFromPool);
}

// Evennements
loginButton.addEventListener('click', () => {
    console.log("Connecting wallet...");
    tradeSection.classList.remove('hidden'); 
    walletConnectArea.classList.add('hidden'); 
    walletStatus.classList.remove('hidden');   
    walletAddressSpan.textContent = "1CatdoE...rW5"; 

    initializeChart(); 
    updateDisplay(); 
    updateMarketStats(); 

    if (!simulationInterval) {
        simulationInterval = setInterval(simulateBotsTrading, BOT_SIMULATION_INTERVAL);
        console.log("Bot simulation started");
    }
    showNotification("Wallet Connecté", "success");
});

// Ajout de testUSDC
addUsdcButton.addEventListener('click', () => {
    const amount = 100000; 
    usdcBalance += amount;
    updateDisplay(); 
    showNotification(`+${formatNumber(amount, 0)} USDC ajoutés (Test)`, "info");
});

// Boutons d'achat 
buyButton.addEventListener('click', () => {
    const amountUSDC = parseFloat(buyAmountInput.value);

    if (isNaN(amountUSDC) || amountUSDC <= 0) {
        showNotification("Veuillez entrer un montant valide", "error");
        return;
    }
    if (amountUSDC > usdcBalance) {
        showNotification("Solde USDC insuffisant", "error");
        return;
    }

    setButtonLoading(buyButton, buyBtnText, buySpinner, true);

    setTimeout(() => {
        try {
            const priceBefore = getCurrentPrice(); 
            const tokensReceived = swap(amountUSDC, 'USDC');

            if (tokensReceived > 0) {
                usdcBalance -= amountUSDC;
                tokenBalance += tokensReceived;
                buyAmountInput.value = ''; 

                addTransaction('User Buy', tokensReceived, amountUSDC, priceBefore);
                showNotification(`Achat réussi: ${formatNumber(tokensReceived, 4)} NOC`, "success");
            } else {
                showNotification("Échec de l'achat, veuillez rééssayer ", "error");
            }
        } catch (error) {
            console.error("Erreur lors de l'achat:", error);
            showNotification("Erreur technique lors de l'achat", "error");
        } finally {
            setButtonLoading(buyButton, buyBtnText, buySpinner, false);
        }
    }, 300); 
});

//Boutons de vente
sellButton.addEventListener('click', () => {
    const amountNOC = parseFloat(sellAmountInput.value);
    if (isNaN(amountNOC) || amountNOC <= 0) {
        showNotification("Veuillez entrer un montant valide", "error");
        return;
    }
    if (amountNOC > tokenBalance) {
        showNotification("Solde NOC insuffisant.", "error");
        return;
    }
     const estimatedReceive = amountNOC * getCurrentPrice(); 
     if (estimatedReceive > pool.usdcReserve) { 
        showNotification("Échec: Liquidité USDC insuffisante dans le pool", "error");
        return;
     }

    setButtonLoading(sellButton, sellBtnText, sellSpinner, true);

    setTimeout(() => {
        try {
            const priceBefore = getCurrentPrice();
            const usdcReceived = swap(amountNOC, 'NOC');

            if (usdcReceived > 0) {
                tokenBalance -= amountNOC;
                usdcBalance += usdcReceived;
                sellAmountInput.value = ''; 
                addTransaction('User Sell', amountNOC, usdcReceived, priceBefore);
                showNotification(`Vente réussie: ${formatNumber(usdcReceived, 2)} USDC`, "success");
            } else {
                showNotification("Échec de la vente, veuillez réessayer", "error");
            }
        } catch (error) {
            console.error("Erreur lors de la vente:", error);
            showNotification("Erreur technique lors de la vente", "error");
        } finally {
            setButtonLoading(sellButton, sellBtnText, sellSpinner, false);
        }
    }, 300); 
});


// Achat max
buyMaxButton.addEventListener('click', () => {
    const maxAmount = calculateMaxBuy();
    buyAmountInput.value = (Math.floor(maxAmount * 100) / 100).toFixed(2);
    updateDisplay();
});

// Vente max
sellMaxButton.addEventListener('click', () => {
    const maxAmount = calculateMaxSell();
    sellAmountInput.value = (Math.floor(maxAmount * 10) / 10).toFixed(1);
    updateDisplay();
});

// Fonction d'initialisation de l'application
function initializeApp() {
    console.log("Initializing Noctal DEX Interface...");
    usdcBalanceSpan.textContent = formatNumber(INITIAL_USER_USDC, 2);
    tokenBalanceSpan.textContent = formatNumber(INITIAL_USER_NOC, 4);
    totalSupplySpan.textContent = formatNumber(totalSupply, 0);
    updateDisplay(); 
    updateMarketStats(); 

    console.log("Interface ready. Connect wallet to start Noctal trading simulation");
}
document.addEventListener('DOMContentLoaded', initializeApp);
