const path = require('path')
const { Sell } = require('../sniper')
const { ToWei } = require('../utils/decode')
const Types = require('../utils/types')
const { Instance } = require('./contract')

const store = new (require('node-storage'))(path.join(__dirname, '../../user/config.json'))

const config = store.get('config')
const tokens = store.get('tokens')

const checkProfits = async (tokenAddress) => {
    const token = getTokenByAddress(tokenAddress)

    const ContractPCS = (await Instance(
        Types.ROUTER,
        config.qsRouterContract,
        config
    )).methods
    /// Get expected matic
    const amountsMatic = await ContractPCS.getAmountsOut(
        ToWei(token.amountTokens, token.decimals),
        [token.address, config.wmaticContract]).call()

    const maticValue = parseInt(amountsMatic[1]) / 10 ** 18
    const expectedProfitAmount = token.buyAmount
        + (token.buyAmount * parseFloat(config.profitPercent) / 100)

    var response = {
        msg: 'Calculando...',
        profit: parseFloat(maticValue - token.buyAmount).toFixed(6),
        profitPercent: 0
    }

    response['profitPercent'] = maticValue > 0 ? parseFloat(response.profit * 100 / maticValue).toFixed(3) : -100
    if (maticValue >= expectedProfitAmount && config.sellInProfits) {
        // Profit ready
        // Sell
        response['msg'] = 'Profit alcanzado: Vendiendo...'
        await Sell(token, store)
    } else if (maticValue < token.buyAmount) {
        // Lossing
        response['msg'] = 'Estás en pérdidas...'
        if (response.profitPercent === -100)
            response['msg'] = 'TOKEN ESTAFA: Rug Pull Realizado'
    } else {
        // In profits
        response['msg'] = 'Estás en ganancias...'
    }

    return response
}

const getTokenByAddress = (address) => {
    return tokens.find(token => {
        return token.address.toLowerCase() === address.toLowerCase()
    })
}

module.exports = {
    checkProfits
}