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
test('all header/footer routes exist, normalize aliases and mark exactly one active page', () => {
    for (const pathname of ['/', '/index.html', '/unity/', '/varis/index.html', '/V-Shelves/', '/v-shelves/', '/heychef/', '/resort/', '/transparency/', '/ubooks-terminal/', '/legal', '/legal/']) {
        const menu = element(), footer = element(), button = element();
        menu.classList.add('hidden');
        const doc = { createElement: element, getElementById: id => ({menu,'menu-btn':button})[id], querySelector: () => footer, addEventListener() {} };
        vm.runInNewContext(navCode, { document: doc, location: {pathname}, MutationObserver: class { observe() {} } });
        for (const container of [menu, footer]) {
            assert.equal(container.children.length, 9);
            assert.equal(container.children.filter(c => c.attrs['aria-current'] === 'page').length, 1);
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
    assert.match(html, /form name="legal-contact"[^>]*method="POST"[^>]*data-netlify="true"[^>]*netlify-honeypot="bot-field"[^>]*data-netlify-recaptcha="true"/);
    assert.match(html, /textarea id="contact-message"[^>]*required/);
    assert.match(html, /input id="contact-email"[^>]*type="email"[^>]*required/);
    assert.ok(fs.existsSync(path.join(__dirname, 'legal/message-received/index.html')));
});
test('app-ads.txt contains exactly the supplied raw placeholder records', () => {
    assert.equal(read('app-ads.txt').replace(/\r\n/g, '\n'), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\nunity3d.com, 1234567, DIRECT\ntapjoy.com, 1234567, DIRECT\n');
});
