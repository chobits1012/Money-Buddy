import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
    try {
        console.log('Testing search...');
        const res = await yahooFinance.search('AAPL');
        console.log('Search res length:', res.quotes?.length);

        console.log('Testing quote...');
        const quoteRes = await yahooFinance.quote(['AAPL', '2330.TW']);
        console.log('Quote res:', quoteRes.map(q => q.symbol));
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
