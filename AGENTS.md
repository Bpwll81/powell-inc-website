# Project workflow

- This is a static HTML site using the existing Tailwind CDN, not a framework router or npm build.
- Production is hosted on Netlify. Confirm the connected production branch and obtain approval before pushing deployment changes.
- Run `node --test verify.test.cjs` for navigation, policy, form-client and app-ads.txt checks.
- Preview from the repository root with `python -m http.server 8080`; visit `/legal/`.
- `navigation.js` is the shared header/footer route map. Preserve the on-disk `V-Shelves` capitalization.
- The privacy form uses Netlify Forms with Netlify-managed reCAPTCHA and a honeypot. Local static previews cannot render or validate the managed CAPTCHA. Verify Forms detection, notifications and a real CAPTCHA submission on a Netlify preview before claiming delivery works.
- app-ads.txt contains the owner's supplied Google, Unity and Tapjoy publisher records. Keep it raw text; Android manifest XML belongs in Unity, not this file.
- Legal wording needs owner approval. Preserve the exact multi-name App definition in the introduction.
- The owner requested removal of the old Unity White Paper PDF, with update-pending placeholders on both Unity and Transparency. Do not restore the old download or publish a replacement without the owner supplying it.
- Transparency is direct-link only: keep it out of static and shared navigation; preserve its noindex/nofollow robots metadata. This is not authentication.
- The owner approved https://xdc.public-rpc.com as the first browser RPC after actual CORS failures from rpc.xinfin.network and erpc.xinfin.network; retain those two as fallbacks. Verify chain ID 50 before displaying LIVE.
- Demo code is transparency/demo.js. Settlement and epoch outputs are simulations, separate from live token balances. No wallet connection or transaction sending is permitted.
- Tests include cent-conserving settlement arithmetic, epoch boundaries, navigation exclusion, White Paper removal, and mocked RPC failover. Browser QA verified successful live reads and forced-offline fallback without console errors.
- The owner confirmed main as the production push target. Obtain explicit authorization before future deployment pushes.
- Unity's reserve diagram uses scoped .reserve-* styles and a width-observing equal-height card adjustment in unity/index.html. Verify tile/card geometry and overflow at 1440, 1280, 768, 390, and 320px. Capture a desktop section screenshot and obtain visual approval before pushing reserve layout changes.
- Video production is separately paused in C:/Users/livin/OneDrive/Desktop/Pitch Docs. Five v4 chunks and the production state JSON are saved; final video QA and staging must not resume until requested.
