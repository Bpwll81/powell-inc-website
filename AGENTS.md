# Project workflow

- This is a static HTML site using the existing Tailwind CDN, not a framework router or npm build.
- Production is hosted on Netlify. Confirm the connected production branch and obtain approval before pushing deployment changes.
- Run `node --test verify.test.cjs` for navigation, policy, form-client and app-ads.txt checks.
- Preview from the repository root with `python -m http.server 8080`; visit `/legal/`.
- `navigation.js` is the shared header/footer route map. Preserve the on-disk `V-Shelves` capitalization.
- The privacy form uses Netlify Forms with Netlify-managed reCAPTCHA and a honeypot. Local static previews cannot render or validate the managed CAPTCHA. Verify Forms detection, notifications and a real CAPTCHA submission on a Netlify preview before claiming delivery works.
- app-ads.txt currently contains user-requested placeholder publisher IDs; real IDs must be supplied before monetization verification can succeed.
- Legal wording needs owner approval. Preserve the exact multi-name App definition in the introduction.
