const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const INITIAL_USER_USDC = 10000; 
const INITIAL_USER_NOC = 0; // Retirer le montant à la supply(tokenReserve)
const BOT_SIMULATION_INTERVAL = 1000; 
const CANDLE_INTERVAL = 5000;
const MAX_TRANSACTIONS_HISTORY = 100;
const CHART_HISTORY_LENGTH = 100;


// Pool AMM 
let pool = {
    tokenReserve: 70000000, // 70M NOC
    usdcReserve: 100000, // 100 000 USDC 
    fee: 0.000, 
    tokenName: "Noctal Coin",
    tokenSymbol: "NOC",
    chain: "Noctal Chain",
    socialsLink: "https://twitter.com/",
    socialsName: "X",
    websiteLink: "https://noctal.com/",
    websiteName: "noctal.com"
};

let totalSupply = pool.tokenReserve;
let circulatingSupply = pool.tokenReserve;

let openingPrice = 0; 
let dailyHigh = 0;
let dailyLow = 0;
let dailyVolume = 0;
let lastDailyReset = new Date();
let transactions = [];
let candleData = [];

let pendingLimitOrders = [];
let nextOrderId = 1;

let userSessions = {};


function initializeServerState() {
    circulatingSupply = pool.tokenReserve;
    const initialPrice = getCurrentPrice();
    openingPrice = initialPrice;
    dailyHigh = initialPrice;
    dailyLow = initialPrice > 0 ? initialPrice : 0;
    lastDailyReset = new Date();
    generateInitialCandles();
    console.log("Server state initialized. Initial Price:", initialPrice);
}

// Formater les nombres
function formatNumber(num, decimals = 2) {
    if (isNaN(num) || num === null) 
        return decimals === 2 ? '0.0000' : '0.000000';
    return new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    }).format(num);
}

// Fonction pour obtenir le prix actuel du token
function getCurrentPrice() {
    if (pool.tokenReserve <= 0 || pool.usdcReserve <= 0)
         return 0;
    return pool.usdcReserve/pool.tokenReserve;
}

// Simule un swap SANS modifier l'état (pour estimations)
function simulateSwap(inputAmount, inputToken) {
    const currentPool = pool;
    const [inputReserve, outputReserve] = inputToken === 'USDC' ? [currentPool.usdcReserve, currentPool.tokenReserve] : [currentPool.tokenReserve, currentPool.usdcReserve];
    if (inputReserve <= 0 || outputReserve <= 0 || inputAmount <= 0) return 0;
    const k = inputReserve * outputReserve;
    // TODO: Inclure l'impact potentiel des frais dans la simulation si nécessaire
    const inputAmountAfterFee = inputAmount * (1 - pool.fee); 
    const newInReserve = inputReserve + inputAmountAfterFee;
    if (newInReserve === 0) return 0;
    const newOutReserve = k / newInReserve;
    const outputAmount = outputReserve - newOutReserve;
    return (outputAmount > 0 && outputAmount <= outputReserve) ? outputAmount : 0; 
} 

