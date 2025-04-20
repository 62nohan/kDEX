# Noctal DEX – AMM Pool Simulation

This test DEX is a front-end simulation of a decentralized exchange using an Automated Market Maker (AMM) model like Uniswap/Raydium/... The project was developed for my personnal purposes, focusing on how liquidity pools operate, how token pricing is defined with the constant product formula, and how liquidity is affected by market actions.

## Purpose

The objective is to gain a practical understanding of:

- AMM mechanisms based on the constant product formula (x * y = k)
- Price impact and slippage
- Liquidity reserve dynamics
- Fee structures in DEX environments
- Automated trading behavior through bot simulations

## Features

- USDC/NOC token swap using a simulated AMM pool
- Adjustable reserves and real-time price calculation
- Market statistics including market cap, volume, supply, and 24h high/low
- Candlestick chart using ApexCharts
- Simulated trading bots with configurable behavior thresholds
- User wallet simulation with buy/sell functionality
- Transaction history with price tracking


NOTE: The frontend was partially created with the help of Gemini and the ApexChart documentation. However, the main goal of this project was to understand and implement the core principles behind AMM pools and DEX logic.

## Sources:
https://docs.pendle.finance/ProtocolMechanics/LiquidityEngines/AMM
https://apexcharts.com/javascript-chart-demos/candlestick-charts/category-x-axis/
https://xrpl.org/docs/tutorials/javascript/amm/create-an-amm
Gemini 2.5 Pro
