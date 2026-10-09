/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type LlmLegalSlug =
  | 'terms'
  | 'privacy'
  | 'data-policy'
  | 'dpa'
  | 'refunds'

export type LlmLegalDocument = {
  title: string
  format: 'html' | 'markdown'
  content: string
}

// The four HTML bodies come from the company-provided policy documents.
// Site chrome is rendered by PublicLayout; only same-site policy URLs are normalized.
export const LLM_LEGAL_DOCUMENTS: Record<LlmLegalSlug, LlmLegalDocument> = {
  terms: {
    title: 'Terms of Service',
    format: 'html',
    content: `<p class="meta">Effective date: October 9, 2026</p>
<p class="lead">These terms govern the Fluxion inference API, which serves open-weight large language models such as GLM and Kimi (the &ldquo;Service&rdquo;). The Service is run by Fluxion AI, Inc., a Delaware corporation (&ldquo;Fluxion&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account, creating an API key or sending a request, you accept these terms for yourself or for the organisation you represent, and you confirm that you can bind it. If you have a signed order form with us, it prevails where it conflicts with these terms. Our <a href="/data-policy">Data Policy</a>, our <a href="/privacy">Privacy Policy</a> and, where it applies, our <a href="/dpa">Data Processing Addendum</a> form part of these terms.</p>
<nav class="toc" aria-label="Contents"><h2>Contents</h2><ol>
<li><a href="#what-the-service-is">1. What the Service is</a></li>
<li><a href="#your-account-and-keys">2. Your account and keys</a></li>
<li><a href="#building-on-the-service">3. Building on the Service</a></li>
<li><a href="#models-and-their-licences">4. Models and their licences</a></li>
<li><a href="#what-you-may-not-do">5. What you may not do</a></li>
<li><a href="#your-content">6. Your content</a></li>
<li><a href="#credits-and-billing">7. Credits and billing</a></li>
<li><a href="#availability-and-limits">8. Availability and limits</a></li>
<li><a href="#confidentiality">9. Confidentiality</a></li>
<li><a href="#our-rights-metadata-and-feedback">10. Our rights, metadata and feedback</a></li>
<li><a href="#suspension-and-ending-the-relationship">11. Suspension and ending the relationship</a></li>
<li><a href="#warranties">12. Warranties</a></li>
<li><a href="#indemnity">13. Indemnity</a></li>
<li><a href="#liability">14. Liability</a></li>
<li><a href="#export-controls-and-sanctions">15. Export controls and sanctions</a></li>
<li><a href="#law-and-disputes">16. Law and disputes</a></li>
<li><a href="#changes-and-general-terms">17. Changes and general terms</a></li>
<li><a href="#contact">18. Contact</a></li>
</ol></nav>
<h2 id="what-the-service-is">1. What the Service is</h2>
<p>We run open-weight language models on GPU infrastructure that we operate or obtain from infrastructure providers, and sell access to them per token through an OpenAI-compatible API, both directly and through platforms such as OpenRouter.</p>
<p>For every model we publish the numeric precision (quantisation) and the context length we serve. We will not swap in a different model or a lower precision without first updating that information. We may add models at any time, and we will give at least 14 days&rsquo; notice before retiring one, unless security, the law or a change to the model&rsquo;s licence forces us to move faster.</p>

<h2 id="your-account-and-keys">2. Your account and keys</h2>
<p>The Service is for businesses and developers, and you must be at least 18. Keep your API keys to yourself: anything done with them counts as your use of the Service and is billed to you. If you think a key has leaked, revoke it in your account and tell us at <a href="mailto:security@fluxion-sys.ai">security@fluxion-sys.ai</a>.</p>

<h2 id="building-on-the-service">3. Building on the Service</h2>
<p>You may build the Service into your own products and offer them to your users, including through a model marketplace or router. If you do, you must hold your users to rules at least as strict as section 5, you remain responsible for what they do, and you must not hand out raw Fluxion API keys or present yourself as Fluxion.</p>

<h2 id="models-and-their-licences">4. Models and their licences</h2>
<p>The models are made by third parties, for example Z.ai (GLM) and Moonshot AI (Kimi), and come with their own licences, which we link from each model&rsquo;s page. You must follow those licences, including any attribution or use restrictions. We do not own these models and make no promises about how they were trained.</p>

<h2 id="what-you-may-not-do">5. What you may not do</h2>
<p>You may not use the Service to:</p>
<ul>
<li>produce or seek sexual content involving minors, or anything that sexualises a minor;</li>
<li>materially assist violence, weapons capable of mass harm (chemical, biological, radiological or nuclear), or attacks on people or infrastructure;</li>
<li>write or deploy malware, break into systems, or attack networks or services;</li>
<li>defraud or harass people, impersonate a real person or organisation in order to deceive, or run spam campaigns;</li>
<li>infringe someone else&rsquo;s copyright, trademark, privacy or likeness rights;</li>
<li>make decisions with legal or similarly significant effects on people without the human review the law requires;</li>
<li>run systems where a failure could kill or seriously injure someone, such as medical devices, aviation or nuclear facilities, without independent safeguards;</li>
<li>break the licence or use policy of the model you are calling.</li>
</ul>
<p>Nor may you disrupt the Service, get around authentication or rate limits, probe the Service for vulnerabilities without our written permission, or reverse-engineer our software (the open-weight models themselves excepted).</p>
<p>We enforce these rules using account information, request metadata, reports and, where it is stored, request content. Serious or repeated breaches can cost you your account. Report abuse to <a href="mailto:security@fluxion-sys.ai">security@fluxion-sys.ai</a>.</p>

<h2 id="your-content">6. Your content</h2>
<p>You keep whatever rights you have in your prompts and other inputs and, as far as the law and the model&rsquo;s licence allow, you own the outputs. You give us a licence to process inputs and outputs only to run the Service for you, as the <a href="/data-policy">Data Policy</a> describes.</p>
<p><strong>We do not use your inputs or outputs to train or fine-tune any model, and we do not sell them.</strong> By default we store them for a limited period to run, troubleshoot and secure the Service and to improve our products and services; you can switch this off with zero data retention. The <a href="/data-policy">Data Policy</a> sets out both modes and our prompt caching.</p>
<p>You are responsible for having the right to send what you send. Do not send health records, payment-card data or similarly regulated data unless we have signed an agreement that covers it. Model output can be wrong, offensive, or similar to output produced for someone else; checking it before you rely on it is your job.</p>

<h2 id="credits-and-billing">7. Credits and billing</h2>
<p>Prices are in US dollars per million tokens (input, cached input and output) at the rate shown for the model when the request is sent. Tokens are counted with the model&rsquo;s own tokeniser.</p>
<p>Self-serve accounts are prepaid: you buy credits and each request spends them. A request that fails on our side before producing any output costs nothing; if a response stops part-way, you pay only for the tokens delivered. Customers we invoice pay within 30 days of the invoice date.</p>
<p>Prices exclude taxes, and you are responsible for any tax that applies to you. Our payment processor handles payments; we do not store your card details. Credits are not money, earn no interest and cannot be transferred between accounts. Unused paid credits are refundable as described in the <a href="/refunds">Refund Policy</a>, which forms part of these terms; promotional credit is not refundable and may expire. Tell us about a billing problem within 30 days of the charge. We may change prices with 14 days&rsquo; notice; prices fixed in an order form do not change.</p>

<h2 id="availability-and-limits">8. Availability and limits</h2>
<p>We aim to keep the Service up but do not promise it unless your order form includes a service level. We set rate and capacity limits and may return an error, such as HTTP 429, when they are reached.</p>

<h2 id="confidentiality">9. Confidentiality</h2>
<p>Each of us will protect the other&rsquo;s non-public information with reasonable care and use it only for this relationship. Your inputs and outputs are your confidential information. This does not cover information that is public, already known to the recipient, independently developed or lawfully received from someone else. Either of us may disclose information the law compels, telling the other first where allowed.</p>

<h2 id="our-rights-metadata-and-feedback">10. Our rights, metadata and feedback</h2>
<p>We own the Service, including our software, serving stack and documentation, but not your content or the third-party models. We may use request metadata (times, token counts, model, latency, status codes and account identifiers) to run, bill, secure and improve the Service, and we may publish aggregate statistics that identify neither you nor your content. If you send us feedback, we may use it freely.</p>

<h2 id="suspension-and-ending-the-relationship">11. Suspension and ending the relationship</h2>
<p>You can stop using the Service and close your account at any time.</p>
<p>We may suspend access straight away if your use breaks section 5, threatens the security or availability of the Service, or must stop by law, or if a payment is more than 10 days overdue after we have told you about it. We will keep a suspension as narrow and short as we reasonably can and tell you why when we can.</p>
<p>Either of us may end the relationship for a material breach that is not fixed within 30 days of notice. We may close a self-serve account, or withdraw the Service generally, with 30 days&rsquo; notice, refunding unused paid credits. Sections 6, 7 (for amounts owed), 9, 10 and 12 to 17 survive.</p>

<h2 id="warranties">12. Warranties</h2>
<p><strong>We provide the Service, the models and their output as they are and as available. To the extent the law allows, we disclaim all implied warranties, including merchantability, fitness for a particular purpose, title and non-infringement, and we do not promise that the Service will be uninterrupted or error-free or that output will be accurate.</strong></p>

<h2 id="indemnity">13. Indemnity</h2>
<p>You will defend us, our affiliates and our people against third-party claims arising from your content, or from your or your users&rsquo; use of the Service in breach of these terms or the law, and pay the resulting damages, costs and reasonable legal fees. We will tell you about the claim promptly, let you run the defence and help at your cost. You will not settle a claim that puts obligations on us without our written consent.</p>

<h2 id="liability">14. Liability</h2>
<p><strong>To the extent the law allows, neither of us is liable for indirect or consequential loss, or for lost profits, revenue or data. Except for your payment obligations, your indemnity and breaches of section 5, each party&rsquo;s total liability under these terms is limited to the fees you paid us for the Service in the twelve months before the claim, or US$100 if that is more.</strong></p>

<h2 id="export-controls-and-sanctions">15. Export controls and sanctions</h2>
<p>You will comply with US export-control and sanctions law. You confirm that you are not located in, organised in or ordinarily resident in a country or region under comprehensive US sanctions, that you are not on a US restricted-party list, and that you will not use the Service for an end use those laws prohibit.</p>

<h2 id="law-and-disputes">16. Law and disputes</h2>
<p>The law of the State of California governs these terms, without regard to its conflict-of-laws rules. The state and federal courts in Santa Clara County, California, have exclusive jurisdiction, and both of us accept it. Either of us may seek urgent injunctive relief in any competent court.</p>

<h2 id="changes-and-general-terms">17. Changes and general terms</h2>
<p>We may change these terms. We will post the new version with a new effective date and, for material changes, tell you by email or in your account at least 30 days before they apply. A change that weakens the data commitments in section 6 or the Data Policy never applies to requests made before it takes effect. Continuing to use the Service after a change takes effect is acceptance. An order form changes only by signed amendment.</p>
<p>If our documents conflict, the order of precedence is: order form, then the Data Processing Addendum (for personal data), then these terms, then documentation. Neither of us may assign these terms without the other&rsquo;s consent, except to a successor in a merger, acquisition or sale of the relevant business. Neither of us is liable for delays caused by events beyond our reasonable control. If a provision is unenforceable, the rest still applies, and not enforcing a provision is not a waiver. We may name you as a customer unless you ask us not to.</p>

<h2 id="contact">18. Contact</h2>
<p>Questions about these terms and legal notices: <a href="mailto:legal@fluxion-sys.ai">legal@fluxion-sys.ai</a>. Notices to you go to the email address on your account.</p>`,
  },
  privacy: {
    title: 'Privacy Policy',
    format: 'html',
    content: `<p class="meta">Effective date: October 9, 2026</p>
<p class="lead">This policy covers the Fluxion inference API (the &ldquo;Service&rdquo;), run by Fluxion AI, Inc. It explains what we collect about you as an account holder or website visitor, and how we treat the prompts and outputs that pass through the Service. In short: we never train on your prompts or outputs; by default we keep them for a limited period, and you can turn that off.</p>
<nav class="toc" aria-label="Contents"><h2>Contents</h2><ol>
<li><a href="#what-we-collect">What we collect</a></li>
<li><a href="#why-we-use-it">Why we use it</a></li>
<li><a href="#who-else-sees-it">Who else sees it</a></li>
<li><a href="#where-it-lives-and-for-how-long">Where it lives, and for how long</a></li>
<li><a href="#your-choices">Your choices</a></li>
<li><a href="#cookies">Cookies</a></li>
<li><a href="#security">Security</a></li>
<li><a href="#children">Children</a></li>
<li><a href="#changes">Changes</a></li>
<li><a href="#contact">Contact</a></li>
</ol></nav>
<h2 id="what-we-collect">What we collect</h2>
<p><strong>Account data.</strong> Your email address, your organisation, a display name if you set one, and your password as a salted hash (or the identifier your sign-in provider gives us).</p>
<p><strong>Usage and billing.</strong> For each request: the time, your account and key identifier, the model, token counts, latency, response status, client IP address and serving region. Also your credit balance, top-up records and the identifier our payment processor gives us. We never see or store your full card number.</p>
<p><strong>Activity logs.</strong> Account events such as sign-ins, key changes and payments, with the IP address and client used. Passwords, verification codes and API keys are redacted before anything is written down.</p>
<p><strong>Support messages.</strong> Whatever you send us when you ask for help.</p>
<p><strong>Prompts and outputs.</strong> By default we store the prompts you send and the outputs the models return for up to 30 days, to run, troubleshoot and secure the Service and to improve our products and services, and then delete them. If you switch on zero data retention, we do not store them after the request completes. We never write them to application logs and never train on them. The <a href="/data-policy">Data Policy</a> has the details.</p>

<h2 id="why-we-use-it">Why we use it</h2>
<p>To run the Service; to improve our products and services; to charge you correctly; to keep accounts secure and investigate abuse; to answer support questions; to plan capacity; and to meet legal obligations. If you are in the EEA or the UK, our legal bases are performing our contract with you, our legitimate interest in running a secure and reliable service, our legal obligations (such as keeping tax records), and your consent where we ask for it.</p>
<p>We do not sell personal data or share it for advertising, and we do not use your prompts or outputs to train models.</p>

<h2 id="who-else-sees-it">Who else sees it</h2>
<p><strong>Infrastructure providers.</strong> The models run on GPU infrastructure that we operate or obtain from data-centre, cloud and inference infrastructure providers. Our cloud provider also hosts our API gateway and account database, and holds stored prompts and outputs. These providers process this data only to provide services to us, and may not train on it or use it for their own purposes.</p>
<p><strong>Platforms.</strong> If you reach us through a platform such as OpenRouter, the platform is our customer: it holds your account and sends requests to us on your behalf, and its own privacy policy covers what it collects. We exchange billing and usage records with the platform, never request content.</p>
<p><strong>Payments and email.</strong> Our payment processor handles checkout. Our email provider delivers verification, reset and notification email.</p>
<p><strong>Legal.</strong> We disclose data when the law compels us, and we will tell you unless we are forbidden to. Under zero data retention we hold no prompts or outputs to hand over.</p>
<p><strong>Business transfers.</strong> If Fluxion is merged or acquired, account data passes to the successor under this policy.</p>

<h2 id="where-it-lives-and-for-how-long">Where it lives, and for how long</h2>
<p>Account, billing and log data are stored in the United States. Stored prompts and outputs are kept with our cloud provider. Requests are processed in the United States and in other countries where we or our infrastructure providers operate. Where personal data from the EEA or the UK is transferred, we rely on the European Commission&rsquo;s Standard Contractual Clauses, with the UK Addendum, as set out in our <a href="/dpa">Data Processing Addendum</a>.</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Data</th><th scope="col">How long we keep it</th></tr></thead>
<tbody>
<tr><td>Prompts and outputs</td><td>By default, up to 30 days, then deleted automatically. With zero data retention on, not kept once the request completes. In both modes, cached attention state, used to speed up repeated prompts, is held on our inference servers: in memory only under zero data retention, and for at most 30 days otherwise (see the <a href="/data-policy">Data Policy</a>).</td></tr>
<tr><td>Request metadata and activity logs</td><td>About thirteen months, then removed automatically.</td></tr>
<tr><td>Account data</td><td>Until you delete your account, then erased within 30 days.</td></tr>
<tr><td>Billing records</td><td>As long as tax law requires.</td></tr>
<tr><td>Support messages</td><td>Two years after the ticket closes. Any sample prompts you attach are deleted within 30 days of the ticket closing.</td></tr>
</tbody>
</table></div>

<h2 id="your-choices">Your choices</h2>
<p>You can see and change your profile, manage your API keys and delete your account from your account settings. You can switch on zero data retention as described in the <a href="/data-policy">Data Policy</a>. Deleting the account removes your account data and anonymises your remaining log entries; billing records survive as the law requires.</p>
<p>Depending on where you live you may also have the right to a copy of your data, to correction, to deletion, to object to some uses, or to complain to a regulator. Ask us at <a href="mailto:privacy@fluxion-sys.ai">privacy@fluxion-sys.ai</a> and we will help; asking will not change how we treat you. If you use the Service through a platform, ask the platform first about the data it holds.</p>

<h2 id="cookies">Cookies</h2>
<p>We use one session cookie to keep you signed in and a local store in your browser for preferences such as your theme. No advertising or tracking cookies.</p>

<h2 id="security">Security</h2>
<p>Every connection uses TLS. Staff access to production requires multi-factor authentication, is limited to people who need it, and is logged. No system is perfectly secure; report problems to <a href="mailto:security@fluxion-sys.ai">security@fluxion-sys.ai</a>.</p>

<h2 id="children">Children</h2>
<p>The Service is for businesses and developers aged 18 or over. We do not knowingly collect data from children, and we delete it when we learn of it.</p>

<h2 id="changes">Changes</h2>
<p>We will announce material changes on this page, and by email to account holders, before they take effect.</p>

<h2 id="contact">Contact</h2>
<p>Fluxion AI, Inc. &middot; <a href="mailto:privacy@fluxion-sys.ai">privacy@fluxion-sys.ai</a></p>`,
  },
  'data-policy': {
    title: 'Data Policy',
    format: 'html',
    content: `<p class="meta">Effective date: October 9, 2026</p>
<p class="lead">We never train on your prompts or outputs, and we never sell them. By default we store them for a limited period so we can run, troubleshoot and secure the Service and improve our products and services. You can turn storage off by switching on zero data retention. This page explains both modes. It applies to every request to the Fluxion inference API, including requests that reach us through platforms such as OpenRouter, and it forms part of our <a href="/terms">Terms of Service</a>.</p>
<nav class="toc" aria-label="Contents"><h2>Contents</h2><ol>
<li><a href="#at-a-glance">At a glance</a></li>
<li><a href="#how-a-request-is-handled">1. How a request is handled</a></li>
<li><a href="#storage-and-zero-data-retention">2. Storage and zero data retention</a></li>
<li><a href="#prompt-caching">3. Prompt caching</a></li>
<li><a href="#what-we-never-do">4. What we never do</a></li>
<li><a href="#what-we-log">5. What we log</a></li>
<li><a href="#support-and-legal-requests">6. Support and legal requests</a></li>
<li><a href="#who-processes-requests">7. Who processes requests</a></li>
<li><a href="#security">8. Security</a></li>
<li><a href="#changes">9. Changes</a></li>
<li><a href="#contact">10. Contact</a></li>
</ol></nav>
<h2 id="at-a-glance">At a glance</h2>
<div class="table-wrap"><table>
<tbody>
<tr><th scope="row">Do you train on prompts or outputs?</th><td>No, not for any model, ours or anyone else&rsquo;s.</td></tr>
<tr><th scope="row">Do you use my requests to improve your products?</th><td>By default, yes: stored requests may be used to improve our products and services. Never under zero data retention, and never to train models.</td></tr>
<tr><th scope="row">Do you store prompts or outputs?</th><td>By default, yes, for up to 30 days, then they are deleted automatically (section 2).</td></tr>
<tr><th scope="row">Can I turn storage off?</th><td>Yes. With zero data retention on, we do not store prompts or outputs after a request completes (section 2).</td></tr>
<tr><th scope="row">Do you cache prompts?</th><td>Yes, in both modes, as attention (KV) cache on our inference servers to speed up repeated prompts. Under zero data retention it is held in memory only and never written to disk (section 3).</td></tr>
<tr><th scope="row">What do you log?</th><td>Request metadata (section 5). Request content is never written to application logs.</td></tr>
<tr><th scope="row">Can your staff read my requests?</th><td>Only authorised staff, and only when needed for support, troubleshooting, product improvement, security or abuse investigation. Access is restricted and logged.</td></tr>
<tr><th scope="row">Do you sell or share my requests?</th><td>No. Only infrastructure providers that run requests for us handle them (section 7), and they may not train on them or use them for their own purposes.</td></tr>
</tbody>
</table></div>

<h2 id="how-a-request-is-handled">1. How a request is handled</h2>
<ol>
<li>Your request reaches our API gateway over TLS. The gateway checks your key, applies rate limits and counts tokens.</li>
<li>The gateway passes the request to an inference server, which generates the response.</li>
<li>The output streams back to you as it is generated.</li>
<li>By default, a copy of the prompt and response is kept in our request store for the period in section 2. With zero data retention on, nothing is kept apart from any prompt-cache entries (section 3) and the metadata in section 5.</li>
</ol>

<h2 id="storage-and-zero-data-retention">2. Storage and zero data retention</h2>
<p><strong>Default.</strong> We store the prompts you send and the responses the models return for up to 30 days, in access-controlled storage. We use them only to run, troubleshoot and support the Service, to keep it secure and reliable, to improve our products and services, and to investigate abuse and enforce our <a href="/terms">Terms</a>. After that period they are deleted automatically, unless we need to keep specific records longer to investigate a particular security or abuse incident, or the law requires it.</p>
<p><strong>Zero data retention.</strong> If zero data retention is on, we do not store prompts or responses after the request completes. The only content left is the in-memory prompt cache in section 3 and anything you choose to send us in a support ticket. It applies to requests made after it is switched on.</p>
<p><strong>How to switch it on.</strong> Turn it on in your account settings, or ask us at <a href="mailto:privacy@fluxion-sys.ai">privacy@fluxion-sys.ai</a>. If you reach us through a platform such as OpenRouter, the platform&rsquo;s arrangement with us decides which mode applies to your requests; check the platform&rsquo;s provider information or ask the platform.</p>

<h2 id="prompt-caching">3. Prompt caching</h2>
<p>To cut latency and cost, our inference servers keep the attention key-value (KV) cache computed for the start of a prompt, so that a later request beginning with exactly the same tokens can reuse it. This is the standard prefix caching used by open-source inference engines such as vLLM. It applies in both modes. Cache entries:</p>
<ul>
<li>are held only on our inference servers and are not copied anywhere else;</li>
<li>for requests under zero data retention, are kept in GPU or host memory only, are never written to disk, and are lost when the server restarts;</li>
<li>for other requests, may also be kept on the inference server&rsquo;s local disk, and are deleted from it within 30 days at the latest;</li>
<li>are internal model state, used only to speed up a later request that begins with exactly the same tokens;</li>
<li>may be reused across requests and accounts;</li>
<li>are evicted automatically as capacity is needed;</li>
<li>are never logged, exported, inspected or used to train any model.</li>
</ul>

<h2 id="what-we-never-do">4. What we never do</h2>
<ul>
<li>Train or fine-tune any model on your inputs or outputs.</li>
<li>Sell your inputs or outputs, or let anyone else use them for their own purposes.</li>
<li>Use your inputs or outputs for advertising or profiling.</li>
<li>Write inputs or outputs to application logs, traces or error reports. Stored content lives only in the request store described in section 2 and, as cache entries, on our inference servers (section 3).</li>
</ul>

<h2 id="what-we-log">5. What we log</h2>
<p>For each request we log the request ID, account and API-key identifier, time, model, input, cached and output token counts, latency and time to first token, response status and error type, finish reason, client IP address and serving region. We keep it for about thirteen months to bill you, plan capacity, fix faults and protect the Service. It never contains inputs, outputs or tool arguments. When you reach us through a platform such as OpenRouter, the IP address we see is the platform&rsquo;s, not yours.</p>

<h2 id="support-and-legal-requests">6. Support and legal requests</h2>
<p>If you need help with a specific request, send us its request ID; within the storage period we may be able to look it up. If you send us sample prompts in a support ticket, we use them only for that ticket and delete them within 30 days of it closing.</p>
<p>If we receive a legal demand about your account, we will tell you before responding unless the law forbids it. Content still within the storage period may be covered by such a demand. Under zero data retention we hold no stored prompts or outputs to produce. If a court or authority ordered us to start preserving content, we would do only what the order requires and tell affected customers where we are allowed to.</p>

<h2 id="who-processes-requests">7. Who processes requests</h2>
<p>We run the models on GPU infrastructure that we operate or obtain from data-centre, cloud and inference infrastructure providers, and we keep stored content with our cloud provider. Requests may be processed, and stored content kept, in the United States and in other countries where we or these providers operate.</p>
<p>Any provider that handles request content may process it only to provide services to us. It may not train on it, sell it or use it for its own purposes.</p>
<p>We also use a payment processor and an email provider. They never receive request content, apart from any samples you send us in a support ticket.</p>
<p>A list of the providers that handle request content is available on request from <a href="mailto:privacy@fluxion-sys.ai">privacy@fluxion-sys.ai</a>.</p>

<h2 id="security">8. Security</h2>
<p>Every connection to the API uses TLS. Stored request content is kept separate from logs, access to it is restricted to authorised staff and logged, and it is deleted on schedule. Staff access to production requires multi-factor authentication, is limited to people who need it, and is logged.</p>

<h2 id="changes">9. Changes</h2>
<p>We will give at least 30 days&rsquo; notice, on this page and by email, before any change that weakens these commitments. Such a change never applies to requests made before it takes effect.</p>

<h2 id="contact">10. Contact</h2>
<p>Data questions and zero data retention: <a href="mailto:privacy@fluxion-sys.ai">privacy@fluxion-sys.ai</a>. Security issues: <a href="mailto:security@fluxion-sys.ai">security@fluxion-sys.ai</a>.</p>`,
  },
  dpa: {
    title: 'Data Processing Addendum',
    format: 'html',
    content: `<p class="meta">Fluxion AI, Inc. &middot; Effective date: October 9, 2026</p>
<p class="lead">This Data Processing Addendum (&ldquo;DPA&rdquo;) forms part of the agreement governing the use of the services (&ldquo;Agreement&rdquo;) between Fluxion AI, Inc. (&ldquo;Fluxion&rdquo;) and the customer identified in the Agreement (&ldquo;Customer&rdquo;). This DPA applies to the extent Fluxion processes Personal Data on behalf of Customer in connection with Fluxion&rsquo;s language-model inference API (the &ldquo;Services&rdquo;).</p>
<nav class="toc" aria-label="Contents"><h2>Contents</h2><ol>
<li><a href="#definitions">1. Definitions</a></li>
<li><a href="#roles-and-scope">2. Roles and Scope</a></li>
<li><a href="#retention-of-customer-content">3. Retention of Customer Content</a></li>
<li><a href="#no-model-training">4. No Model Training</a></li>
<li><a href="#ccpa-restrictions">5. CCPA Restrictions</a></li>
<li><a href="#confidentiality">6. Confidentiality</a></li>
<li><a href="#security">7. Security</a></li>
<li><a href="#security-incidents">8. Security Incidents</a></li>
<li><a href="#subprocessors">9. Subprocessors</a></li>
<li><a href="#data-subject-requests">10. Data Subject Requests</a></li>
<li><a href="#data-protection-assessments-and-cooperation">11. Data Protection Assessments and Cooperation</a></li>
<li><a href="#audits-and-compliance-information">12. Audits and Compliance Information</a></li>
<li><a href="#return-and-deletion">13. Return and Deletion</a></li>
<li><a href="#international-transfers">14. International Transfers</a></li>
<li><a href="#details-of-processing">15. Details of Processing</a></li>
<li><a href="#customer-responsibilities">16. Customer Responsibilities</a></li>
<li><a href="#order-of-precedence">17. Order of Precedence</a></li>
<li><a href="#execution">18. Execution</a></li>
</ol></nav>
<h2 id="definitions">1. Definitions</h2>
<p>&ldquo;Applicable Data Protection Law&rdquo; means applicable laws governing processing, privacy, and protection of Personal Data, including, where applicable, the CCPA and GDPR.</p>
<p>&ldquo;Customer Content&rdquo; means prompts, text, images, video, audio, files, datasets, model inputs, model outputs, and other content submitted to or generated through the Services by or on behalf of Customer or its End Users.</p>
<p>&ldquo;Customer Personal Data&rdquo; means Personal Data contained in Customer Content and processed by Fluxion on behalf of Customer.</p>
<p>&ldquo;Personal Data,&rdquo; &ldquo;Controller,&rdquo; &ldquo;Processor,&rdquo; &ldquo;Data Subject,&rdquo; and &ldquo;Processing&rdquo; have the meanings assigned under Applicable Data Protection Law.</p>
<p>&ldquo;Subprocessor&rdquo; means a third party engaged by Fluxion to process Customer Personal Data on behalf of Customer.</p>

<h2 id="roles-and-scope">2. Roles and Scope</h2>
<p>As between the parties, Customer is the Controller or business, as applicable, and Fluxion is the Processor or service provider/contractor. Fluxion will process Customer Personal Data solely to provide the Services requested by Customer, in accordance with Customer&rsquo;s documented instructions and the Agreement, or as required by applicable law.</p>

<h2 id="retention-of-customer-content">3. Retention of Customer Content</h2>
<p><strong>Default.</strong> Fluxion stores Customer Content for up to 30 days following the applicable API request, solely to operate, troubleshoot, support, and secure the Services, to improve Fluxion&rsquo;s products and services, and to investigate abuse, and then deletes it, except where longer retention of specific Customer Content is reasonably necessary to investigate a particular security incident or abuse, or is required by law.</p>
<p><strong>Zero data retention.</strong> Where Customer has enabled zero data retention, Fluxion will not retain Customer Content following completion of the applicable API request.</p>
<p>Customer Content may be processed transiently in memory, network buffers, caches, accelerators, or other temporary infrastructure solely as technically necessary to receive, process, and return the requested API response. Fluxion will not intentionally persist Customer Content in application logs, or in storage other than as described in this Section. Temporary technical copies will be automatically deleted or overwritten in the ordinary operation of Fluxion&rsquo;s systems. Cached attention (key-value) state may be held on Fluxion&rsquo;s inference servers to accelerate later requests that begin with the same tokens. Where zero data retention is enabled, that state is held only in volatile memory and is never written to persistent storage. Otherwise, it may also be held on the inference servers&rsquo; local storage for no longer than the retention period in this Section. It is not logged, exported, or used for any other purpose.</p>
<p>If Customer elects to use a Service feature that expressly requires persistent storage, separate retention terms may apply solely to that feature.</p>

<h2 id="no-model-training">4. No Model Training</h2>
<p>Fluxion will not use, and will not permit any Subprocessor to use, Customer Content or Customer Personal Data to train, retrain, fine-tune, distill, or otherwise modify any artificial intelligence or machine-learning model. Where zero data retention is not enabled, Customer authorizes Fluxion to use Customer Content stored under Section 3, during that retention period, to improve Fluxion&rsquo;s products and services, but never to train, retrain, fine-tune, or distill any model. Fluxion will not use Customer Content processed under zero data retention for this purpose.</p>
<p>Fluxion will not use Customer Content or Customer Personal Data for advertising, profiling, data brokerage, or any purpose independent of providing the Services to Customer, except as permitted in this Section. No provision of the Agreement or this DPA grants Fluxion ownership of Customer Content.</p>

<h2 id="ccpa-restrictions">5. CCPA Restrictions</h2>
<p>To the extent the CCPA applies, Fluxion will act as a service provider or contractor with respect to Customer Personal Data. Fluxion will not sell or share Customer Personal Data; retain, use, or disclose it for purposes other than the limited and specified business purposes of providing, securing, supporting, improving, and maintaining the Services except as permitted by law; use it outside the direct business relationship except as permitted by law; or combine it with other personal information except as permitted by Applicable Data Protection Law.</p>

<h2 id="confidentiality">6. Confidentiality</h2>
<p>Fluxion will ensure that personnel authorized to process Customer Personal Data are subject to appropriate confidentiality obligations and that access is limited to personnel who require access to perform their responsibilities.</p>

<h2 id="security">7. Security</h2>
<p>Fluxion will implement and maintain appropriate technical and organizational measures designed to protect Customer Personal Data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access, including as appropriate encryption in transit, access controls and authentication, logical separation, security monitoring, vulnerability management, and incident-response procedures.</p>

<h2 id="security-incidents">8. Security Incidents</h2>
<p>Fluxion will notify Customer without undue delay after becoming aware of a confirmed breach of security resulting in accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Customer Personal Data (&ldquo;Security Incident&rdquo;). Fluxion will provide reasonably available information and reasonably cooperate with Customer regarding applicable notification obligations.</p>

<h2 id="subprocessors">9. Subprocessors</h2>
<p>Customer generally authorizes Fluxion to engage Subprocessors, including providers of data-centre, cloud, and inference infrastructure. Fluxion will impose appropriate contractual data-protection obligations on Subprocessors and remains responsible for their performance of those obligations. Fluxion will not engage a Subprocessor to process Customer Content if that Subprocessor uses Customer Content to train or improve its models or for its own purposes.</p>
<p>Fluxion will make a list of its Subprocessors that process Customer Content available to Customer on request. Fluxion will provide reasonable advance notice before engaging a new Subprocessor that processes Customer Content, by email, and Customer may object on reasonable data-protection grounds. If the parties cannot resolve an objection in good faith, Customer may stop using the affected Services.</p>

<h2 id="data-subject-requests">10. Data Subject Requests</h2>
<p>Taking into account the nature of processing, Fluxion will provide reasonable assistance to Customer in responding to Data Subject requests. Where Customer Content is not retained, including under zero data retention or after the retention period in Section 3, Fluxion may be unable to retrieve, access, correct, export, or delete Customer Personal Data.</p>

<h2 id="data-protection-assessments-and-cooperation">11. Data Protection Assessments and Cooperation</h2>
<p>Taking into account the nature of processing and information available to Fluxion, Fluxion will provide reasonable assistance with data protection impact assessments and consultations with supervisory authorities where required by Applicable Data Protection Law.</p>

<h2 id="audits-and-compliance-information">12. Audits and Compliance Information</h2>
<p>Upon reasonable written request, Fluxion will provide information reasonably necessary to demonstrate compliance with this DPA. Where required by Applicable Data Protection Law, Fluxion will permit reasonable audits or inspections subject to reasonable confidentiality, security, scope, frequency, and cost restrictions.</p>

<h2 id="return-and-deletion">13. Return and Deletion</h2>
<p>Upon termination or expiration of the Services, Fluxion will delete Customer Personal Data remaining in its possession or control unless applicable law requires retention. Stored Customer Content is otherwise deleted in accordance with Section 3. This Section does not require deletion of account, billing, transaction, or security records that do not contain Customer Content and that Fluxion is independently permitted or required to retain.</p>

<h2 id="international-transfers">14. International Transfers</h2>
<p>Where Customer Personal Data is subject to the GDPR or another law requiring a transfer mechanism, the parties will implement an applicable lawful transfer mechanism, including, where appropriate, the European Commission&rsquo;s Standard Contractual Clauses and, for transfers from the United Kingdom, the UK International Data Transfer Addendum.</p>

<h2 id="details-of-processing">15. Details of Processing</h2>
<div class="table-wrap"><table>
<tbody>
<tr><th scope="row">Subject Matter</th><td>Provision of Fluxion&rsquo;s language-model inference API.</td></tr>
<tr><th scope="row">Duration</th><td>For the duration of Customer&rsquo;s use of the Services; Customer Content is retained only as described in Section 3.</td></tr>
<tr><th scope="row">Nature and Purpose</th><td>Receiving Customer Content, performing Customer-requested inference using language models, and returning resulting output.</td></tr>
<tr><th scope="row">Categories of Data Subjects</th><td>Customer personnel, Customer&rsquo;s customers, End Users, and other individuals represented in Customer Content.</td></tr>
<tr><th scope="row">Categories of Personal Data</th><td>Any Personal Data Customer or its End Users elect to include in Customer Content, including identifiers, text, communications, and other submitted information.</td></tr>
<tr><th scope="row">Sensitive Data</th><td>Customer is responsible for determining whether use involving sensitive or special-category Personal Data is lawful and appropriate.</td></tr>
<tr><th scope="row">Processing Operations</th><td>Receipt, transmission, processing, time-limited storage, inference, transformation, generation, and return of results.</td></tr>
</tbody>
</table></div>

<h2 id="customer-responsibilities">16. Customer Responsibilities</h2>
<p>Customer is responsible for having all rights, notices, consents, and lawful bases necessary to submit Customer Personal Data; providing legally sufficient privacy notices; configuring and using the Services in compliance with Applicable Data Protection Law; and determining whether the Services are appropriate for Customer&rsquo;s processing activities.</p>

<h2 id="order-of-precedence">17. Order of Precedence</h2>
<p>If this DPA conflicts with the Agreement concerning processing or protection of Customer Personal Data, this DPA will control with respect to that conflict. Except as modified by this DPA, the Agreement remains in full force and effect.</p>

<h2 id="execution">18. Execution</h2>
<p>This DPA is incorporated into and forms part of the Agreement. Where applicable, execution of the Agreement constitutes execution of this DPA.</p>`,
  },
  refunds: {
    title: 'Refund Policy',
    format: 'markdown',
    content: `_Effective date: 2026-10-09._

## 1. Prepaid credits

Fluxion's LLM API is prepaid. You buy credits and spend them on requests at the applicable model's published rates. Paid credits are a service balance, not a subscription, and do not expire. Promotional credits may expire according to their disclosed terms, are not refundable, and have no cash value.

## 2. Unused paid credits

Request a refund within 30 days of a top-up and we will refund the unused portion of that payment, excluding any amount already spent. Refunds go back to the original payment method through our payment processor.

Write to [billing@fluxion-sys.ai](mailto:billing@fluxion-sys.ai) from the email address on your account and identify the payment. After a refund is processed, it usually appears within five to ten business days; the payment processor and your financial institution determine the final timing.

## 3. Failed or interrupted requests

A request that fails on our side before producing any output costs nothing. If a response stops part-way, you pay only for the tokens delivered, as stated in our [Terms of Service](/terms).

A temporary balance reservation is not a final charge. Tell us about a billing problem within 30 days of the charge by writing to [billing@fluxion-sys.ai](mailto:billing@fluxion-sys.ai). Include the request identifier, approximate time, model, and relevant charge. Do not send passwords or API keys.

We will review the available request and billing records and correct confirmed billing errors, including unjustified deductions or unreconciled reservations. Usage corrections are returned to your service balance unless a payment refund is applicable.

## 4. Outputs that do not meet expectations

Language models can produce different, inaccurate, incomplete, or unsuitable answers. Disliking an output, or deciding it is not useful, does not by itself entitle you to a refund of correctly billed usage. This does not prevent review of a technical service failure or incorrect charge under section 3, or limit rights that applicable law does not permit us to exclude.

## 5. Unauthorized payments

If you see a Fluxion payment you did not authorize, contact [billing@fluxion-sys.ai](mailto:billing@fluxion-sys.ai) promptly. We will investigate, refund confirmed unauthorized payments, and help secure the account. Contacting us first may help resolve the issue before a chargeback; a payment dispute may require account restrictions while it is investigated. This does not remove any rights you have through your payment provider or applicable law.

## 6. Account closure and contact

You can stop using the Service and close your account at any time. If you choose to close your account, request any eligible refund under section 2 before closing it; closure does not automatically refund the balance.

If we close a self-serve account or withdraw the Service generally on 30 days' notice under section 11 of our [Terms of Service](/terms), we will refund unused paid credits. The 30-day top-up refund request window in section 2 does not limit this refund.

Promotional credits are not refundable.

Questions and refund requests: [billing@fluxion-sys.ai](mailto:billing@fluxion-sys.ai).
`,
  },
}