// Fonction de swap (simulation d'une pool AMM comme Raydium)
function swap(inputAmount, inputToken) {
    const priceBefore = getCurrentPrice();
    const [inputReserve, outputReserve] = inputToken === 'USDC' 
    ? [pool.usdcReserve, pool.tokenReserve] 
    : [pool.tokenReserve, pool.usdcReserve];

    // On vérifie si les réserves/inputAmount sont valides
    if (inputReserve <= 0 || outputReserve <= 0 || inputAmount <= 0) {
        return { success: false, error: "Montant invalide ou réserves vides" };
    }

    // Ajout des frais
    const feeAmount = inputAmount * pool.fee;
    const inputAmountAfterFee = inputAmount - feeAmount;

    // Calcul de la sortie basé sur le produit constant k = x * y
    const k = inputReserve * outputReserve;
    const newInReserve = inputReserve + inputAmountAfterFee;

    if (newInReserve <= 0) { 
        return { success: false, error: "Montant invalide après frais" };
    }

    const newOutReserve = k / newInReserve;
    let outputAmount = outputReserve - newOutReserve;

     // Pour éviter la division par zéro
     if (outputAmount < 0 || isNaN(outputAmount)) {
        console.error("Swap impossible: Négatif ou NaN", {outputAmount}); 
        outputAmount = 0; 
        return { success: false, error: "Erreur de calcul du montant de sortie." };
    }

    // Vérifier si la pool a assez de liquidité pour la sortie
     if (outputAmount > outputReserve) {
        console.warn(`Essai sortie (${outputAmount}) > Réserve (${outputReserve}). Plafonnement.`);
        outputAmount = outputReserve; 
        return { success: false, error: "Swap impossible: Liquidité insuffisante" };
    }


    // Mettre à jour les variables de la pool
    if (inputToken === 'USDC') { // USDC est l'input
        pool.usdcReserve += inputAmount; // USDC ajouté à la réserve (solde utilisateur)
        pool.tokenReserve -= outputAmount; // NOC retiré de la réserve (ajouté à l'utilisateur)

    } else { // NOC est l'input
        pool.tokenReserve += inputAmount; // NOC ajouté à la réserve (solde de token de l'utilisateur)
        pool.usdcReserve -= outputAmount; // USDC retiré de la réserve (ajouté au solde de l'utilisateur)
    }

    // On vérifie que les réserves ne soient pas négatives
    pool.usdcReserve = Math.max(0, pool.usdcReserve);
    pool.tokenReserve = Math.max(0, pool.tokenReserve);
    circulatingSupply = pool.tokenReserve;

    console.log(`Swap: ${inputAmount} ${inputToken} -> ${outputAmount} ${inputToken === 'USDC' ? 'NOC' : 'USDC'}\nPool: ${pool.usdcReserve.toFixed(4)} USDC, ${pool.tokenReserve.toFixed(6)} NOC`);

    
    updateDailyStats(priceBefore);
    io.emit('update_pool', pool);
    io.emit('update_market_stats', getMarketStats());

    return { success: true, receivedAmount: outputAmount, priceBefore: priceBefore, priceAfter: getCurrentPrice(), feePaid: feeAmount };
}


function addTransaction(type, tokenAmount, usdcAmount, price, clientId = 'N/A') {
    const newTransaction = {
        id: Date.now() + Math.random(), 
        type, tokenAmount, usdcAmount, price,
        timestamp: new Date().toISOString(),
        clientId: clientId 
    };

    transactions.unshift(newTransaction);

    if (transactions.length > MAX_TRANSACTIONS_HISTORY) {
        transactions.pop();
    }

    io.emit('new_transaction', newTransaction); 
    console.log(`Transaction ajoutée: ${type} par ${clientId}`);
}

// Fonction pour placer un ordre limite
function placeLimitOrder(type, amount, limitPrice, clientId) {
    const userSession = userSessions[clientId];
    if (!userSession) return { success: false, error: "Session utilisateur non trouvée." };

    if (isNaN(amount) || amount <= 0 || isNaN(limitPrice) || limitPrice <= 0) {
        return { success: false, error: "Montant ou prix invalide." };
    }

    const orderId = nextOrderId++;
    const inputToken = type === 'buy' ? 'USDC' : 'NOC';
    let neededBalance = amount;

    // Vérifier et débiter le solde de l'utilisateur
    if (type === 'buy') {
        if (neededBalance > userSession.usdcBalance) {
            return { success: false, error: "Solde USDC insuffisant." };
        }
        userSession.usdcBalance -= neededBalance;
    } else { 
        if (neededBalance > userSession.tokenBalance) {
            return { success: false, error: "Solde NOC insuffisant." };
        }
        userSession.tokenBalance -= neededBalance;
    }

    const newOrder = { id: orderId, type, amount, limitPrice, status: 'pending', timestamp: new Date().toISOString(), clientId, inputToken };
    pendingLimitOrders.push(newOrder);

    console.log(`Ordre limite ${orderId} (${type}) placé par ${clientId}. Solde MàJ: ${userSession.usdcBalance.toFixed(4)} USDC, ${userSession.tokenBalance.toFixed(6)} NOC`);

    io.emit('update_orders', pendingLimitOrders); 
    io.to(clientId).emit('update_balance', { usdcBalance: userSession.usdcBalance, tokenBalance: userSession.tokenBalance });

    return { success: true, orderId: orderId };
}

// Fonction pour annuler un ordre limite
function cancelLimitOrder(orderId, clientId) {
    const orderIndex = pendingLimitOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return { success: false, error: "Ordre non trouvé." };

    const order = pendingLimitOrders[orderIndex];
    if (order.clientId !== clientId) return { success: false, error: "Non autorisé." };
    if (order.status !== 'pending') return { success: false, error: `Ordre déjà ${order.status}.` };

    const userSession = userSessions[clientId];
    if (!userSession) return { success: false, error: "Session utilisateur non trouvée pour remboursement." };

    if (order.inputToken === 'USDC') {
        userSession.usdcBalance += order.amount;
    } else {
        userSession.tokenBalance += order.amount;
    }

    pendingLimitOrders.splice(orderIndex, 1); // Retirer l'ordre

    console.log(`Ordre limite ${orderId} annulé par ${clientId}. Solde MàJ: ${userSession.usdcBalance.toFixed(4)} USDC, ${userSession.tokenBalance.toFixed(6)} NOC`);

    io.emit('update_orders', pendingLimitOrders); 
    io.to(clientId).emit('update_balance', { usdcBalance: userSession.usdcBalance, tokenBalance: userSession.tokenBalance }); 

    return { success: true, orderId: orderId };
}

