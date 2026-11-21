const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pages = ['index.html', ...['unity','varis','V-Shelves','heychef','resort','transparency','ubooks-terminal','legal'].map(p => `${p}/index.html`)];
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const navCode = read('navigation.js');
const formCode = read('legal/privacy-form.js');
function classes(initial = '') {
    const values = new Set(initial.split(' ').filter(Boolean));
    return { add: (...args) => args.forEach(v => values.add(v)), remove: (...args) => args.forEach(v => values.delete(v)), contains: v => values.has(v) };
}
function element() {
    return { classList: classes(), style: {}, attrs: {}, children: [], setAttribute(k,v) { this.attrs[k] = v; }, replaceChildren(...items) { this.children = items; } };
}
test('all eight sections and homepage include shared navigation and static legal link', () => {
    for (const file of pages) {
        const html = read(file);
        assert.match(html, /src="\/navigation.js"/);
        assert.match(html, /href="\/legal\/"/);
        assert.match(html, /data-footer-navigation/);
    }
    assert.doesNotMatch(read('transparency/index.html'), /\.\.\/(unity|varis)\.html/);
});
test('public navigation omits the direct-link demo and marks only listed pages active', () => {
    for (const pathname of ['/', '/index.html', '/unity/', '/varis/index.html', '/V-Shelves/', '/v-shelves/', '/heychef/', '/resort/', '/transparency/', '/ubooks-terminal/', '/legal', '/legal/']) {
        const menu = element(), footer = element(), button = element();
        menu.classList.add('hidden');
        const doc = { createElement: element, getElementById: id => ({menu,'menu-btn':button})[id], querySelector: () => footer, addEventListener() {} };
        vm.runInNewContext(navCode, { document: doc, location: {pathname}, MutationObserver: class { observe() {} } });
        for (const container of [menu, footer]) {
            assert.equal(container.children.length, 8);
            assert.equal(container.children.filter(c => c.attrs['aria-current'] === 'page').length, pathname === '/transparency/' ? 0 : 1);
            assert.ok(container.children.every(c => c.href !== '/transparency/'));
            for (const link of container.children) assert.ok(fs.existsSync(path.join(__dirname, link.href, 'index.html')));
        }
        assert.equal(button.attrs['aria-expanded'], 'false');
    }
});
test('legal policy preserves naming clause, nine sections, accessible native accordions and form protection', () => {
    const html = read('legal/index.html');
    assert.ok(html.includes('Powell Global LLC ("we," "us," or "our") develops and publishes the mobile game Agent 76 (including all previous, current, and future releases titled Varis Sniper, Varis, and Varis Prelude, collectively referred to herein as the "App").'));
    assert.equal((html.match(/<details[ >]/g) || []).length, 9);
    assert.equal((html.match(/Plain English:/g) || []).length, 9);
    assert.match(html, /data-netlify-recaptcha="true"/);
    assert.match(html, /netlify-honeypot="bot-field"/);
    assert.match(html, /name="confirm-request"[^>]*required/);
    assert.doesNotMatch(html, /name="eea-uk-resident"[^>]*required/);
    assert.ok(fs.existsSync(path.join(__dirname, 'legal/received/index.html')));
});
function formHarness({ token = 'verified-token', ok = true, valid = true } = {}) {
    const handlers = {}, status = {}, button = {}, sections = [{open:false}];
    let fetches = 0, assigned = null, resets = 0;
    const form = { action:'/legal/received/', querySelector:() => button, reportValidity:() => valid, addEventListener:(name, fn) => { handlers[name] = fn; } };
    const document = { forms:{'privacy-request':form}, querySelectorAll:() => sections, getElementById:id => id === 'form-status' ? status : {addEventListener() {}} };
    vm.runInNewContext(formCode, { document, FormData:class { constructor() { return new Map([['g-recaptcha-response',token],['form-name','privacy-request']]); } }, URLSearchParams, AbortController, setTimeout, clearTimeout,
        fetch: async () => { fetches++; return {ok}; }, location:{assign:value => { assigned = value; }}, window:{grecaptcha:{reset:() => resets++}} });
    return {submit:() => handlers.submit({preventDefault(){}}), status, button, get fetches(){return fetches;}, get assigned(){return assigned;}, get resets(){return resets;}};
}
test('form refuses missing CAPTCHA and invalid inputs', async () => {
    for (const options of [{token:''},{valid:false}]) { const h = formHarness(options); await h.submit(); assert.equal(h.fetches,0); assert.equal(h.assigned,null); }
});
test('accepted form submission redirects only after server success', async () => {
    const h = formHarness(); await h.submit(); assert.equal(h.fetches,1); assert.equal(h.assigned,'/legal/received/');
});
test('rejected submission retains form and allows retry', async () => {
    const h = formHarness({ok:false}); await h.submit(); assert.equal(h.assigned,null); assert.equal(h.button.disabled,false); assert.equal(h.resets,1); assert.match(h.status.textContent,/could not be confirmed/);
});
test('duplicate concurrent submissions are suppressed', async () => {
    const h = formHarness(); await Promise.all([h.submit(), h.submit()]); assert.equal(h.fetches,1);
});
test('contact section uses the correct email and a separate protected message form', () => {
    const html = read('legal/index.html');
    assert.match(html, /Email: <a href="mailto:bpwll@powellincorporated.com">/);
    assert.match(html, /form name="legal-contact"[^>]*method="POST"[^>]*data-netlify="true"[^>]*netlify-honeypot="bot-field"/);
    assert.equal((html.match(/<div data-netlify-recaptcha="true"/g) || []).length, 1);
    assert.match(html, /textarea id="contact-message"[^>]*required/);
    assert.match(html, /input id="contact-email"[^>]*type="email"[^>]*required/);
    assert.ok(fs.existsSync(path.join(__dirname, 'legal/message-received/index.html')));
});
test('app-ads.txt contains exactly the supplied network records', () => {
    assert.equal(read('app-ads.txt').replace(/\r\n/g, '\n'), 'google.com, pub-5635535280522583, DIRECT, f08c47fec0942fa0\nunity3d.com, 299700dcd, DIRECT\ntapjoy.com, 299700dcd, DIRECT\n');
});
const demo = require('./transparency/demo.js');
test('settlement uses exact cent arithmetic and conserves both routing splits', () => {
    const example = demo.settlement('142.50', 200);
    assert.deepEqual(example, {legacy:428n, fee:285n, burn:190n, reserve:95n, metals:81n, operations:14n});
    for (const amount of ['0.01', '142.50', '1850.00', '12400.00', '999999999.99']) {
        for (const rate of [125, 150, 200]) {
            const s = demo.settlement(amount, rate);
            assert.equal(s.burn + s.reserve, s.fee);
            assert.equal(s.metals + s.operations, s.reserve);
        }
    }
    for (const amount of ['-1', '0', 'NaN', '1e3', '1.001', '1000000000']) assert.throws(() => demo.settlement(amount, 200));
    assert.throws(() => demo.settlement('142.50', 124));
    assert.throws(() => demo.settlement('142.50', 201));
    assert.equal(demo.money(428n), '$4.28');
});
test('epoch locks exactly at months 80 and 153 and finishes at 35 billion', () => {
    assert.equal(demo.epoch(1).supply, 70000000000n);
    assert.equal(demo.epoch(79).copperLocked, false);
    assert.equal(demo.epoch(80).copper, 5000000000n);
    assert.equal(demo.epoch(80).copperLocked, true);
    assert.equal(demo.epoch(152).goldLocked, false);
    assert.equal(demo.epoch(153).gold, 500000000n);
    assert.equal(demo.epoch(153).goldLocked, true);
    assert.equal(demo.epoch(300).supply, 35000000000n);
    for (const month of [0, 301, 1.5]) assert.throws(() => demo.epoch(month));
});
test('demo is unlisted, preserves public page structure, and removes the obsolete paper asset/link', () => {
    const html = read('transparency/index.html');
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /ethers@6\.13\.5/);
    assert.match(html, /70,000,000,000 UNT/);
    assert.doesNotMatch(read('unity/index.html'), /id="settlement-form"/);
    assert.equal((read('unity/index.html').match(/<section\b/g) || []).length, 3);
    for (const file of ['unity/index.html', 'transparency/index.html']) {
        assert.match(read(file), /White Paper.*(?:forthcoming|being updated)/);
        assert.match(read(file), /Pre-Audit Technical Specification/);
        assert.doesNotMatch(read(file), /href="[^"]*\.pdf"/);
    }
    assert.equal(fs.existsSync(path.join(__dirname, 'unity/THE UNITY PROTOCOL & VARIS OS.pdf')), false);
    for (const file of pages) assert.doesNotMatch(read(file), /href="[^"]*transparency/);
    assert.doesNotMatch(read('transparency/demo.js'), /BrowserProvider|eth_requestAccounts|sendTransaction/);
});
test('RPC verification checks chain 50, reads all fields, and fails over without a wallet', async () => {
    const closed = [], attempted = [];
    const amount = 70000000000n * 10n ** 18n;
    const lib = {
        FetchRequest: class { constructor(url) { this.url = url; } },
        JsonRpcProvider: class {
            constructor(request) { this.url = request.url; attempted.push(this.url); }
            async send(method) { assert.equal(method, 'eth_chainId'); if (this.url === 'offline') throw new Error('offline'); return this.url === 'wrong' ? '0x1' : '0x32'; }
            destroy() { closed.push(this.url); }
        },
        Contract: class {
            async name() { return 'Unity Protocol'; }
            async symbol() { return 'UNT'; }
            async decimals() { return 18n; }
            async totalSupply() { return amount; }
            async balanceOf(address) { return address.endsWith('6cda') ? amount : 0n; }
        },
        formatUnits: value => (value / 10n ** 18n).toString()
    };
    const live = await demo.liveSnapshot(lib, ['offline', 'wrong', 'live']);
    assert.equal(live.url, 'live');
    assert.equal(live.supply, '70,000,000,000 UNT');
    assert.equal(live.treasuryBalance, live.supply);
    assert.equal(live.dead, '0 UNT');
    assert.deepEqual(attempted, ['offline', 'wrong', 'live']);
    assert.deepEqual(closed, attempted);
    await assert.rejects(demo.liveSnapshot(lib, ['offline']), /RPC Syncing/);
});
