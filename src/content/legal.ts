import { PRODUCT } from "@/config/product";

/**
 * Legal documents. The English text is the binding version, so it lives here
 * as content rather than in the translated UI messages; the page chrome
 * around it (navigation, "Last updated") is translated as usual.
 *
 * Carried over from the shared Netsach documents with Orbit's facts: product
 * name and URLs from config/product.ts, the integrations Orbit actually uses
 * (Google Search Console and Analytics, WordPress, Telegram), and the Google
 * API Services Limited Use statement that Google's OAuth review requires.
 * Have legal review the refund windows and payment terms before launch.
 */
export type LegalBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };
export type LegalSection = { heading?: string; blocks: LegalBlock[] };
export type LegalDocument = {
  slug: "privacy-policy" | "terms-of-service" | "refund-policy";
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const { name, company, appUrl, supportEmail } = PRODUCT;
const p = (text: string): LegalBlock => ({ type: "p", text });
const ul = (...items: string[]): LegalBlock => ({ type: "ul", items });

export const privacyPolicy: LegalDocument = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  description: `How ${name} collects, uses and protects your data.`,
  lastUpdated: "2026-10-07",
  sections: [
    {
      heading: "Consent to Privacy Policy",
      blocks: [
        p(
          `By using ${name}'s services, you agree to the collection and use of information as described in this Privacy Policy. You must agree to this Privacy Policy before accessing our services.`,
        ),
        p(
          `${name} is operated by ${company} and provides search and AI visibility tracking, content and on-page optimisation services at ${appUrl}.`,
        ),
      ],
    },
    {
      heading: "Information Collection and Use",
      blocks: [
        p(
          "For a better experience, we may require certain personally identifiable information, including but not limited to your name and email. This information will be used to contact or identify you.",
        ),
        p("We collect:"),
        ul(
          "Your name and email address.",
          "The websites, brands, competitors, keywords and questions you add to track.",
          "If you connect Google Search Console or Google Analytics: read-only access tokens, the list of properties you can access, and the search and traffic data of the properties you choose.",
          "If you connect WordPress: your site address, username and an application password, stored encrypted, used to publish content and on-page changes you approve.",
          "If you connect Telegram: your Telegram username and chat identifier, used to send you updates and receive your approvals.",
          "Answers that AI assistants and search engines give to the questions you track, collected so we can measure your visibility.",
        ),
        p(
          `We use Google API Services to read data from Google Search Console and Google Analytics. By using our service, you agree that we access and use your Google data in accordance with this policy.`,
        ),
      ],
    },
    {
      heading: "How We Use Your Data",
      blocks: [
        ul(
          "Measure where your brand appears in search results and AI answers, and compare it with your competitors.",
          "Draft articles and on-page fixes for your approval, and publish them to your site after you approve.",
          "Send you updates and approval requests in the app and on Telegram.",
          "Improve and optimise our services.",
          "Communicate with you about our services.",
        ),
      ],
    },
    {
      heading: "Data Sharing and Disclosure",
      blocks: [
        p(
          "We do not transfer or disclose your information to third parties for purposes other than the ones provided in this policy. We do not sell your personal information or Google user data. We do not use Google user data for serving advertisements or any purpose other than providing our core services.",
        ),
        p(
          "To draft content and analyse answers, we send the minimum necessary text (for example your brand details, tracked questions and draft articles) to AI model providers acting on our behalf. Google user data is never sent to AI model providers for training.",
        ),
        p(
          "Some of your data may be stored on cloud infrastructure providers solely for the purpose of operating our service. These providers act as data processors and do not have access to use your data for their own purposes.",
        ),
        p(
          `${name} employees or contractors may access your data when necessary for debugging or problem-solving purposes. Such access is limited to what is required to resolve the issue.`,
        ),
        p("We may disclose your information only when required by law, such as to comply with a subpoena or similar legal process."),
      ],
    },
    {
      heading: "Google API Services User Data Policy",
      blocks: [
        p(
          `${name}'s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.`,
        ),
      ],
    },
    {
      heading: "Data Retention and Storage",
      blocks: [
        ul(
          `Authorized data: we only store and process data you have authorised (connected properties, search and traffic data, and access tokens). It is kept for as long as you are an active client of ${name}, but for no longer than 30 calendar days without refreshed authorisation. We delete it if you revoke access to your Google, WordPress or Telegram account.`,
          "Visibility data: answers collected from AI assistants and search engines are kept for as long as your account is active, so you can see trends over time.",
        ),
        p(
          `User-initiated data deletion: you can request deletion of your stored data at any time by contacting us at ${supportEmail}. We will delete your data as soon as possible and within 7 calendar days. This only affects data stored by ${name}, not data held by Google or other platforms.`,
        ),
        p(
          "Account deletion: if you delete your account, we also delete all user data we have stored for it as soon as possible and within 7 calendar days.",
        ),
        p(
          "We store your data securely on encrypted cloud servers in the United States, using industry-standard security measures including strict access controls, encryption at rest and internal security audits.",
        ),
      ],
    },
    {
      heading: "User Rights and Data Control",
      blocks: [
        ul(
          "Access your personal data.",
          "Request correction of inaccurate data.",
          "Request deletion of your data.",
          "Revoke access to your Google, WordPress or Telegram account.",
        ),
        p(
          `To exercise these rights, contact us at ${supportEmail}. To revoke ${name}'s access to your Google data, visit https://security.google.com/settings/security/permissions.`,
        ),
      ],
    },
    {
      heading: "Log Data",
      blocks: [
        p(
          "Whenever you visit our Service, we collect information that your browser sends to us that is called Log Data. This Log Data may include information such as your computer's Internet Protocol (IP) address, browser version, pages of our Service that you visit, the time and date of your visit, the time spent on those pages, and other statistics.",
        ),
      ],
    },
    {
      heading: "Service Providers",
      blocks: [
        p(
          "We may employ third-party companies and individuals to facilitate our Service, perform Service-related services, or assist in analysing Service usage. These third parties have access to your Personal Information to perform tasks on our behalf but are obligated not to disclose or use it for other purposes.",
        ),
      ],
    },
    {
      heading: "Security",
      blocks: [
        p(
          "We strive to protect your Personal Information using commercially acceptable means. However, no method of internet transmission or electronic storage is 100% secure and reliable.",
        ),
      ],
    },
    {
      heading: "Links to Other Sites",
      blocks: [
        p(
          "Our Service may contain links to external sites not operated by us. We advise reviewing their Privacy Policies and assume no responsibility for their content or practices.",
        ),
      ],
    },
    {
      heading: "Children's Privacy",
      blocks: [
        p(
          "Our Services do not address anyone under 13. We do not knowingly collect personal information from children under 13. If we discover such collection, we will delete it immediately. Parents aware of their child providing us personal information should contact us.",
        ),
      ],
    },
    {
      heading: "Changes to This Privacy Policy",
      blocks: [
        p(
          "We may update our Privacy Policy periodically. We advise reviewing this page for changes. Changes are effective immediately upon posting.",
        ),
      ],
    },
    {
      heading: "Contact Us",
      blocks: [p(`For questions, suggestions, or complaints about our privacy practices, contact us at ${supportEmail}.`)],
    },
  ],
};