// Fonction pour vérifier et exécuter les ordres limites
function checkAndExecuteLimitOrders() {
    const currentPrice = getCurrentPrice();
    if (currentPrice <= 0) 
        return;

    let executed = false;
    [...pendingLimitOrders].forEach(order => {  // Itérer sur une copie pour pouvoir modifier l'original pendant l'itération
        const currentOrderIndex = pendingLimitOrders.findIndex(o => o.id === order.id);
        if (currentOrderIndex === -1 || order.status !== 'pending') 
            return; 

        let shouldExecute = false;

        if (order.type === 'buy' && currentPrice <= order.limitPrice && simulateSwap(order.amount, 'USDC') > 0) {
             shouldExecute = true;

        } else if (order.type === 'sell' && currentPrice >= order.limitPrice && simulateSwap(order.amount, 'NOC') > 0) {
            shouldExecute = true;
        }

        if (shouldExecute) {
            console.log(`Tentative exécution ordre limite ${order.id} (${order.type}) pour ${order.clientId}`);
            const userSession = userSessions[order.clientId];
            if (!userSession) {
                console.error(`Session non trouvée pour l'ordre ${order.id}, annulation implicite.`);
                 pendingLimitOrders.splice(currentOrderIndex, 1);
                 executed = true;
                 return;
            }

            const swapResult = swap(order.amount, order.inputToken);

            if (swapResult.success) {
                executed = true;
                pendingLimitOrders.splice(currentOrderIndex, 1); 

                // Créditer le solde de l'utilisateur
                if (order.inputToken === 'USDC') { 
                    userSession.tokenBalance += swapResult.receivedAmount;
                    
                } else { 
                    userSession.usdcBalance += swapResult.receivedAmount;
                }

                // Ajouter la transaction 
                const historyTokenAmount = order.inputToken === 'NOC' ? order.amount : swapResult.receivedAmount;
                const historyUsdcAmount = order.inputToken === 'USDC' ? order.amount : swapResult.receivedAmount;
                addTransaction(`Limit ${order.type.toUpperCase()} Fill`, historyTokenAmount, historyUsdcAmount, swapResult.priceBefore, order.clientId);

                 io.to(order.clientId).emit('update_balance', { usdcBalance: userSession.usdcBalance, tokenBalance: userSession.tokenBalance });
                 io.to(order.clientId).emit('order_result', {
                     success: true,
                     message: `Ordre limite ${order.id} (${order.type}) exécuté!`,
                     orderId: order.id,
                     receivedAmount: swapResult.receivedAmount,
                     outputToken: order.inputToken === 'USDC' ? 'NOC' : 'USDC'
                 });

                 console.log(`Ordre ${order.id} exécuté. Solde ${order.clientId}: ${userSession.usdcBalance.toFixed(4)} USDC, ${userSession.tokenBalance.toFixed(6)} NOC`);

            } else {
                console.warn(`Ordre limite ${order.id} déclenché mais swap échoué: ${swapResult.error}`);
                 const cancelResult = cancelLimitOrder(order.id, order.clientId); 
                 if (cancelResult.success) executed = true; 
                 io.to(order.clientId).emit('order_result', {
                     success: false,
                     message: `Échec exécution ordre ${order.id} (${swapResult.error})`,
                     orderId: order.id
                 });

            }
        }
    });

    if (executed) {
        io.emit('update_orders', pendingLimitOrders); // Diffuser la liste des ordres mise à jour
    }
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
            x: time,
            y: [0, 0, 0, 0] // 0 pour générer des bougies vides (ajouté des variables (open, high, low, close) pour générer un graphique antérieur)
        });
        lastClose = close;
    }
}

