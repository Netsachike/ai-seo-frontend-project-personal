import { PRODUCT } from "@/config/product";

/**
 * Legal documents. The English text is the binding version, so it lives here
 * as content rather than in the translated UI messages; the page chrome
 * around it (navigation, "Last updated") is translated as usual.
 *
 * The Privacy Policy and Terms follow the section structure of RankYak's
 * published documents (the reference app for this product), rewritten for
 * what Rankoya actually does: AI visibility tracking across ChatGPT, Claude,
 * Gemini, Perplexity and AI Overviews, an agent that drafts and publishes
 * after approval, Telegram approvals, Paddle billing, White Label resale,
 * and the Google API Services Limited Use statement that Google's OAuth
 * review requires. Governed by the law of England and Wales.
 * Have legal review these documents before launch.
 */
export type LegalBlock = { type: "p"; text: string } | { type: "ul"; items: string[] } | { type: "h3"; text: string };
export type LegalSection = { heading?: string; blocks: LegalBlock[] };
export type LegalDocument = {
  slug: "privacy-policy" | "terms-of-service" | "refund-policy";
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const { name, company, address, jurisdiction, appUrl, marketingUrl, supportEmail } = PRODUCT;
const p = (text: string): LegalBlock => ({ type: "p", text });
const ul = (...items: string[]): LegalBlock => ({ type: "ul", items });
const h3 = (text: string): LegalBlock => ({ type: "h3", text });

const EFFECTIVE = "2026-10-13";
const EFFECTIVE_LONG = "13 October 2026";

export const privacyPolicy: LegalDocument = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  description: `How ${name} collects, uses, shares and keeps personal information.`,
  lastUpdated: EFFECTIVE,
  sections: [
    {
      blocks: [
        p(
          `This policy describes how ${company}, trading as ${name} ("${name}", "we", "us" or "our"), collects, uses, shares and keeps personal information across ${marketingUrl}, the ${name} application at ${appUrl}, the ${name} Telegram bot, and the connections you make to ${name} from other software. ${company} is the controller of the personal information described in this policy, except where Section 7 says otherwise.`,
        ),
        p(
          "It is written to comply with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, the EU General Data Protection Regulation (GDPR) and other applicable data protection laws.",
        ),
        p(`This policy is effective as of ${EFFECTIVE_LONG} and was last updated on ${EFFECTIVE_LONG}.`),
      ],
    },
    {
      heading: "1. Information We Collect",
      blocks: [
        p(
          "We collect information you provide to us, information the service produces while it works for you, and information your devices send while you use the service.",
        ),
        h3("1.1. Log Data"),
        p(
          "When you visit our website or use the application, our servers log the standard data your browser or client provides: your IP address, browser type and version, the pages you visit, the time and date of each request, and technical details of any errors. We use this data for troubleshooting, security and improving the service.",
        ),
        h3("1.2. Personal Information"),
        p("We ask for the following personal information:"),
        ul(
          "Name",
          "Email address",
          "Profile photo, if you add one",
          "Website URL(s) and the business details of each brand you add",
          "The names, email addresses and roles of team members you invite to a workspace",
          "Payment information, processed by our payment provider Paddle (see Section 8). We do not receive or store your full card details.",
          "Website access credentials for the platforms you connect to Rankoya (see Section 9)",
          "Your Telegram username and chat identifier, if you connect Telegram",
        ),
        p(
          `You sign in with your email address and a password, confirmed by a code we email you, or with your Google account. We store passwords only as salted hashes, never in readable form.`,
        ),
        h3("1.3. User Content"),
        p(
          `As part of using the service, you provide content such as your website's address, a description of your business and audience, your languages and core topics, the competitors, keywords and questions you track, edits and feedback on drafts, your approval decisions, and any instructions you type into the application or send on Telegram ("User Content"). We process User Content to measure your visibility, plan an action plan, draft articles and on-page fixes, and publish them to your website. See our Terms of Service for how User Content and Generated Content are handled.`,
        ),
        h3("1.4. Content Read From Your Website, Search Console and Analytics"),
        p(
          `To do its work, ${name} reads the public pages of the website you add. When you connect Google Search Console, we read the queries, clicks, impressions and positions Google reports for the property you choose. When you connect Google Analytics, we read sessions and conversions for the property you choose. Access to Google data is read-only. We keep the pages and rows we read so that the site audit, rankings and reports can compare them over time.`,
        ),
        h3("1.5. Visibility Data"),
        p(
          `To show where your brand appears, ${name} asks AI assistants and search engines (ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews and Google Search) the questions and keywords you track, and stores the answers, the brands and sources they mention, and your position in them. This data describes public answers about your brand and your competitors. It is not personal information about you, but it is linked to your workspace.`,
        ),
        h3("1.6. Agent Conversations"),
        p(
          `"Ask ${name}" is the chat assistant inside the application, and the same conversation continues on Telegram if you connect it. We store each conversation, including your messages, the assistant's replies, the approval cards it showed you, your decisions on them and the actions it took, so that you may return to it and so that the assistant may recall earlier work when you refer to it. Do not paste passwords or other credentials into a conversation; connect platforms from the Integrations page instead.`,
        ),
        h3("1.7. Cookies and Similar Technologies"),
        p(
          "We use cookies and similar technologies (such as your browser's local storage) to operate the service. A cookie is a small piece of data our website stores on your device.",
        ),
        p("We use the following types of cookies:"),
        ul(
          "Essential cookies: necessary for the operation of the website and the application, such as keeping you signed in.",
          "Functionality cookies: remember the choices you make, such as your language, time zone, theme, and the workspace and brand you last opened. On a White Label domain, the domain's branding is also kept in local storage so that pages load in the right colours.",
        ),
        p("The following third-party services may set cookies when you use the parts of the service they provide:"),
        ul(
          "Paddle: checkout and subscription management, including fraud prevention. (https://www.paddle.com/legal/privacy)",
          "Google: signing in with your Google account and connecting Google Search Console or Google Analytics. (https://policies.google.com/privacy)",
        ),
        p(
          "We do not currently use advertising cookies or third-party analytics cookies. If we add them, we will update this section first and ask for your consent where the law requires it.",
        ),
        p(
          "You may control or disable cookies through your browser settings. However, disabling essential cookies prevents you from signing in.",
        ),
      ],
    },
    {
      heading: "2. Legal Bases for Processing (UK GDPR and GDPR)",
      blocks: [
        p(
          "If you are located in the United Kingdom or the European Economic Area (EEA), we rely on the following legal bases to process your personal information:",
        ),
        ul(
          "Contractual necessity: processing is necessary to perform the contract you enter into with us (our Terms of Service), or to take steps at your request before entering into it, such as creating an account.",
          "Legitimate interests: we process personal information to improve the service, to market it to existing customers, and to prevent fraud and abuse, where those interests are not overridden by your rights and freedoms.",
          "Consent: in some cases we rely on your consent, for example for marketing emails, for connecting Telegram, or for connecting a Google account. You may withdraw consent at any time.",
          "Legal obligation: we keep certain records, such as invoices, because the law requires it.",
        ),
      ],
    },
    {
      heading: "3. How We Use Information",
      blocks: [
        p("We collect, hold, use and disclose information for the following purposes:"),
        ul(
          "To provide the service: measuring your visibility in AI answers and search, tracking rankings and competitors, auditing your website, building your action plan, drafting articles and on-page fixes, and publishing them to the platform you connect.",
          "To ask for your approval in the application and on Telegram, and to carry out the autopilot mode you choose (see Section 6).",
          "To process payments, plan changes, credits and add-ons for your subscription.",
          "To contact you about your account, your workspaces, your brands and support requests.",
          "To send you emails and Telegram messages about drafts that are ready, approvals that are waiting, and periodic reports, which you may turn off.",
          "For analytics and product development, including to operate and improve the website and the application.",
          "For marketing, including information about our products, which you may opt out of at any time.",
          "For internal record keeping and administrative purposes.",
          "To comply with our legal obligations and resolve disputes.",
          "For security and fraud prevention, and to make sure the service is used in line with our Terms of Service.",
        ),
      ],
    },
    {
      heading: "4. AI Processing",
      blocks: [
        p(`${name} uses AI models operated by third-party providers in two ways.`),
        p(
          "Measuring visibility: we send the questions and keywords you track to the AI assistants we measure, and receive their answers back. These requests describe your brand, products and topics; they do not include your account details. The providers are:",
        ),
        ul(
          "OpenAI, for ChatGPT (https://openai.com/policies/privacy-policy)",
          "Anthropic, for Claude (https://www.anthropic.com/privacy)",
          "Google, for Gemini and AI Overviews (https://policies.google.com/privacy)",
          "Perplexity (https://www.perplexity.ai/hub/legal/privacy-policy)",
        ),
        p(
          "Doing the work: the agent's research, drafting and on-page fixes are performed by large language models. To do this, we send the relevant User Content, pages read from your website, Search Console and Analytics rows, and the draft in question to one or more of OpenAI, Anthropic and Google, and receive the generated text or image back.",
        ),
        p(
          "We use these providers under their business terms, which do not permit them to train their models on the content we send.",
        ),
        p(
          `${name} does not train its own models on your User Content, your Generated Content or your Google user data.`,
        ),
      ],
    },
    {
      heading: "5. Google API Services",
      blocks: [
        p(
          `${name}'s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.`,
        ),
        p(
          "In particular, we use Google user data only to provide and improve the features you see in the application, we do not sell it, we do not use it for advertising, and we do not use it to develop, improve or train generalised AI or machine learning models. People at Rankoya do not read it unless you ask us to for support, it is needed for security, or the law requires it.",
        ),
      ],
    },
    {
      heading: "6. Telegram and Autopilot",
      blocks: [
        p(
          "You may connect Telegram to approve work and talk to the agent away from your desk. This section applies when you do.",
        ),
        ul(
          `Connecting: you connect Telegram yourself, by scanning a code or opening a link from the Integrations page and pressing Start in the chat with the ${name} bot. Nothing is connected without that step. You may disconnect at any time in the application or by stopping the bot in Telegram.`,
          `What Telegram receives: the messages ${name} sends you, such as summaries, drafts and approval requests, and the replies you send, are carried by Telegram under its own privacy policy (https://telegram.org/privacy). ${name} does not control what Telegram keeps.`,
          "What we record: we record each approval, edit and rejection, with who made it, when, and from where (the application or Telegram), so that every change to your website can be traced and undone.",
        ),
        p(
          `Autopilot: by default (Ask me first), nothing ${name} drafts reaches your live website until you approve it. If a workspace owner or admin chooses Auto-publish content or Full autopilot, ${name} publishes the work that mode covers without asking each time. We record which mode was on when each change was made.`,
        ),
      ],
    },
    {
      heading: "7. Workspaces, Agencies and White Label",
      blocks: [
        ul(
          "Workspaces: members of a workspace see each other's name, email address and role (Owner, Admin, Member or Viewer), and can see the workspace's brands according to their role.",
          "Agencies: an agency that manages a client's brand in its workspace can see that brand's data, and is responsible for having the client's permission to do so.",
          `White Label: a reseller may offer ${name} to its own customers under its own name, logo and domain. For those customers, the reseller decides why and how their personal information is used, and ${company} processes it on the reseller's behalf, under our agreement with the reseller. The reseller's own privacy policy applies to that relationship, and requests about it should go to the reseller first. The reseller can see the accounts, brands and usage of the customers it serves.`,
        ),
      ],
    },
    {
      heading: "8. Disclosure of Personal Information to Third Parties",
      blocks: [
        p("We disclose personal information to the following categories of recipients:"),
        ul(
          "Paddle, our payment provider and Merchant of Record. Paddle sells the subscription to you on our behalf and handles payment, invoicing, tax and refunds; it receives your name, email address, billing address and payment details, and processes them under its own privacy policy as an independent controller.",
          "Hosting, database, storage and content delivery providers, including the provider that serves White Label custom domains.",
          "AI model providers (OpenAI, Anthropic, Google and Perplexity), as described in Section 4.",
          "Keyword, ranking and search data providers, which receive the keywords and website addresses we research.",
          "Web crawling providers, which receive the addresses of the pages we read.",
          "Google, when you sign in with Google or connect Search Console or Analytics, which we read on your behalf.",
          "Telegram, when you connect it (Section 6).",
          "Email delivery and customer messaging providers, which receive your email address and the emails we send you.",
          "Error monitoring providers.",
        ),
        ul(
          "The platforms you connect: the content management system or website platform you connect (such as WordPress) receives the articles, images and on-page changes we publish there.",
          "Other members of your workspace, agencies and White Label resellers, as described in Section 7.",
          "Affiliates: a parent, subsidiary or affiliate of our company.",
          "A buyer or successor, if our business is sold or merged, under the same protections as this policy.",
          "Legal authorities: courts, regulators and law enforcement, as required by law or to establish, exercise or defend our legal rights.",
        ),
        p(
          "We do not sell your personal information. Our service providers are bound by contracts that require them to protect personal information in accordance with applicable data protection law and to use it only to provide their service to us.",
        ),
      ],
    },
    {
      heading: "9. Website Access Credentials",
      blocks: [
        p(
          `To publish content to your website, you connect the content management system or website platform you use. Depending on the platform, this means giving ${name} an application password, an API key, or an OAuth authorisation granted on the platform's own sign-in page.`,
        ),
        ul(
          "Security: credentials and OAuth tokens are stored encrypted, and are used only to publish and update the content and on-page changes you approve (or that your autopilot mode covers), and to read the lists the platform offers (such as categories or authors) so that you may choose where articles go.",
          "Your responsibility: you are responsible for the security of the credentials you provide and for actions taken on your platform through them. Use a credential with the smallest permissions the platform allows.",
          `Revoking access: disconnecting the integration in ${name} deletes the stored credential or token. You may also revoke access on the platform's side by changing the credential or removing ${name} from the platform's connected applications. The same applies to Google Search Console and Google Analytics: disconnecting them in ${name} deletes the stored tokens, and you may revoke ${name} from your Google account at any time at https://myaccount.google.com/permissions.`,
        ),
      ],
    },
    {
      heading: "10. International Data Transfers",
      blocks: [
        p(
          "The personal information we collect may be stored and processed in countries other than your country of residence, including the United States, where several of the providers named above operate. Those countries may have data protection laws that differ from the laws of your country.",
        ),
        p(
          "For transfers out of the United Kingdom or the EEA, we rely on appropriate safeguards, such as the UK International Data Transfer Agreement or Addendum, Standard Contractual Clauses approved by the European Commission, the UK Extension to the EU-US Data Privacy Framework or the EU-US Data Privacy Framework where the recipient is certified, or other legally recognised mechanisms.",
        ),
      ],
    },
    {
      heading: "11. Data Security",
      blocks: [
        p(
          "We implement commercially reasonable measures to protect personal information from loss, theft, unauthorised access, disclosure, copying, use or modification, including:",
        ),
        ul(
          "Encryption of data in transit and at rest.",
          "Access controls that restrict access to personal information, including role-based access within workspaces.",
          "Regular security assessments and updates.",
        ),
        p(
          "However, no method of electronic transmission or storage is completely secure, so we cannot guarantee absolute security. We will comply with the laws applicable to us in the event of a data breach, including notifying the regulator and you where required.",
        ),
      ],
    },
    {
      heading: "12. Your Rights",
      blocks: [
        p("If you are located in the United Kingdom or the EEA, you have the following rights:"),
        ul(
          "Right of access: to request a copy of the personal information we hold about you.",
          "Right to rectification: to request that we correct inaccurate or incomplete personal information.",
          "Right to erasure: to request that we delete your personal information, subject to exceptions such as a legal obligation to retain it.",
          "Right to restrict processing: to request that we restrict processing in certain circumstances.",
          "Right to data portability: to receive your personal information in a structured, commonly used, machine-readable format.",
          "Right to object: to object to processing based on legitimate interests and to processing for direct marketing.",
          "Right to withdraw consent: where processing is based on consent, to withdraw it at any time.",
        ),
        p(
          `You may also have similar rights under other data protection laws. You may update your profile in the application, and you may exercise any of these rights, including deleting your account, by contacting us at ${supportEmail}. We respond within one month. If you use ${name} through a White Label reseller, contact the reseller first (Section 7).`,
        ),
      ],
    },
    {
      heading: "13. How Long We Keep Your Personal Information",
      blocks: [
        p(
          "We keep personal information only for as long as we need it to provide the service, for legitimate business purposes, or as required by law. In particular:",
        ),
        ul(
          "An account that never verifies its email address is deleted automatically.",
          "When you delete your account, or a workspace or brand is deleted, its records are removed from the application within 7 days and erased from our systems and backups within 90 days, except where we must keep a record to comply with a legal obligation such as tax law.",
          "Google Search Console and Analytics data is kept while the connection is active, and for no longer than 30 days after access expires or is revoked.",
          "Visibility data, agent conversations and the record of approvals are kept while the workspace exists, so that you can see trends and trace every change.",
          "Pages read from your website that the service no longer needs are deleted after 90 days.",
          "Log data is kept for a limited period for troubleshooting and security.",
        ),
      ],
    },
    {
      heading: "14. Children's Privacy",
      blocks: [
        p(
          "The service is not directed at children under 16, and we do not knowingly collect personal information from them. If you believe we have collected personal information from a child under 16, please contact us and we will delete it.",
        ),
      ],
    },
    {
      heading: "15. Complaints",
      blocks: [
        p(
          "If you believe we have breached a data protection law and wish to complain, please contact us using the details below with the details of the alleged breach. We will investigate and respond in writing with the outcome and the steps we will take.",
        ),
        p(
          "You also have the right to complain to a data protection authority: in the United Kingdom, the Information Commissioner's Office (https://ico.org.uk/make-a-complaint/), or in the EEA, the authority in the country where you live or work.",
        ),
      ],
    },
    {
      heading: "16. Changes to This Policy",
      blocks: [
        p(
          "We may change this policy to reflect changes to the service, to our providers or to the law. If we make significant changes, we will notify you by a notice in the application or by email before they take effect. Your continued use of the service after a change means you accept the updated policy.",
        ),
      ],
    },
    {
      heading: "17. Contact Us",
      blocks: [
        p("For questions about your privacy, or to exercise your rights, contact us at:"),
        p(`${company} (${name}) · ${address} · ${supportEmail}`),
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  slug: "terms-of-service",
  title: "Terms of Service",
  description: `Terms and conditions for ${name}.`,
  lastUpdated: EFFECTIVE,
  sections: [
    {
      blocks: [
        p(
          `${company}, trading as ${name} ("${name}", "we", "us" or "our"), agrees to furnish services to the Subscriber (the "Subscriber", "you" or "your"), subject to the following Terms of Service. Use of ${name}'s service constitutes acceptance and agreement to these Terms of Service.`,
        ),
        p(
          `The Terms of Service ("Terms") govern your use of the ${name} website at ${marketingUrl} and the application at ${appUrl} (together, the "Site"), the ${name} Telegram bot, ${name}'s visibility tracking, content and on-page optimisation services, and any content generated by ${name}'s services for you based on your User Content (defined below) ("Generated Content"). To make these Terms easier to read, the Site, our services and the Generated Content are collectively called the "Services."`,
        ),
        p(
          "The Services are provided for business purposes. If you use them as a consumer, nothing in these Terms affects the rights you have under the law of your country that cannot be excluded.",
        ),
      ],
    },
    {
      heading: "Use of Services",
      blocks: [
        p(
          `You may use our Services, provided that you are of legal age to form a binding contract and are not barred from receiving such services under the laws of ${jurisdiction} or other jurisdictions. In order to access our Services, you are required to provide current and factual identification, contact and other information as part of the registration process. You are responsible for the confidentiality of your account information and for all activities that occur under your account. You are solely responsible for all content within your account. You agree to immediately notify ${name} of any unauthorised use of your account or any other breach of security. ${name} will not be liable for any loss or damage as a result of your failure to provide us with accurate information or to keep your account secure.`,
        ),
      ],
    },
    {
      heading: "Workspaces and Team Members",
      blocks: [
        p(
          "Your account can own or belong to one or more workspaces. A workspace holds brands, team members, billing and credits. The workspace owner is responsible for the workspace's subscription and for the people it invites.",
        ),
        ul(
          "Roles: Owners and Admins manage members, billing, integrations and autopilot settings; Members do the work; Viewers can see but not change anything.",
          "You are responsible for the actions of everyone you invite, and for removing access when someone should no longer have it.",
          "If you manage brands for clients, you confirm you have their permission to connect their websites and accounts and to publish on their behalf.",
        ),
      ],
    },
    {
      heading: "Acceptable Conduct",
      blocks: [
        p(
          `You are responsible for the actions of all users of your account and any data that is created, stored, displayed by, or transmitted by your account while using ${name}. You will not engage in any activity that interferes with or disrupts ${name}'s Services or networks connected to ${name}.`,
        ),
      ],
    },
    {
      heading: "Prohibited Usage",
      blocks: [
        p(
          `You agree that any of the below activities are considered prohibited usage and may result in immediate account suspension or cancellation without a refund, and that ${name} may pursue the remedies available to it by law.`,
        ),
        ul(
          `Exploiting Services connected to ${name}: intentional misuse of services or networks connected to ${name}, including but not limited to attempting to alter the way ${name}'s software works, or generating content that is not allowed under the usage policies of the AI providers ${name} relies on: Anthropic (https://www.anthropic.com/legal/aup), OpenAI (https://openai.com/policies/usage-policies/) and Google (https://policies.google.com/terms/generative-ai/use-policy).`,
          `Manipulating search engines or AI assistants: using ${name} to create spam, doorway pages, scaled low-value content or other material that knowingly violates search engine spam policies, or to flood AI assistants with automated queries outside the tracking ${name} performs for you.`,
          `Activities viewed as illegal or harmful: engaging in illegal activities or activities harmful to the operations of ${name} or ${name}'s customers.`,
          "Providing false data on any contract or application, including fraudulent use of credit card numbers.",
        ),
      ],
    },
    {
      heading: "Your Content",
      blocks: [
        p(
          `Posting Content. Our Services allow you to store or share content such as text, website details, keywords, questions, competitors, documents, images and instructions to the agent. Anything (other than Feedback) that you post or otherwise make available through the Services is referred to as "User Content."`,
        ),
        p(
          `Permissions to Your User Content. By making any User Content available through the Services you grant to ${name}, its licensors and their affiliates a non-exclusive, transferable, worldwide, royalty-free licence, with the right to sublicense to the service providers named in our Privacy Policy, to use, host, store, copy, communicate, modify, create derivative works based upon, distribute, publish and publicly display your User Content, for as long as needed to provide, operate, secure and improve the Services.`,
        ),
        p(
          `Your Responsibility for User Content. You are solely responsible for all your User Content. You represent and warrant that you have (and will have) all rights that are necessary to grant us the licence rights in your User Content under these Terms. You represent and warrant that neither your User Content, nor your use and provision of your User Content to be made available through the Services, nor any use of your User Content by ${name} on or through the Services will infringe, misappropriate or violate a third party's intellectual property rights, or rights of publicity or privacy, or result in the violation of any applicable law or regulation.`,
        ),
        p(
          "Removal of User Content. You can remove your User Content by specifically deleting it. In certain instances, some of your User Content may not be completely removed and copies of it may continue to exist on the Services for the periods set out in our Privacy Policy. To the maximum extent permitted by law, we are not responsible or liable for the removal or deletion of (or the failure to remove or delete) any of your User Content.",
        ),
        p(
          `Your Use of Generated Content. Subject to your compliance with these Terms and payment of the fees that apply, ${name} assigns to you whatever rights it has in the Generated Content created for your workspace, and you may use, copy, modify, sell, create derivative works based upon, distribute, publicly display and publicly perform it for your lawful business purposes. AI-generated content may not be protected by copyright in every country, and similar content may be generated for other users.`,
        ),
        p(
          `Ownership of Intellectual Property. ${name} and its licensors (as applicable) retain all rights, title and interest in and to the Services, including all underlying technology, software, design and intellectual property. ${name} does not use your User Content or your Generated Content to train AI models.`,
        ),
      ],
    },
    {
      heading: "Content Moderation Policy",
      blocks: [
        p(
          `${name} is committed to maintaining a safe and respectful online environment. While we do not pre-screen User Content or Generated Content before publication, we have a strict Content Moderation Policy.`,
        ),
        p(
          `Prohibited Sites and Content: you are strictly prohibited from using ${name} to create, store or publish sites or content that:`,
        ),
        ul(
          "Is illegal, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libellous, invasive of another's privacy, hateful, or racially, ethnically or otherwise objectionable.",
          "Incites violence, promotes discrimination, or advocates hatred against any individual or group.",
          "Contains sexually explicit material, pornography, or exploits, abuses or endangers children.",
          "Infringes any patent, trademark, trade secret, copyright or other proprietary rights of any party.",
          "Contains software viruses or any other computer code, files or programs designed to interrupt, destroy or limit the functionality of any computer software or hardware or telecommunications equipment.",
          `Constitutes unsolicited or unauthorised advertising, promotional materials, "junk mail," "spam," "chain letters," "pyramid schemes," or any other form of solicitation.`,
          "Impersonates any person or entity, or falsely states or otherwise misrepresents your affiliation with a person or entity.",
          "Violates any applicable local, national or international law.",
          "Spreads false or misleading information (misinformation or disinformation).",
          "Promotes or facilitates any illegal activity.",
          "Contains personally identifiable information (PII) of others without their express consent.",
        ),
        p(
          `Review and Removal of Sites: ${name} reserves the right, but has no obligation, to review the type of site you set up using the Services. If we determine, in our sole discretion, that a site violates this Content Moderation Policy, we may immediately suspend or terminate your account and remove the site from ${name}, without prior notice.`,
        ),
        p(
          "Account Suspension and Termination: repeated or egregious violations of this policy will result in account suspension or termination.",
        ),
        p(
          `User Reporting: while we do not actively monitor all content, we encourage users to report any suspected violations of this policy to ${supportEmail}.`,
        ),
      ],
    },
    {
      heading: "Approvals and Autopilot",
      blocks: [
        p(
          `${name} drafts articles and on-page changes; you decide what reaches your website. Each workspace chooses an autopilot mode:`,
        ),
        ul(
          "Ask me first (the default): nothing is published until someone with permission approves it, in the application or on Telegram.",
          `Auto-publish content: ${name} publishes new articles without asking, and still asks before changing existing pages.`,
          `Full autopilot: ${name} publishes articles and on-page changes without asking.`,
        ),
        p(
          `By choosing Auto-publish content or Full autopilot, you authorise ${name} to publish the work that mode covers on your behalf, and you remain responsible for it as if you had approved each item. You can change the mode, and undo published changes where the platform allows, at any time.`,
        ),
      ],
    },
    {
      heading: "Invoicing and Payment",
      blocks: [
        p(
          "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.",
        ),
        p(
          `You agree that ${name}, through Paddle, shall be permitted to charge you on a monthly, annual or other agreed basis in advance of providing services. Fees for your plan renew automatically at the end of each billing period until you cancel. Payment is due upon invoicing. Service may be interrupted on accounts that reach 10 days past due. Accounts that are not collectable may be turned over to an outside collection agency.`,
        ),
        ul(
          "Upgrades: if you upgrade your plan, you are charged a pro-rated amount straight away and the full new rate from your next billing cycle.",
          "Downgrades: if you downgrade your plan, the new rate applies from your next billing cycle.",
          "Credits and add-ons: credits and add-ons are used up as described in the application, and expire as shown there.",
          "White Label licences: one-time White Label licences are charged once and cover the number of reseller seats shown at purchase.",
        ),
        p(
          `Subscriber is aware that ${name} may prospectively change the rates and charges from time to time, with notice as described under Changes to Service and Pricing.`,
        ),
        p(
          `${name} is not responsible for any additional bank fees, interest charges, finance charges, overdraft charges or other fees resulting from charges billed by ${name} or Paddle. Currency exchange settlements will be based on agreements between you and your financial institution or payment provider. Refunds are governed by our Refund Policy (${appUrl}refund-policy).`,
        ),
      ],
    },
    {
      heading: "White Label and Reseller Terms",
      blocks: [
        p(`If you resell ${name} under your own brand, these additional terms apply:`),
        ul(
          `You are responsible for your customers, for the terms and privacy policy you give them, and for their compliance with these Terms. You must pass on obligations at least as protective as these Terms.`,
          `For your customers' personal information, you are the controller and ${company} is your processor, as described in our Privacy Policy.`,
          `You must own or control the domains you connect, and must not use a name, logo or domain that infringes another party's rights or suggests that you are ${name}.`,
          "You must stay within the number of seats your licence allows.",
          `${name} may suspend a White Label domain or a reseller's customer account that breaches these Terms, and will tell the reseller where the law allows.`,
        ),
      ],
    },
    {
      heading: "Explicit Content Disclaimer and User Responsibility",
      blocks: [
        p(
          `${name} uses automated processes to generate content and on-page changes. While we strive for accuracy and quality, we do not review, edit or endorse Generated Content before it is shown to you or published to your website. You are solely responsible for reviewing, editing and approving all content published to your website via ${name}, including content published under an autopilot mode you chose. We make no warranties regarding the accuracy, completeness, truthfulness, originality, non-infringement or legality of any Generated Content. You acknowledge that Generated Content may contain errors, inaccuracies or opinions that you do not agree with, and that it may violate third-party rights or applicable laws. You use and publish Generated Content at your sole risk.`,
        ),
        p(
          `You agree to review and edit all Generated Content before it is published to your website. You understand that failure to do so may result in the publication of content that is inaccurate, inappropriate or violates the rights of others. ${name} is not responsible for any consequences arising from your failure to review Generated Content.`,
        ),
        p(
          `${name} does not provide any legal advice. The content that is generated and published should not be used for any legal decisions.`,
        ),
        p(
          `${name} does not warrant that use of the Generated Content will not infringe the rights of any third party. It is your sole responsibility to investigate and ensure that use of the Generated Content does not infringe any third-party intellectual property or other rights.`,
        ),
        p(
          `Visibility measurements, rankings, scores and recommendations reflect the answers AI assistants and search engines gave when we checked. Those answers vary between people, places and times, and change without notice. ${name} does not guarantee any ranking, mention, traffic or business result.`,
        ),
        p(
          `${name} is not affiliated with, endorsed by or sponsored by Google, OpenAI, Anthropic, Perplexity, Telegram, or any of the content management systems or website platforms the Services support (such as WordPress, Shopify, Webflow, Wix and Ghost). Their names and logos are trademarks of their owners and are used only to identify the integration. We are not responsible for any issues arising from your use of these platforms, including but not limited to platform outages, security breaches or changes to their terms of service.`,
        ),
        p(
          `The Services use artificial intelligence (AI) to generate content. AI technology is constantly evolving, and while we strive for accuracy, the Generated Content may contain errors, inaccuracies or unexpected results. ${name} is not responsible for any such errors or inaccuracies.`,
        ),
      ],
    },
    {
      heading: "Warranty Disclaimer",
      blocks: [
        p(
          "We have no special relationship with or fiduciary duty to you. You acknowledge that we have no duty to take any action regarding: which Subscribers gain access to the Services; what Content you access via the Services; or how you may interpret or use the Content.",
        ),
        p(
          "You release us from all liability for you having acquired or not acquired Content through the Services. We make no representations concerning any Content contained in or accessed through the Services, and we will not be responsible or liable for the accuracy, copyright compliance or legality of material or Content contained in or accessed through the Services.",
        ),
        p(
          `TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES AND CONTENT ARE PROVIDED "AS IS", "AS AVAILABLE" AND WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, SATISFACTORY QUALITY, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE, AND ANY WARRANTIES IMPLIED BY ANY COURSE OF PERFORMANCE OR USAGE OF TRADE, ALL OF WHICH ARE EXPRESSLY DISCLAIMED. WE, AND OUR DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, PARTNERS AND CONTENT PROVIDERS DO NOT WARRANT THAT: (I) THE SERVICES WILL BE SECURE OR AVAILABLE AT ANY PARTICULAR TIME OR LOCATION; (II) ANY DEFECTS OR ERRORS WILL BE CORRECTED; (III) ANY CONTENT OR SOFTWARE AVAILABLE AT OR THROUGH THE SERVICES IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; OR (IV) THE RESULTS OF USING THE SERVICES WILL MEET YOUR REQUIREMENTS. YOUR USE OF THE SERVICES IS SOLELY AT YOUR OWN RISK.`,
        ),
      ],
    },
    {
      heading: "Limitation of Liability",
      blocks: [
        p(
          `NOTHING IN THESE TERMS LIMITS OR EXCLUDES LIABILITY FOR DEATH OR PERSONAL INJURY CAUSED BY NEGLIGENCE, FOR FRAUD OR FRAUDULENT MISREPRESENTATION, OR FOR ANY OTHER LIABILITY THAT CANNOT BE LIMITED OR EXCLUDED BY LAW.`,
        ),
        p(
          `SUBJECT TO THE PARAGRAPH ABOVE, IN NO EVENT SHALL WE, NOR OUR DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS OR CONTENT PROVIDERS, BE LIABLE UNDER CONTRACT, TORT, STRICT LIABILITY, NEGLIGENCE OR ANY OTHER LEGAL OR EQUITABLE THEORY WITH RESPECT TO THE SERVICES (I) FOR ANY LOST PROFITS, LOST REVENUE, LOST RANKINGS OR TRAFFIC, DATA LOSS, DATA THEFT, COST OF PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, OR SPECIAL, INDIRECT, INCIDENTAL, PUNITIVE OR CONSEQUENTIAL DAMAGES OF ANY KIND WHATSOEVER, (II) FOR ANY BUGS, VIRUSES, TROJAN HORSES OR THE LIKE (REGARDLESS OF THE SOURCE OF ORIGINATION), OR (III) FOR ANY DIRECT DAMAGES IN EXCESS OF (IN THE AGGREGATE) THE FEES PAID TO US FOR THE PARTICULAR SERVICES DURING THE IMMEDIATELY PREVIOUS ONE MONTH PERIOD, EVEN IF ${name.toUpperCase()} HAD BEEN ADVISED OF, KNEW OR SHOULD HAVE KNOWN OF THE POSSIBILITY THEREOF. SUBSCRIBER ACKNOWLEDGES THAT THE FEES PAID REFLECT THE ALLOCATION OF RISK SET FORTH IN THESE TERMS AND THAT ${name.toUpperCase()} WOULD NOT ENTER INTO THIS AGREEMENT WITHOUT THESE LIMITATIONS.`,
        ),
      ],
    },
    {
      heading: "Indemnity",
      blocks: [
        p(
          `You agree to indemnify and hold harmless ${company}, its officers, directors, employees, agents and licensors from and against any and all claims, liabilities, damages, losses, costs, expenses or fees (including reasonable legal fees) arising out of or relating to (a) your use of the Services; (b) your User Content; (c) any Generated Content published to your website, whether approved by you or published under an autopilot mode you chose; (d) your violation of these Terms; (e) your violation of any rights of any other person or entity; (f) your violation of any applicable laws or regulations; or (g) if you are a reseller, claims by your customers.`,
        ),
      ],
    },
    {
      heading: "API Usage",
      blocks: [
        p(
          `If ${name} provides an Application Programming Interface (API) for accessing the Services, your use of the API is subject to these Terms and any additional API documentation provided by ${name}. Your use of the API must be reasonable and not place an excessive burden on our servers. We reserve the right to limit or restrict your API access at any time, for any reason, including but not limited to excessive usage or violation of these Terms.`,
        ),
      ],
    },
    {
      heading: "Changes to Service and Pricing",
      blocks: [
        p(
          `${name} reserves the right to modify or discontinue, temporarily or permanently, the Services (or any part thereof). We may also change our pricing for the Services. We will give at least 30 days' notice of a price increase to an existing subscription, which takes effect from your next billing period, and reasonable notice of any other significant change.`,
        ),
      ],
    },
    {
      heading: "Termination",
      blocks: [
        p(
          `For Cause: we may terminate your account immediately, without notice, for any violation of these Terms, including but not limited to violation of our Content Moderation Policy, non-payment, providing false or misleading information, or any activity that we deem harmful to ${name} or other users.`,
        ),
        p(
          "Without Cause: we may also terminate your account at any time, for any reason, with thirty (30) days' prior written notice.",
        ),
        p(
          "By You: you may cancel your subscription at any time in your account settings. Cancellation stops future billing, and you keep access until the end of the period you have paid for.",
        ),
        p(
          "Effect of Termination: upon termination of your account, your right to use the Services will immediately cease. You may ask us for an export of your data before termination takes effect. We are not responsible for any loss of data or content that may occur as a result of account termination. Sections regarding Your Content, Content Disclaimer, Warranty Disclaimer, Limitation of Liability, Indemnity, Governing Law and Choice of Forum shall survive termination.",
        ),
      ],
    },
    {
      heading: "Notice",
      blocks: [
        p(
          `You agree that ${name} may provide you with notices, including those regarding changes to the Terms of Service, by email, in the application, or by postings on the Site.`,
        ),
      ],
    },
    {
      heading: "Entire Agreement",
      blocks: [
        p(
          `The Terms of Service, together with our Privacy Policy and Refund Policy (including any policies, guidelines or amendments that may be presented to you from time to time), constitute the entire agreement between you and ${name} and govern your use of ${name}'s Services, superseding any prior agreements between you and ${name} for the use of ${name}'s Services.`,
        ),
      ],
    },
    {
      heading: "Choice of Law and Forum",
      blocks: [
        p(
          `The Terms of Service and the relationship between you and ${name} shall be governed by the laws of ${jurisdiction} without regard to its conflict of law provisions. You and ${name} agree to submit to the exclusive jurisdiction of the courts of ${jurisdiction}. If you are a consumer living elsewhere in the United Kingdom or in the EEA, you may also bring proceedings in the courts of the country where you live.`,
        ),
      ],
    },
    {
      heading: "Waiver and Severability of Terms",
      blocks: [
        p(
          `The failure of ${name} to exercise or enforce any right or provision of the Terms of Service shall not constitute a waiver of such right or provision. If any provision of the Terms of Service is found by a court of competent jurisdiction to be invalid, the parties nevertheless agree that the court should endeavour to give effect to the parties' intentions as reflected in the provision, and the other provisions of the Terms of Service remain in full force and effect.`,
        ),
      ],
    },
    {
      heading: "Statute of Limitations",
      blocks: [
        p(
          `To the extent permitted by law, you agree that any claim or cause of action arising out of or related to use of ${name}'s Services or the Terms of Service must be filed within one (1) year after such claim or cause of action arose or be forever barred.`,
        ),
      ],
    },
    {
      heading: "Copyright Infringement",
      blocks: [
        p(
          `${name} respects the intellectual property rights of others. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible through the Services, please notify us at ${supportEmail}. Your notice should include:`,
        ),
        ul(
          "A description of the copyrighted work that you claim has been infringed.",
          "A description of where the allegedly infringing material is located on the Services.",
          "Your contact information (name, address, telephone number and email address).",
          "A statement by you that you have a good faith belief that the disputed use is not authorised by the copyright owner, its agent or the law.",
          "A statement by you that the above information in your notice is accurate and that you are the copyright owner or authorised to act on the copyright owner's behalf.",
          "An electronic or physical signature.",
        ),
        p(
          "We will respond to notices of alleged copyright infringement in accordance with applicable law. We reserve the right to remove or disable access to any material claimed to be infringing and to terminate the accounts of repeat infringers.",
        ),
      ],
    },
    {
      heading: "Updates to the Terms",
      blocks: [
        p(
          `We may update these Terms from time to time. We will notify you of any material changes by email or in the application, posting the new Terms on the Site and updating the "Last updated" date. You are advised to review these Terms periodically for any changes. Your continued use of the Services after the revised Terms take effect constitutes your acceptance of such changes.`,
        ),
      ],
    },
    {
      heading: "Content Generation Guidelines and Third-Party Platform Policies",
      blocks: [
        p(
          `${name} is designed to help you create content for your website and improve how search engines and AI assistants see it. While we do not directly control how you use the Generated Content, many online platforms, including search engines, AI assistants, website platforms and advertising networks, have their own content policies and technical requirements, which may change from time to time.`,
        ),
        p(
          `You are solely responsible for ensuring that any content you publish, including content generated by ${name}, complies with the terms of service and content policies of any platform where you choose to publish or promote that content.`,
        ),
        p(
          `${name} may restrict, disable, modify or remove features or integrations where necessary to comply with third-party platform requirements or applicable law.`,
        ),
      ],
    },
    {
      heading: "Contact Us",
      blocks: [
        p(`For questions about these Terms, contact us at ${supportEmail}.`),
        p(`${company} (${name}) · ${address}`),
      ],
    },
  ],
};

export const refundPolicy: LegalDocument = {
  slug: "refund-policy",
  title: "Refund Policy",
  description: `Refund policy for ${name} subscriptions.`,
  lastUpdated: "2026-10-07",
  sections: [
    {
      blocks: [
        p(
          `By accessing or using ${name}, you agree to these terms. Please read them carefully before subscribing. If you do not agree with these terms, please do not use our services.`,
        ),
        p(
          "Before you subscribe or make any payment, please take a moment to read and understand this Refund Policy. It outlines your rights, responsibilities and options regarding subscription payments and cancellations.",
        ),
      ],
    },
    {
      heading: "1. Refund Policy",
      blocks: [
        p(
          "Customers are entitled to request a refund within 14 days of initial purchase, in accordance with our payment processor's refund policy.",
        ),
        p(
          `No refunds after the initial period: outside of the 14-day initial purchase window, once a subscription payment has been successfully processed, ${name} does not offer refunds. This includes but is not limited to:`,
        ),
        ul(
          "Forgetting to cancel your subscription before renewal.",
          "No longer needing or using the service.",
          "Changes to your marketing plans or priorities.",
          "Unsatisfactory experience after payment.",
          "Duplicate subscriptions purchased by the user.",
        ),
        p(
          `All payments made to ${name} outside the initial 14-day window are final, non-refundable, and non-transferable.`,
        ),
        p(
          `By subscribing to ${name}, you acknowledge and accept that all processed payments are binding and non-refundable.`,
        ),
      ],
    },
    {
      heading: "2. Managing Your Subscription and Avoiding Future Billing",
      blocks: [
        p(
          "You may cancel your subscription at any time through your account settings to prevent future renewal charges.",
        ),
        p("Cancellation stops future billing only."),
        ul(
          "To avoid being charged for the next billing cycle, you must cancel your subscription before your next renewal date.",
          "After cancelling, you will continue to have access to your subscription benefits until the end of your current paid period, but no further charges will be made.",
          "It is the user's sole responsibility to manage and monitor their subscription status and billing cycles.",
        ),
        p(`${name} is not responsible for subscription charges resulting from failure to cancel before renewal.`),
      ],
    },
    {
      heading: "3. Billing Questions and Payment Support",
      blocks: [
        p(
          "If you believe there is an unauthorised or incorrect charge on your account, contact our support team immediately so we can investigate the transaction details with you.",
        ),
        p(
          "In rare cases where a technical billing error has occurred (such as duplicate charges caused by a system issue), you may be eligible for a refund review:",
        ),
        ul(
          "You were charged multiple times for the same subscription within the same billing cycle.",
          `A billing error caused by ${name}'s system.`,
        ),
        p(
          `If you believe a technical billing error has occurred, contact us within 7 days of the charge at ${supportEmail}. Each request will be reviewed individually, and approved refunds (if any) will be issued to your original payment method.`,
        ),
        p(`For billing questions, contact us at ${supportEmail}.`),
      ],
    },
    {
      heading: "4. Policy Agreement",
      blocks: [
        p(
          `By purchasing or subscribing to ${name}, you acknowledge and agree to abide by this Refund Policy. This policy is binding once a payment is processed.`,
        ),
        p(
          `We strongly encourage you to consider your purchase carefully and ensure that ${name} meets your needs before subscribing.`,
        ),
      ],
    },
    {
      heading: "Summary",
      blocks: [
        ul(
          "Refunds are available within 14 days of initial purchase.",
          "No refunds for renewals or after the initial 14-day period.",
          "You can cancel anytime to avoid future billing.",
          `${name} is not responsible for late cancellations.`,
          `Only technical billing errors caused by ${name}'s system are eligible for special review.`,
          `For help, contact us at ${supportEmail}.`,
        ),
        p(`${company} · ${address}`),
        p(`${name} is a fully automated SaaS platform. We do not provide human-driven or manually delivered services.`),
      ],
    },
  ],
};