export const termsOfService: LegalDocument = {
  slug: "terms-of-service",
  title: "Terms of Service",
  description: `Terms and conditions for ${name}.`,
  lastUpdated: "2026-10-07",
  sections: [
    {
      blocks: [
        p(
          `These terms and conditions outline the rules and regulations for the use of ${name}'s website. ${name} is operated by ${company} and is available at ${appUrl}.`,
        ),
        p(
          `By accessing this website we assume you accept these terms and conditions in full. Do not continue to use ${name}'s website if you do not accept all of the terms and conditions stated on this page.`,
        ),
        p(
          `The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and any or all Agreements: "Client", "You" and "Your" refers to you, the person accessing this website and accepting the Company's terms and conditions. "The Company", "Ourselves", "We", "Our" and "Us" refers to our Company. "Party", "Parties", or "Us" refers to both the Client and ourselves, or either the Client or ourselves. Any use of the above terminology or other words in the singular, plural, capitalisation and/or he/she or they, are taken as interchangeable and therefore as referring to same.`,
        ),
      ],
    },
    {
      heading: "General",
      blocks: [
        ul(
          `${name} drafts content and site changes; you decide what is published. You are responsible for the content you approve and publish.`,
          `Content and recommendations generated by ${name} may contain errors. Review them before approving.`,
          "Visibility measurements reflect the answers AI assistants and search engines gave when we checked, which can change at any time.",
        ),
      ],
    },
    {
      heading: "Third-Party Platform Compliance",
      blocks: [
        p(
          `${name} provides integrations with third-party platforms (such as Google Search Console, Google Analytics, WordPress and Telegram) that have their own terms, policies, technical requirements, and content restrictions. These requirements may change from time to time.`,
        ),
        p(
          `Users are responsible for ensuring that their content and activities comply with the applicable policies of the platforms they connect or publish to. ${name} may restrict, disable, modify, or remove features or integrations where necessary to comply with third-party platform requirements or applicable law.`,
        ),
        p(
          `Users must not use ${name} to circumvent or knowingly violate the policies or technical restrictions of third-party platforms, including search engine spam policies.`,
        ),
      ],
    },
    {
      heading: "Payment Terms, Refunds, and Upgrade and Downgrade Terms",
      blocks: [
        p("The fees for your Plan are billed in advance and automatically renew on a monthly or annual basis, as specified in your Plan."),
        ul(
          "Monthly subscription plans are refundable up to 1 month of prior service in cases where there were issues with the services we provide or the user forgot to cancel the subscription. Annual subscription plans are not refundable.",
          "Subscription plans purchased with a discount or promotional price are not refundable.",
          "If you downgrade your Plan level, your credit card will automatically be charged the new rate beginning with your next billing cycle.",
          "If you upgrade your Plan level, your credit card will immediately be charged a pro-rated amount reflecting the increased rate, and you will be charged the full amount of the new rate beginning with your next billing cycle.",
          "Depending on the payment method, you may be charged an 8.5-9% refund fee.",
        ),
      ],
    },
    {
      heading: "Cookies",
      blocks: [
        p(`We employ the use of cookies. By using ${name}'s website you consent to the use of cookies in accordance with ${name}'s privacy policy.`),
        p(
          "Most modern interactive websites use cookies to retrieve user details for each visit. Cookies are used in some areas of our site to enable the functionality of this area and ease of use for those people visiting.",
        ),
      ],
    },
    {
      heading: "License",
      blocks: [
        p(
          `Unless otherwise stated, ${name} and/or its licensors own the intellectual property rights for all material on ${name}. All intellectual property rights are reserved. You may view and/or print pages from ${appUrl} for your own personal use subject to restrictions set in these terms and conditions.`,
        ),
        p("You must not:"),
        ul(
          `Republish material from ${appUrl}`,
          `Sell, rent or sub-license material from ${name}`,
          `Reproduce, duplicate or copy material from ${name}`,
          `Redistribute content from ${name} (unless content is specifically made for redistribution)`,
        ),
        p(
          "Content generated for your brand and approved by you is yours to use.",
        ),
        p(
          "Whilst we endeavour to ensure that the information on this website is correct, we do not warrant its completeness or accuracy; nor do we commit to ensuring that the website remains available or that the material on the website is kept up to date.",
        ),
      ],
    },
    {
      heading: "Disclaimer",
      blocks: [
        p(
          "To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website (including, without limitation, any warranties implied by law in respect of satisfactory quality, fitness for purpose and/or the use of reasonable care and skill). Nothing in this disclaimer will:",
        ),
        ul(
          "Limit or exclude our or your liability for fraud.",
          "Limit any of our or your liabilities in any way that is not permitted under applicable law.",
          "Exclude any of our or your liabilities that may not be excluded under applicable law.",
        ),
        p(
          "The limitations and exclusions of liability set out in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer or in relation to the subject matter of this disclaimer, including liabilities arising in contract, in tort (including negligence) and for breach of statutory duty.",
        ),
      ],
    },
    {
      heading: "Contact Us",
      blocks: [p(`For questions about these terms, contact ${supportEmail}.`)],
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
        p("Customers are entitled to request a refund within 14 days of initial purchase, in accordance with our payment processor's refund policy."),
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
        p(`All payments made to ${name} outside the initial 14-day window are final, non-refundable, and non-transferable.`),
        p(`By subscribing to ${name}, you acknowledge and accept that all processed payments are binding and non-refundable.`),
      ],
    },
    {
      heading: "2. Managing Your Subscription and Avoiding Future Billing",
      blocks: [
        p("You may cancel your subscription at any time through your account settings to prevent future renewal charges."),
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
        p(`We strongly encourage you to consider your purchase carefully and ensure that ${name} meets your needs before subscribing.`),
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
        p(`${company} · 3568 Dodge Street, Omaha, NE 68131`),
        p(`${name} is a fully automated SaaS platform. We do not provide human-driven or manually delivered services.`),
      ],
    },
  ],
};