function updateChart(priceBeforeSwap = null) {
    const currentPrice = getCurrentPrice();
    const now = Date.now();

    if (candleData.length === 0) {
        candleData.push({ x: now, y: [currentPrice, currentPrice, currentPrice, currentPrice] });

    } else {
        const lastCandle = candleData[candleData.length - 1];
        const lastCandleTime = lastCandle.x;

        if (now - lastCandleTime < CANDLE_INTERVAL) {
            lastCandle.y[1] = Math.max(lastCandle.y[1], currentPrice); 
            const lowCheckPrice = priceBeforeSwap !== null ? Math.min(priceBeforeSwap, currentPrice) : currentPrice;
            lastCandle.y[2] = Math.min(lastCandle.y[2], lowCheckPrice); 
            lastCandle.y[3] = currentPrice; 
        } else {
            const open = lastCandle.y[3];
            const high = priceBeforeSwap !== null ? Math.max(open, priceBeforeSwap, currentPrice) : Math.max(open, currentPrice);
            const low = priceBeforeSwap !== null ? Math.min(open, priceBeforeSwap, currentPrice) : Math.min(open, currentPrice);
            const newCandleStartTime = lastCandleTime + CANDLE_INTERVAL * Math.floor((now - lastCandleTime) / CANDLE_INTERVAL);
            const newCandle = {
                x: newCandleStartTime,
                y: [open, parseFloat(high.toFixed(8)), parseFloat(Math.max(low, 0.000001).toFixed(8)), parseFloat(currentPrice.toFixed(8))]
            };
            candleData.push(newCandle);
            if (candleData.length > CHART_HISTORY_LENGTH){
                candleData.shift();
            }
        }
    } 
}


function updateDailyStats(priceForCandle) {
    const now = new Date();
    const currentPrice = getCurrentPrice();
    if (now.getDate() !== lastDailyReset.getDate()) {
        openingPrice = currentPrice; dailyHigh = currentPrice; dailyLow = currentPrice > 0 ? currentPrice : 0; dailyVolume = 0; lastDailyReset = now;
        console.log("Daily market stats reset. Opening Price:", openingPrice);
    }
    if (currentPrice > 0) {
        dailyHigh = Math.max(dailyHigh, currentPrice);
        dailyLow = dailyLow === 0 ? currentPrice : Math.min(dailyLow, currentPrice);
    }

    updateChart(priceForCandle); 
}

function getMarketStats() {
    const currentPrice = getCurrentPrice();
    const priceChange24h = openingPrice === 0 ? 0 : ((currentPrice - openingPrice) / openingPrice * 100);
    const estMarketCap = totalSupply * currentPrice;
    return {
        marketCap: formatNumber(estMarketCap, 2),
        totalSupply: formatNumber(totalSupply, 0),
        circulatingSupply: formatNumber(circulatingSupply, 0),
        circulatingPercent: formatNumber(totalSupply === 0 ? 0 : (circulatingSupply / totalSupply * 100), 2),
        dailyVolume: formatNumber(dailyVolume, 2),
        dailyHigh: dailyHigh > 0 ? dailyHigh.toFixed(6) : '0.000000',
        dailyLow: dailyLow > 0 ? dailyLow.toFixed(6) : '0.000000',
        priceChangePercent: formatNumber(priceChange24h, 2),
        currentPrice: currentPrice > 0 ? currentPrice.toFixed(6) : '0.000000',
        poolInfo: { tokenName: pool.tokenName, tokenSymbol: pool.tokenSymbol, chain: pool.chain, socialsLink: pool.socialsLink, socialsName: pool.socialsName, websiteLink: pool.websiteLink, websiteName: pool.websiteName }
    };
}


app.use(express.static(__dirname)); 

