(() => {
    const sections = document.querySelectorAll('#policy-sections details');
    document.getElementById('expand-all').addEventListener('click', () => sections.forEach(section => { section.open = true; }));
    document.getElementById('collapse-all').addEventListener('click', () => sections.forEach(section => { section.open = false; }));
    const form = document.forms['privacy-request'];
    const status = document.getElementById('form-status');
    const button = form.querySelector('button[type=submit]');
    let submitting = false;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submitting || !form.reportValidity()) return;
        const data = new FormData(form);
        if (!data.get('g-recaptcha-response')) {
            status.textContent = 'Please complete the CAPTCHA before submitting. If it is unavailable, reload the page or contact us through the Contact page.';
            return;
        }
        submitting = true;
        button.disabled = true;
        status.textContent = 'Submitting your request securely…';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data).toString(),
                signal: controller.signal
            });
            if (!response.ok) throw new Error('Submission rejected');
            location.assign(form.action);
        } catch (error) {
            status.textContent = error.name === 'AbortError'
                ? 'We could not confirm delivery. Please check your connection before retrying; your request may have arrived.'
                : 'Your request could not be confirmed. Your entries are still here. Please refresh the CAPTCHA and try again, or use the Contact page.';
            window.grecaptcha?.reset();
        } finally {
            clearTimeout(timeout);
            submitting = false;
            button.disabled = false;
        }
    });
})();
