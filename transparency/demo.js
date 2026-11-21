(() => {
    const token = '0xba20e18817b93894f4667b8f7c5d5d1ba94cf271';
    const treasury = '0x33ce501714deb68c56a7a27ad369de7b62846cda';
    const endpoints = ['https://xdc.public-rpc.com', 'https://rpc.xinfin.network', 'https://erpc.xinfin.network'];
    const abi = ['function name() view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function totalSupply() view returns (uint256)', 'function balanceOf(address) view returns (uint256)'];
    const group = value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const money = cents => `$${group(cents / 100n)}.${String(cents % 100n).padStart(2, '0')}`;
    function settlement(amount, rate) {
        if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(String(amount)) || !Number.isInteger(rate) || rate < 125 || rate > 200) throw new Error('Enter a positive dollar amount with at most two decimal places.');
        const [whole, fraction = ''] = String(amount).split('.');
        const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
        if (cents <= 0n) throw new Error('Enter an amount greater than zero.');
        const fee = (cents * BigInt(rate) + 5000n) / 10000n;
        const burn = (fee * 2n + 1n) / 3n;
        const reserve = fee - burn;
        const metals = (reserve * 85n + 50n) / 100n;
        return {legacy: (cents * 300n + 5000n) / 10000n, fee, burn, reserve, metals, operations: reserve - metals};
    }
    function epoch(month) {
        if (!Number.isInteger(month) || month < 1 || month > 300) throw new Error('Month must be between 1 and 300.');
        return {
            supply: 70000000000n - 35000000000n * BigInt(month - 1) / 299n,
            copper: 5000000000n * BigInt(Math.min(month - 1, 79)) / 79n,
            gold: 500000000n * BigInt(Math.min(month - 1, 152)) / 152n,
            copperLocked: month >= 80,
            goldLocked: month >= 153
        };
    }
    async function liveSnapshot(lib, urls = endpoints) {
        if (!lib) throw new Error('RPC library unavailable.');
        for (const url of urls) {
            let provider, timer;
            try {
                const request = new lib.FetchRequest(url);
                request.timeout = 4500;
                provider = new lib.JsonRpcProvider(request, {name: 'xdc', chainId: 50}, {staticNetwork: true, batchMaxCount: 1});
                const work = async () => {
                    if (BigInt(await provider.send('eth_chainId', [])) !== 50n) throw new Error('Wrong chain.');
                    const contract = new lib.Contract(token, abi, provider);
                    const [name, symbol, decimals, supply, dead, nullBalance, treasuryBalance] = await Promise.all([
                        contract.name(), contract.symbol(), contract.decimals(), contract.totalSupply(),
                        contract.balanceOf('0x000000000000000000000000000000000000dEaD'),
                        contract.balanceOf('0x0000000000000000000000000000000000000000'), contract.balanceOf(treasury)
                    ]);
                    if (Number(decimals) < 0 || Number(decimals) > 36) throw new Error('Invalid decimals.');
                    const format = value => {
                        const full = lib.formatUnits(value, Number(decimals));
                        const [integer, fraction] = full.split('.');
                        const visible = (fraction || '').slice(0, 6).replace(/0+$/, '');
                        return `${group(integer)}${visible ? '.' + visible : ''} ${symbol}`;
                    };
                    return {url, name, symbol, decimals: String(decimals), supply: format(supply), dead: format(dead), nullBalance: format(nullBalance), treasuryBalance: format(treasuryBalance)};
                };
                return await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('RPC timeout.')), 6500); })]);
            } catch {
                continue;
            } finally {
                clearTimeout(timer);
                if (provider) provider.destroy();
            }
        }
        throw new Error('RPC Syncing');
    }
    const api = {settlement, epoch, money, liveSnapshot};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document === 'undefined') return;
    window.UnityDemo = api;
    const byId = id => document.getElementById(id);
    const set = (id, text) => { byId(id).textContent = text; };
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(button.dataset.copy);
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = 'Copy address'; }, 1800);
        } catch {
            set('xdc-note', 'Clipboard unavailable. Select the displayed address to copy it manually.');
        }
    }));
    document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => { byId('settlement-amount').value = button.dataset.preset; }));
    byId('fee-tier').addEventListener('input', () => set('fee-label', `${(Number(byId('fee-tier').value) / 100).toFixed(2)}%`));
    byId('settlement-form').addEventListener('submit', event => {
        event.preventDefault();
        if (byId('simulate-settlement').disabled) return;
        let values;
        try {
            values = settlement(byId('settlement-amount').value, Number(byId('fee-tier').value));
        } catch (error) {
            set('settlement-status', error.message);
            return;
        }
        byId('simulate-settlement').disabled = true;
        set('settlement-status', 'Simulating local settlement…');
        setTimeout(() => {
            set('legacy-fee', money(values.legacy));
            set('varis-fee', money(values.fee));
            set('burn-fee', money(values.burn));
            set('treasury-fee', money(values.reserve));
            set('treasury-allocation', `${money(values.metals)} metals · ${money(values.operations)} operations (cent-rounded, total conserved)`);
            byId('settlement-result').hidden = false;
            set('settlement-status', 'Simulated settlement < 1.0s · No transaction sent. Network execution times are not measured by this sandbox.');
            byId('simulate-settlement').disabled = false;
        }, 650);
    });
    function updateEpoch() {
        const month = Number(byId('epoch-month').value);
        const state = epoch(month);
        set('epoch-label', month);
        set('epoch-supply', `${group(state.supply)} UNT${month === 300 ? ' · 25-year halving target reached' : ' · modeled supply'}`);
        set('copper-state', state.copperLocked ? 'COPPER FAIL-STOP ENGAGED (100% OVERFLOW → NULL BURN)' : 'Copper accumulation · Month 80 fail-stop pending');
        set('gold-state', state.goldLocked ? 'GOLD FAIL-STOP ENGAGED (100% OVERFLOW → NULL BURN)' : 'Gold accumulation · Month 153 fail-stop pending');
        set('copper-grams', `${group(state.copper)} / 5,000,000,000 g · modeled copper`);
        set('gold-grams', `${group(state.gold)} / 500,000,000 g · 100M UGLD fully backed at cap (5g/UGLD)`);
    }
    byId('epoch-month').addEventListener('input', updateEpoch);
    document.querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => { byId('epoch-month').value = button.dataset.month; updateEpoch(); }));
    updateEpoch();
    liveSnapshot(window.ethers).then(snapshot => {
        for (const [id, value] of Object.entries({'token-name': snapshot.name, 'token-symbol': snapshot.symbol, 'token-decimals': snapshot.decimals, 'token-supply': snapshot.supply, 'burn-dead': snapshot.dead, 'burn-null': snapshot.nullBalance, 'treasury-balance': snapshot.treasuryBalance})) set(id, value);
        set('xdc-status', 'XDC MAINNET LIVE · Chain 50');
        set('xdc-note', `Read-only RPC verification from ${snapshot.url} at ${new Date().toLocaleString()}. Amounts display up to six fractional digits. Simulation milestones below are separate from these live readings.`);
    }).catch(() => {
        set('xdc-status', 'RPC Syncing · Chain 50');
        set('xdc-note', 'RPC Syncing. Displaying the 70,000,000,000 UNT genesis reference, not a current verified balance. Live burn and treasury balances remain pending; the local sandbox is available.');
    });
})();