io.on('connection', (socket) => {
    console.log('Client connecté:', socket.id);

    userSessions[socket.id] = {
        usdcBalance: INITIAL_USER_USDC,
        tokenBalance: INITIAL_USER_NOC
    };
    console.log(`Session créée pour ${socket.id}, Solde initial: ${INITIAL_USER_USDC} USDC, ${INITIAL_USER_NOC} NOC`);
    console.log(`[server initial_state] Envoi de ${candleData.length} bougies à ${socket.id}`);
    if (candleData.length > 0) {
         console.log(`[server initial_state] Dernière bougie envoyée: ${JSON.stringify(candleData[candleData.length - 1])}`);
    }
    
    socket.emit('initial_state', {
        pool: pool,
        transactions: transactions,
        pendingLimitOrders: pendingLimitOrders,
        candleData: candleData,
        marketStats: getMarketStats(),
        userBalance: userSessions[socket.id], 
        candleData: candleData
    });

    socket.on('place_market_order', (data) => {
        const userSession = userSessions[socket.id];
        if (!userSession) return socket.emit('order_result', { success: false, message: "Session expirée?" });

        const amount = parseFloat(data.amount);
        const inputToken = data.inputToken === 'USDC' || data.inputToken === 'NOC' ? data.inputToken : null;

        if (!inputToken || isNaN(amount) || amount <= 0) {
            return socket.emit('order_result', { success: false, message: "Données invalides." });
        }

        if (inputToken === 'USDC' && amount > userSession.usdcBalance) {
            return socket.emit('order_result', { success: false, message: "Solde USDC insuffisant." });
        }
        if (inputToken === 'NOC' && amount > userSession.tokenBalance) {
            return socket.emit('order_result', { success: false, message: "Solde NOC insuffisant." });
        }

        const result = swap(amount, inputToken);

        if (result.success) {
             if (inputToken === 'USDC') dailyVolume += amount; else dailyVolume += result.receivedAmount;

            if (inputToken === 'USDC') {
                userSession.usdcBalance -= amount;
                userSession.tokenBalance += result.receivedAmount;

            } else { 
                userSession.tokenBalance -= amount;
                userSession.usdcBalance += result.receivedAmount;
            }

             
             const historyTokenAmount = inputToken === 'NOC' ? amount : result.receivedAmount;
             const historyUsdcAmount = inputToken === 'USDC' ? amount : result.receivedAmount;
             addTransaction(`User ${inputToken === 'USDC' ? 'Buy' : 'Sell'}`, historyTokenAmount, historyUsdcAmount, result.priceBefore, socket.id);

             socket.emit('update_balance', { usdcBalance: userSession.usdcBalance, tokenBalance: userSession.tokenBalance });
             socket.emit('order_result', {
                 success: true, message: `Ordre exécuté! Reçu: ${formatNumber(result.receivedAmount, inputToken === 'USDC' ? 4 : 2)} ${inputToken === 'USDC' ? 'NOC' : 'USDC'}`,
                 feePaid: result.feePaid
             });
             console.log(`Trade marché par ${socket.id}. Solde MàJ: ${userSession.usdcBalance.toFixed(2)} USDC, ${userSession.tokenBalance.toFixed(4)} NOC`);

            
        } else {
            socket.emit('order_result', { success: false, message: result.error || "Échec de l'ordre." });
        }
    });

    socket.on('place_limit_order', (data) => {
        const result = placeLimitOrder(data.type, parseFloat(data.amount), parseFloat(data.limitPrice), socket.id);
        socket.emit('order_result', result); 
    });

    socket.on('cancel_limit_order', (orderId) => {
         const result = cancelLimitOrder(parseInt(orderId, 10), socket.id); 
         socket.emit('order_result', result); 
    });

     socket.on('request_simulation', (data) => {
        const outputAmount = simulateSwap(parseFloat(data.amount), data.inputToken);
        socket.emit('simulation_result', { inputAmount: data.amount, inputToken: data.inputToken, outputAmount: outputAmount });
     });

     socket.on('add_test_usdc', () => {
         const userSession = userSessions[socket.id];
         if(userSession) {
            const amount = 100000; // test USDC
            userSession.usdcBalance += amount;
            console.log(`${socket.id} added ${amount} test USDC. New balance: ${userSession.usdcBalance}`);
            socket.emit('update_balance', { usdcBalance: userSession.usdcBalance, tokenBalance: userSession.tokenBalance });
            socket.emit('notification', { type: 'info', message: `+${formatNumber(amount, 0)} USDC (Test) ajoutés` });
         }
     });


    socket.on('disconnect', () => {
        console.log('Client déconnecté:', socket.id);
        if (userSessions[socket.id]) {
             const userOrders = pendingLimitOrders.filter(o => o.clientId === socket.id && o.status === 'pending');
             let refunded = false;
             userOrders.forEach(order => {
                 const orderIndex = pendingLimitOrders.findIndex(o => o.id === order.id);
                 if (orderIndex !== -1) {
                     pendingLimitOrders.splice(orderIndex, 1);
                     refunded = true;
                     console.log(`Ordre limite ${order.id} de l'utilisateur déconnecté ${socket.id} annulé.`);
                 }
             });
             if(refunded) io.emit('update_orders', pendingLimitOrders); 

            delete userSessions[socket.id];
            console.log(`Session nettoyée pour ${socket.id}. Sessions restantes: ${Object.keys(userSessions).length}`);
        }
    });
});


setInterval(() => {
    
    checkAndExecuteLimitOrders();

    const currentPrice = getCurrentPrice();
    updateChart(currentPrice); 
    io.emit('update_chart', candleData); 
    io.emit('update_price', currentPrice);

}, BOT_SIMULATION_INTERVAL);


initializeServerState(); 
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});