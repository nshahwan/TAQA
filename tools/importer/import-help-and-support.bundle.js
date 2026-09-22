(function () {
  var WebImporter = window.WebImporter;
  var __mod_0 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-support. Base: hero.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk simple block. Model fields (blocks/hero-support/_hero-support.json):
 *   - image (reference)  -> row 2 (banner image)
 *   - text  (richtext)   -> row 3 (eyebrow + heading + intro)
 * Library convention: Hero has 1 column, up to 3 rows (name, image, text).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  // build a cell whose first node is a field-name hint comment (xwalk hinting)
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    if (!present.length) return '';
    return [document.createComment(` field:${name} `), ...present];
  };

  // Banner image (row 2)
  const image = element.querySelector("img[class*='imagesframe'], img");

  // Text content (row 3): eyebrow, heading, intro paragraph
  const eyebrow = element.querySelector("p[class*='headerFrame_title'], [class*='textContainer'] p[class*='caption']");
  const heading = element.querySelector("h1[class*='headerFrame_subtitle'], h1, h2");
  const intro = element.querySelector("p[class*='headerFrame_text'], [class*='textContainer'] p[class*='body']");

  // Empty-block guard
  if (!image && !heading && !intro) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  const imageCell = fieldCell('image', image);
  if (imageCell) cells.push([imageCell]);
  const textCell = fieldCell('text', eyebrow, heading, intro);
  if (textCell) cells.push([textCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-support', cells });
  element.replaceWith(block);
}

})();
  var __mod_1 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-quicklink. Base: carousel. NEW block.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "carousel-quicklink" holds items
 * "carousel-quicklink-item" (blocks/carousel-quicklink/_carousel-quicklink.json).
 * Per the container convention: row 1 = block name, each subsequent row = one
 * slide/item. Item model fields:
 *   - link     (aem-content) -> the <a href> target
 *   - linkText (text)        -> the card title (collapsed into the link's text)
 * ONE ROW PER quicklink card. Each card in the source is:
 *   <li><a href="..."><span ...title...>TITLE</span><span ...icon...><img base64></span></a></li>
 * The base64 arrow-icon <img> is block chrome (re-added by block JS) and is NOT
 * emitted as content.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  // Collect the quick-link cards. Prefer the <li> items inside the slides
  // container; fall back to any anchor containing a title span.
  let anchors = Array.from(
    element.querySelectorAll("ul[class*='slidesContainer'] > li a[href], [class*='slidesContainer'] li a[href]"),
  );
  if (!anchors.length) {
    anchors = Array.from(element.querySelectorAll("a[href]")).filter((a) =>
      a.querySelector("[class*='findYourSolutionCard_title'], [class*='title']"),
    );
  }

  // Empty-block guard
  if (!anchors.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  anchors.forEach((a) => {
    // Card title text
    const titleEl = a.querySelector("[class*='findYourSolutionCard_title'], p[class*='title'], [class*='title']");
    const titleText = (titleEl ? titleEl.textContent : a.textContent).trim();
    const href = (a.getAttribute('href') || '').trim();

    // Build a clean anchor carrying href + the title as its text.
    // linkText is a collapsed field (Text suffix) -> it becomes the anchor's
    // text, so only the `link` field needs a hint comment.
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = titleText;

    // One row per card, single cell hinted with the item's `link` field.
    cells.push([[document.createComment(' field:link '), link]]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-quicklink', cells });

  // Hoist the section default content ("FIND YOUR SOLUTION" heading + intro
  // paragraph) out of the block container so it survives as default content
  // adjacent to the block. The right-header container holds only carousel
  // arrow chrome, so it is intentionally not hoisted.
  const defaultNodes = [];
  const header = element.querySelector("[class*='leftHeaderContainer']");
  if (header) {
    const h = header.querySelector('h1, h2, h3, h4, h5, h6');
    if (h) {
      const heading = document.createElement('h2');
      heading.textContent = h.textContent.trim();
      defaultNodes.push(heading);
    }
    header.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  element.replaceWith(...defaultNodes, block);
}

})();
  var __mod_2 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-appbanner. Base: columns.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk COLUMNS block. Per hinting rules, columns blocks do NOT carry
 * field-name hint comments — cells hold plain default content, and the second
 * row holds one cell per column.
 * The app-download promo is authored as a single content column: tagline,
 * headings, intro line, and the App Store / Play Store download links (anchors
 * wrapping store-badge images).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const content = element.querySelector("[class*='appcontent'], [class*='parentAppContent'], [class*='appsection']") || element;

  // Collect the promo content in document order: tagline lines, headings,
  // body copy, and the app-store download links.
  const columnNodes = [];
  const tagline = content.querySelector("[class*='tagline']:not([class*='midtagline'])");
  if (tagline) columnNodes.push(tagline);

  content
    .querySelectorAll("[class*='midtagline'] h6, [class*='midtagline'] h5, h6, h5")
    .forEach((h) => {
      if (!columnNodes.includes(h)) columnNodes.push(h);
    });

  // Intro / body line (a body paragraph that is not inside the tagline block).
  content.querySelectorAll('p').forEach((p) => {
    if (p.closest("[class*='tagline']")) return;
    const cls = p.className || '';
    if (/body6|body4|body5/.test(cls) && p.textContent.trim()) {
      if (!columnNodes.some((n) => n.contains(p))) columnNodes.push(p);
    }
  });

  // App-store download links (anchors with hrefs and a badge image).
  const appLinks = Array.from(content.querySelectorAll("[class*='applinks'] a[href], a[class*='applink'][href]"));
  appLinks.forEach((a) => columnNodes.push(a));

  // Empty-block guard
  if (!columnNodes.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One content row. Columns blocks carry no field hints — the row's cells are
  // the columns; here the promo is a single content column.
  const cells = [[columnNodes]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-appbanner', cells });
  element.replaceWith(block);
}

})();
  var __mod_3 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-tips. Base: carousel.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "carousel-tips" holds items
 * "carousel-tips-slide" (blocks/carousel-tips/_carousel-tips.json).
 * Slide model fields (authoritative for this variant):
 *   - image (reference) -> the tip image        (image cell)
 *   - text  (richtext)  -> heading + description + LEARN MORE link (text cell)
 * Container convention: row 1 = block name; each subsequent row = one slide
 * with an image cell followed by a text cell.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    return [document.createComment(` field:${name} `), ...present];
  };

  const cards = Array.from(element.querySelectorAll("[class*='tipCard']"));

  // Empty-block guard
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Eyebrow ("ENERGY SAVING TIPS") lives inside the carousel container on the
  // source, above the slides. Emit it as the block's first row (a single
  // text-only cell, no image) so it renders inside the carousel panel. The
  // block JS treats a leading image-less row as the eyebrow, not a slide.
  const eyebrow = element.querySelector("[class*='tipsCarousel_header']");
  if (eyebrow && eyebrow.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = eyebrow.textContent.trim();
    cells.push(['', p]);
  }

  cards.forEach((card) => {
    const image = card.querySelector('img');
    const textContainer = card.querySelector("[class*='textContainer']");
    const heading = textContainer ? textContainer.querySelector('p:first-child') : null;
    const description = textContainer
      ? textContainer.querySelector('p:nth-child(2)')
      : null;
    const learnMore = card.querySelector("a[class*='learnMore'], a[href]");

    // Normalize the LEARN MORE link: unwrap the inner <span> so md keeps text.
    let linkEl = null;
    if (learnMore) {
      linkEl = document.createElement('a');
      linkEl.setAttribute('href', (learnMore.getAttribute('href') || '').trim());
      linkEl.textContent = learnMore.textContent.trim();
    }

    cells.push([
      fieldCell('image', image),
      fieldCell('text', heading, description, linkEl),
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-tips', cells });

  // The eyebrow ("ENERGY SAVING TIPS") is emitted as the block's first row
  // above (rendered inside the carousel panel by the block JS), so nothing is
  // hoisted out here.
  element.replaceWith(block);
}

})();
  var __mod_4 = (function () {
/* eslint-disable */
/* global WebImporter */
const FAQ_DATA = [{"category":"All","question":"What is Al Etihad Credit Bureau (AECB)?","answer":"<p>Al Etihad Credit Bureau is a Public Joint Stock Company wholly owned by the UAE Federal Government. As per UAE Federal Law No. (6) of 2010 concerning Credit Information, the company is mandated to regularly collect credit information from financial and non-financial institutions in the UAE. Al Etihad Credit Bureau aggregates and analyzes this data to calculate Credit Scores and produce Credit Reports made available to individuals and companies in the UAE.</p>"},{"category":"All","question":"What is a Credit Report?","answer":"<p>The Credit Report is a document that includes your personal identity information, details of your credit cards, loans and other credit facilities, along with your payment and bounced cheque history and includes your water and electricity billing and payment history.</p>"},{"category":"All","question":"Who are the Information Providers?","answer":"<p>Al Etihad Credit Bureau (AECB) collects information on individuals and companies from banks, finance companies, telecom companies. Additional information from other sources such as utilities, real estate, government and other entities will be added in the future.</p>"},{"category":"All","question":"How is TAQA Distribution involved with the Credit Report?","answer":"<p>TAQA Distribution provides billing and payment information, which will be available in your Credit Report in the future and has nothing to do with other information displayed in the Credit Report.</p>"},{"category":"All","question":"How can paying my utilities bills on time improve my Credit Report?","answer":"<p>Settling your utilities bills on time and in full will show in your credit report in the future and will improve your credit score. A high credit score will help process your application faster and provide better deals with banks and other entities.</p>"},{"category":"All","question":"When will TAQA Distribution require my Credit Report?","answer":"<p>TAQA Distribution will only ask you to submit your Credit Report if you request to pay your water and electricity bills in instalments.</p>"},{"category":"All","question":"Can I have access to my Credit Report?","answer":"<p>You can get your Credit Report by visiting one of AECB's Customer Happiness Centers.</p>"},{"category":"All","question":"Does AECB play any role in accepting or denying my loan applications?","answer":"<p>The Al Etihad Credit Bureau does not play any role in decision-making. Banks and financial institutions (lenders) are the sole decision-makers and only point of contact for any loan or credit applications.</p>"},{"category":"All","question":"What can I do if my Credit Report contains incorrect information?","answer":"<p>To resolve inaccurate information in your Credit Report related to the water and electricity bills, you will need to:<br></p><ul><li>Call TAQA Distribution on 8002332</li><li>Log on to your <a href=\"https://www.addc.ae/\">TAQA Distribution</a><a> account.</a></li><li><a>Or visit any TAQA Distribution customer service branches</a></li></ul>"},{"category":"All","question":"Are there any fees charged for the direct debit service?","answer":"<p>There aren't any fees to subscribe to the direct debit service.</p>"},{"category":"All","question":"Is this service safe?","answer":"<p>Yes, the direct debit service is safe and secure. You only need to provide us with your TAQA Distribution account and your international banking account number (IBAN). We will submit your request in cooperation with the UAE Central Bank.</p>"},{"category":"All","question":"Can customers cancel the service? Is there a cancellation fee?","answer":"<p>Customers can cancel the service with no cancelation fee.</p>"},{"category":"All","question":"Would the customer be contacted via SMS in the registration and deduction stages?","answer":"<p>The customer will receive a text message at each stage: registration, cancellation, payment, and reminders before deduction, so that the customer can ensure there are sufficient funds in the account.</p>"},{"category":"All","question":"Can the customer fix the monthly deducted amount?","answer":"<p>The customer can fix the amount by subscribing to the fixed bill service.</p>"},{"category":"All","question":"Are there any added fees due to rejection or non-payment if the amount is not deducted by the bank for the lack of sufficient funds in the customer's account?","answer":"<p>There is no extra charge if the payment is rejected but there will be another attempt to deduct the amount.</p>"},{"category":"All","question":"Will the service be disconnected if the unpaid amounts accumulate?","answer":"<p>Yes, it will. Our system makes three attempts every five days to process the payment. If payment is still not received after these attempts, it will be forwarded to our collection services.</p>"},{"category":"All","question":"How can customers subscribe to the service?","answer":"<p>By calling the customer service call centre on 8002332, through the website, or the Smart Application.</p>"},{"category":"All","question":"What happens if the bill is higher than the amount available in the bank account? For instance, if the bill is AED 500, and the bank account has a balance of AED 400?","answer":"<p>The system will not deduct the AED 400, and the process will be rejected (for lack of sufficient balance).</p>"},{"category":"All","question":"What is a Bill Estimation?","answer":"<p>A bill estimation is the process by which we estimate the amount of water and electricity consumed by the customer using his/her previous consumption data. It is also our way of supporting you with budgeting your monthly bill payment when your meter cannot be physically read.</p>"},{"category":"All","question":"How is the bill estimation calculated?","answer":"<p>To calculate a bill estimation, we use the customer’s usage from the previous month or year to estimate the current month’s consumption. </p>"},{"category":"All","question":"I have received an estimated bill. When will I receive an accurate bill?","answer":"<p>You should receive an accurate bill once the actual meter reading is taken, which we anticipate in the months of June and July. It is worth mentioning that most of our bills are based on actual meter readings throughout the year, following the global best practice, and estimation only occurs in unique situations.</p>"},{"category":"All","question":"Is my meter reading accurate?","answer":"<p>We consider a reading taken by the meter reader to be accurate. If customers find the readings inaccurate based on their consumption habits, they should request that our technical team check their meter by calling our customer service centre.</p>"},{"category":"All","question":"I don’t think my bill is right, what should I do?","answer":"<p>There are a number of reasons why your bill may be higher or lower than you expected, such as: A change to your tariff/ estimated bills (or previous estimates) that are different to your actual consumption/the time of year (for example, the impact on your electricity bill of air conditioning in summer)/a change to your usage (if visitors are staying or you have new appliances)/water leaks. It’s unlikely that there is a problem with your meter, but if you are worried about your usage and would like us to investigate, call our support team on 800 2332 or <a href=\"mailto:contactcentre@taqadistribution.com\">email us</a>. Please note that if our investigation shows that your meter is not faulty, we will charge you a call-out fee. But you won’t have to pay the fee if we discover a fault.</p>"},{"category":"All","question":"I’ve received an estimated bill; what should I do?","answer":"<p>You don’t need to do anything; it simply means we don’t have an up-to-date meter reading and we have estimated your bill based on the amount you normally use. The bill following your next meter reading will be adjusted to account for any previous overpayment or underpayment.</p>"},{"category":"All","question":"How can I pay my bill?","answer":"<p>The easiest way to pay your bill is to set up Autopay or to pay online each month. However, you can also make payments in many other ways, including by phone, mobile app, or Internet banking, post offices, TAQA Distribution kiosks, partner banks, and exchanges across the emirate. <a href=\"https://www.addc.ae/en-us/residential/Pages/PaymentOptions.aspx\">Click here</a> for more information about all the different payment options.</p>"},{"category":"All","question":"I want to pay my bill online, what should I do?","answer":"<p>You’ll need to <a href=\"https://www.addc.ae/en-US/business/pages/ActivationBusiness.aspx\">activate your online account</a>, if you haven’t done so already. Then just <a href=\"https://www.addc.ae/en-us/business/_layouts/15/addc/login.aspx\">log in</a> and tell us how much you want to pay and which card to use. It’s as simple as that.</p>"},{"category":"All","question":"What is Autopay?","answer":"<p>Autopay is a simple and secure way to ensure you never miss a bill payment. Once your <a href=\"https://www.addc.ae/en-US/business/pages/ActivationBusiness.aspx\">online account</a> is activated, all you must do is set up Autopay and tell us how much you want to pay each month; then, you can relax, and we’ll take the payments for you when they’re due.</p>"},{"category":"All","question":"How secure is Autopay?","answer":"<p>Autopay is protected by a cutting-edge security system. As long as you keep your login details private, using Autopay is simple, safe, and secure.</p>"},{"category":"All","question":"Can I use Autopay for the accounts on my Friends List?","answer":"<p>Yes, you can. You just need to <a href=\"https://www.addc.ae/en-us/business/_layouts/15/addc/login.aspx\">set up Autopay</a> as you would for your own property.</p>"},{"category":"All","question":"What happens if I change my mind about using Autopay?","answer":"<p>You can cancel an Autopay arrangement at any time. Just <a href=\"https://www.addc.ae/en-us/business/_layouts/15/addc/login.aspx\">log in</a> to your online account and follow the simple steps shown.</p>"},{"category":"All","question":"Can I pay someone else’s bill for them?","answer":"<p>Yes, you can, either in full or in part; all you need is their TAQA Distribution account number. Once the payment has been processed, we’ll send a confirmation email or SMS to you and the account holder.</p>"},{"category":"All","question":"What should I do if I can’t afford to pay my bill?","answer":"<p>We care about our customers and are here to help, so if you’re having problems paying your bills, please speak with our support team on 800 2332 or contact us immediately. We’ll discuss your situation with you, and in some cases, we may be able to work out a manageable payment plan.</p>"},{"category":"All","question":"I’m afraid I’m going to get cut off. What can I do?","answer":"<p>It’s important that you keep up to date with your bill payments to avoid a disruption to your service. We do everything we can to keep our customers connected and only cut off the supply as a last resort. We send reminders to customers whose bills are overdue, so if you get one, please don’t ignore it. If you’re worried, you’re at risk of being cut off, call our support team on 800 2332 or contact us.</p>"},{"category":"All","question":"I’ll be out of the country for a while. How can I avoid being disconnected?","answer":"<p>You’ll need to make arrangements to pay your bills while you’re away. The easiest way is to <a href=\"https://www.addc.ae/en-us/business/_layouts/15/addc/login.aspx\">sign up for Autopay</a>, but you can also overpay your account and ask a friend to pay the bills for you.</p>"},{"category":"All","question":"What should I do if I don’t understand my bill?","answer":"<p>We’ve worked hard to make our water and electricity bills clear and easy to understand. However, if you find your bill confusing, our guide to <a href=\"https://www.addc.ae/en-us/business/pages/UnderstandYourBill.aspx\">understanding your bill</a> should help.</p>"},{"category":"All","question":"What tariff am I on?","answer":"<p>Different tariffs are levied for water and electricity. The tariff you’re on is based on your property type and your TAQA Distribution profile. To find out more, take a look at our <a href=\"https://www.addc.ae/en-US/business/Pages/RatesAndTariffs.aspx\">tariff information page</a>.</p>"},{"category":"All","question":"I think I’m on the wrong tariff. Can I change it?","answer":"<p>You can find out more about how we allocate our tariffs on our <a href=\"https://www.addc.ae/en-US/business/Pages/RatesAndTariffs.aspx\">tariff information page</a>. If you think you’re not on the right one, please get in touch with us and we’ll look into it for you.</p>"},{"category":"All","question":"Can I have a printed copy of my bill?","answer":"<p>As long as you have registered for an <a href=\"https://www.addc.ae/en-us/business/_layouts/15/addc/login.aspx\">online account</a>, you can download and print your bills at any time.</p>"},{"category":"All","question":"Typical metering equipment arrangement","answer":"<p>You can find the typical metering equipment arrangement details on our website.</p><ul><li><p>Visit the following link: <a href=\"https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf\"> https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf</a></p></li></ul>"},{"category":"All","question":"How to read a meter?","answer":"<p>Reading your meter accurately is crucial for monitoring your consumption.</p><ul><li><p>How to get the meter reading (electricity): The reading shown on the screen represents the current reading of the electricity meter.</p></li><li><p>How to get the meter reading (water): The reading shown on the screen represents the current reading of the water meter.</p></li><li><p>How to calculate the consumption (electricity): You can determine consumption by subtracting the previous reading from the current one.</p></li></ul>"},{"category":"All","question":"Customer obligations on meter care","answer":"<p>Customers have certain obligations to ensure the proper care and maintenance of their meters.</p><ul><li><p>Visit the following link for more information: <a href=\"https://www.addc.ae/en-US/home/Documents/ADDC%20Electricity%20and%20Water%20Supply%20Agreement%20document.pdf\"> https://www.addc.ae/en-US/home/Documents/ADDC%20Electricity%20and%20Water%20Supply%20Agreement%20document.pdf</a></p></li></ul>"},{"category":"All","question":"What should you do if you think your bill is too high?","answer":"<p>If you believe your bill is too high, there are steps you can take.</p><ul><li><p>Visit the customer care section on our website to file a complaint and investigate your bill: <a href=\"https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx\"> https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx</a></p></li></ul>"},{"category":"All","question":"Who should you contact with a query about your service?","answer":"<p>For any queries regarding your service, please contact our customer service team.</p><ul><li><p>Call our support team at 800 2332</p></li><li><p>Visit our website: <a href=\"https://www.addc.ae/en-US/Home/Pages/ContactUs.aspx\"> https://www.addc.ae/en-US/Home/Pages/ContactUs.aspx</a></p></li></ul>"},{"category":"All","question":"How do you get your meter checked and tested?","answer":"<p>If you need to get your meter checked and tested:</p><ul><li><p>Please call 800 2332 for abnormal bills or if you have not received a bill at all.</p></li></ul>"},{"category":"All","question":"How to check for water leaks?","answer":"<p>To check for water leaks, please refer to our consumer guides:</p><ul><li><p>Visit: <a href=\"https://www.addc.ae/en-us/residential/Pages/ConsumerGuides.aspx\"> https://www.addc.ae/en-us/residential/Pages/ConsumerGuides.aspx</a></p></li></ul>"},{"category":"All","question":"Services for critical care customers","answer":"<p>For critical care customers where a power disruption could put you or others at risk:</p><ul><li><p>We will not cut off your supply.</p></li><li><p>We’ll provide backup power during necessary maintenance.</p></li><li><p>Provide documentary evidence of your critical status such as a hospital letter certified by Abu Dhabi Health Authority.<a href=\"https://www.addc.ae/en-US/residential/Pages/Critical-care-customers.aspx\">https://www.addc.ae/en-US/residential/Pages/Critical-care-customers.aspx</a></p></li></ul>"},{"category":"All","question":"Guaranteed service standards","answer":"<p>We are committed to maintaining high service standards:</p><ul><li><p>Visit the following link for more details: <a href=\"https://www.addc.ae/en-us/business/Pages/GuaranteedStandards.aspx\"> https://www.addc.ae/en-us/business/Pages/GuaranteedStandards.aspx</a></p></li></ul>"},{"category":"All","question":"Dispute resolution procedure","answer":"<p>If you have a dispute regarding our services, follow these steps:</p><ul><li><p>Visit our complaints submission page: <a href=\"https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx\"> https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx</a></p></li></ul>"},{"category":"All","question":"What is the purpose of supplying recycled water to customers?","answer":"<p>The purpose of the recycled water project is to reduce the reliance on potable water and groundwater. This helps to protect the region's precious natural resources.</p>"},{"category":"All","question":"Where does recycled water come from, and is it safe to use?","answer":"<p>The recycled water supplied is treated wastewater. It is treated to the highest regulated standards to protect both the environment and public health and is intended for agricultural consumption. You can find out further information on the ADAFSA website –<a href=\"https://www.adafsa.gov.ae/Arabic/FilesToShare2020/PDF_instructions_Mobile-A.png\"> click here</a> for English. Alternatively, please contact the AD Gov Call Centre on 800555.</p>"},{"category":"All","question":"Who is the regulator responsible for the safety standards of recycled water in Abu Dhabi?","answer":"<p>Recycled water across the emirate is regulated by the Abu Dhabi Department of Energy, under the Regulation for Recycled Water &amp; Biosolids. The regulation itself was developed with the United States Environmental Protection Agency's '2012 Guidelines for Water Reuse' and the World Health Organization's 'Water and Sanitation Safety Plan Manuals' as primary reference. If you would like more information on regulatory matters, please contact the <a href=\"https://www.doe.gov.ae/en/ContactUs\"> Department of Energy</a></p>"},{"category":"All","question":"Does recycled water smell or look different from tap water?","answer":"<p>No, recycled water should not have any odour. It looks the same as tap water.</p>"},{"category":"All","question":"Is the volume of recycled water needed for irrigation the same as the amount of potable water?","answer":"<p>The same amount of water is required for irrigation, regardless of whether recycled or potable water is used.</p>"},{"category":"All","question":"How do I apply for the recycled water service?","answer":"<p>Production of recycled water is limited and therefore new connections are subject to capacity. This is monitored on an ongoing basis and applications are processed accordingly, meaning we cannot guarantee availability. If you would like to apply for connection to our recycled water service, we recommend you first engage with an approved contractor. Applications are technical in nature and should only be complied by individuals with a high level of expertise. You can <a href=\"https://www.addc.ae/en-US/distribution/Pages/Water-services.aspx\"> find our list of approved contractors here.</a> To submit your application <a href=\"mailto:contactcentre@taqadistribution.com\"> please email TAQA Distribution</a> with a formal request containing the following:<br></p><ul><li>Request letter for the connection from the property / business owner</li><li>Detailed drawing of the new chamber with the tie in connection showing the reinforcements, materials of the proposed fittings, ladder etc.(TAQA Distribution Standard drawing can be used as a reference)</li><li>Detailed drawing for a new flowmeter chamber</li><li>Total daily demand calculation for irrigation <a href=\"https://www.addc.ae/en-US/distribution/Documents/Daily Water Demand Schedule.pdf\"> (download here)</a></li><li>Water site layout showing location and size of irrigation storage tank with capacity of 1-2 days' supply as per irrigation demand</li><li>ADM affection plan or updated site plan showing all selected connection points. If affection plan or site plan is not available an alternative document showing the ownership and location attested by the concerned authority must be provided</li><li>Water Planning Data <a href=\"https://www.addc.ae/Style Library/ADDC/docs/Water Planning Data.pdf\"> (download here)</a></li><li>Site Responsibility Schedule <a href=\"https://www.addc.ae/Style Library/ADDC/docs/Site Responsibility Schedule.pdf\">(download here)</a></li></ul><br>TAQA Distribution will then review the application and make an assessment based on the availability of supply alongside further criteria such as proximity to network.<br>The processing time for each application varies on a case-by-case basis but we are committed to responding to our customers regarding their application regardless of whether it has been successful.<br>After approving the Recycled Water Connection Request, you must apply for “supervision for recycled water connection request” <a href=\"mailto:contactcentre@addc.ae\"> through sending an email to TAQA Distribution.</a> with the following documents:<br>1.Assignment Letter from the owner or main contractor (Mandatory)<br>2.Water Contractor's undertaking letter <a href=\"https://www.addc.ae/Style Library/ADDC/docs/Water Contractors undertaking letter Template.pdf\"> (View/Download)</a><br>3.ADDC Competency Card (Mandatory)<br>4.DOE Competency Certificate (Mandatory)<br>5.RFC Documents (Mandatory)<br>6.ADM affection plan for all selected connection points. (Updated site plan).if site plan is not available an alternative document showing the ownership and location by concerned authority shall be provided (Mandatory)<br>7.Contractor’s Shop drawings (Mandatory)<br>8.Material submittals (Mandatory)<br>9.Other Documents (Commercial License, any other letter etc.)<br>10.Bill of Quantities (Mandatory)<br>11.Method of statement (contractor). (Mandatory)<br>12.Provide risk assessment (contractor). (Mandatory)"},{"category":"All","question":"What is the best way to stay informed about changes in the availability of recycled water connections?","answer":"<p>If there are any permanent changes to the availability of our recycled water service or significant updates to the network, they will be announced via our social channels. Please follow us on Instagram, Facebook or Twitter to ensure you get all the latest developments.</p>"},{"category":"All","question":"Are there any charges for a new recycled water connection or meter installation?","answer":"<p>Yes, charges will apply and will vary on a case-by-case basis. If successful, our team will discuss the specific charges associated with your application before proceeding.</p>"},{"category":"All","question":"What is the recycled water tariff and billing cycle?","answer":"<p>A tariff rate of 1.7 AED/m3 will apply for recycled water, billed monthly as part of your standard utilities bill. Recycled water will be shown on the bill for all connected customers from 1 January 2023. When the customer starts paying for the service depends on their category:</p><ul><li><p>Commercial customers will have their recycled water subsidised until 31 December 2023. They will not be charged for the service and will receive indicative bills only until then.</p></li><li><p>All other customer types will have the tariff rates applied from 1 January 2023 and be charged accordingly.</p></li></ul>"},{"category":"All","question":"Why is the subsidy only applied to commercial customers?","answer":"<p>The tariff and related subsidies are applied based on Government Resolution No (185) of 2021. Please contact the Department of Energy for clarifications relating to this topic.</p>"},{"category":"All","question":"Is there a separate meter for recycled water, or will it be a non-metered service?","answer":"<p>There will be a separate meter to measure the consumption of recycled water, which TAQA Distribution will install as part of the connection process.</p>"},{"category":"All","question":"How can I report an issue with recycled water?","answer":"<p>For all non-emergency matters relating to recycled water, please call 8002332. In case of an emergency, please call 992 immediately.</p>"},{"category":"All","question":"What are my rights and responsibilities as a customer using recycled water?","answer":"<p>Please refer to your supply agreement for a complete list of rights and responsibilities. To obtain a copy of your supply agreement, please call us on 8002332.</p>"},{"category":"All","question":"Does recycled water harm landscaping?","answer":"<p>In most instances, any agriculture can be irrigated with recycled water. However, for the avoidance of doubt, please contact ADAFSA for related queries or for an agricultural or planting consultation: <a href=\"mailto:inquiries@ADAFSA.GOV.AE\">inquiries@ADAFSA.GOV.AE</a></p>"},{"category":"All","question":"Can I buy a recycled water tanker to trade with?","answer":"<p>Re-sale of recycled water is strictly prohibited under the terms of its distribution license issued by the regulator, the Abu Dhabi Department of Energy.</p>"},{"category":"All","question":"What steps should I take to ensure the safe use of recycled water?","answer":"<ul><li>Use recycled water for the above-specified purposes only</li><li>Provide workers with appropriate clothing, gloves and shoes</li><li>Provide workers with appropriate clothing, gloves and shoes</li><li>Keep recycled water tanks closed</li><li>Clean your recycled water tank at least once a year</li></ul>"},{"category":"All About Metering","question":"Typical metering equipment arrangement","answer":"<p>You can find the typical metering equipment arrangement details on our website.</p><ul><li><p>Visit the following link: <a href=\"https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf\"> https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf</a></p></li></ul>"},{"category":"All About Metering","question":"How to read a meter?","answer":"<p>Reading your meter accurately is crucial for monitoring your consumption.</p><ul><li><p>How to get the meter reading (electricity): The reading shown on the screen represents the current reading of the electricity meter.</p></li><li><p>How to get the meter reading (water): The reading shown on the screen represents the current reading of the water meter.</p></li><li><p>How to calculate the consumption (electricity): You can determine consumption by subtracting the previous reading from the current one.</p></li></ul>"},{"category":"All About Metering","question":"Customer obligations on meter care","answer":"<p>Customers have certain obligations to ensure the proper care and maintenance of their meters.</p><ul><li><p>Visit the following link for more information: <a href=\"https://www.addc.ae/en-US/home/Documents/ADDC%20Electricity%20and%20Water%20Supply%20Agreement%20document.pdf\"> https://www.addc.ae/en-US/home/Documents/ADDC%20Electricity%20and%20Water%20Supply%20Agreement%20document.pdf</a></p></li></ul>"},{"category":"All About Metering","question":"What should you do if you think your bill is too high?","answer":"<p>If you believe your bill is too high, there are steps you can take.</p><ul><li><p>Visit the customer care section on our website to file a complaint and investigate your bill: <a href=\"https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx\"> https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx</a></p></li></ul>"},{"category":"All About Metering","question":"Who should you contact with a query about your service?","answer":"<p>For any queries regarding your service, please contact our customer service team.</p><ul><li><p>Call our support team at 800 2332</p></li><li><p>Visit our website: <a href=\"https://www.addc.ae/en-US/Home/Pages/ContactUs.aspx\"> https://www.addc.ae/en-US/Home/Pages/ContactUs.aspx</a></p></li></ul>"},{"category":"All About Metering","question":"How do you get your meter checked and tested?","answer":"<p>If you need to get your meter checked and tested:</p><ul><li><p>Please call 800 2332 for abnormal bills or if you have not received a bill at all.</p></li></ul>"},{"category":"All About Metering","question":"How to check for water leaks?","answer":"<p>To check for water leaks, please refer to our consumer guides:</p><ul><li><p>Visit: <a href=\"https://www.addc.ae/en-us/residential/Pages/ConsumerGuides.aspx\"> https://www.addc.ae/en-us/residential/Pages/ConsumerGuides.aspx</a></p></li></ul>"},{"category":"All About Metering","question":"Services for critical care customers","answer":"<p>For critical care customers where a power disruption could put you or others at risk:</p><ul><li><p>We will not cut off your supply.</p></li><li><p>We’ll provide backup power during necessary maintenance.</p></li><li><p>Provide documentary evidence of your critical status such as a hospital letter certified by Abu Dhabi Health Authority.<a href=\"https://www.addc.ae/en-US/residential/Pages/Critical-care-customers.aspx\">https://www.addc.ae/en-US/residential/Pages/Critical-care-customers.aspx</a></p></li></ul>"},{"category":"All About Metering","question":"Guaranteed service standards","answer":"<p>We are committed to maintaining high service standards:</p><ul><li><p>Visit the following link for more details: <a href=\"https://www.addc.ae/en-us/business/Pages/GuaranteedStandards.aspx\"> https://www.addc.ae/en-us/business/Pages/GuaranteedStandards.aspx</a></p></li></ul>"},{"category":"All About Metering","question":"Dispute resolution procedure","answer":"<p>If you have a dispute regarding our services, follow these steps:</p><ul><li><p>Visit our complaints submission page: <a href=\"https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx\"> https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx</a></p></li></ul>"},{"category":"Disconnecting Your Supply","question":"Are there times when my supply can’t be disconnected?","answer":"<p>During the extreme summer heat, it would be dangerous for us to leave you without water to drink or electricity to power your air conditioning, so we will not disconnect your supply during the period from 1 June to 30 September other than for necessary maintenance. If you’re registered with us as having Critical Care status, where a loss of power could put you or other members of your household in danger, we won’t cut off your supply without arranging backup power. Also exempt are non-residential customers, where a loss of supply could represent a risk to public security, health or safety. Where there is an unresolved dispute about your bill, any action or disconnection notice we issue will be put on hold until the issue is settled. MORE ABOUT DISCONNECTIONS - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"Will I be informed before my supply is disconnected?","answer":"<p>We care about our customers and will only disconnect your electricity or water supply if we have to. We’ll inform you that your payment is overdue by sending you a reminder notice (if we haven’t received payment by the following bill’s due date). You’ll then have 14 days from the next bill date to settle the payment or agree on a payment arrangement, or we’ll issue a disconnection notice. This gives you 7 days to settle things before we disconnect your supply. MORE ABOUT DISCONNECTIONS - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"Why has my supply been cut off?","answer":"<p>Although there are several reasons why we might need to disconnect the water and/or electricity supply to a property, the main one is because the customer has not paid their bill. Click the link for a full list of the circumstances that can lead to a disconnection. MORE ABOUT DISCONNECTIONS - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"I have special needs; will you still disconnect my supply?","answer":"<p>If you’re registered with us as a critical care customer, where a power disruption could put you or others at risk, we will not cut off your supply. When we need to conduct necessary maintenance, we’ll provide you with backup power, so you’re not affected by planned outages.<br>You’ll need to provide us with documentary evidence of your critical status, such as a hospital letter certified by Abu Dhabi Health Authority, so we can review your case. Call our support team on 800 2332 or contact us by email at <a href=\"mailto:contactcentre@addc.ae\">contactcentre@addc.ae</a> to register as a critical care customer.</p>"},{"category":"Disconnecting Your Supply","question":"What do I have to do to get my supply reconnected?","answer":"<p>If the disconnection is because of non-payment of a bill, we will only reconnect your supply once you’ve settled the full amount owed, or a payment arrangement has been agreed. You will also need to pay any reconnection fees and, if required, any increase to the amount of your deposit. A reconnection fee of AED 100 is charged if the reason for the disconnection was non-payment of a bill. MORE ABOUT DISCONNECTIONS - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"When will my power and water be reconnected?","answer":"<p>If you’ve been disconnected for non-payment of a bill, we will reconnect you within 3 hours of the outstanding amount being settled (or a payment arrangement agreed), or by 10.30 the following morning if the payment is made late in the day. However, if the disconnection is for other reasons – like fraud or illegal activity – the reconnection period may vary depending on the circumstances of the case. MORE ABOUT DISCONNECTIONS - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"Do I have to pay a charge to get reconnected?","answer":"<p>If the disconnection was because of non-payment of your bill a reconnection fee of AED 100 will be charged. Please note that before we can reconnect your supply you will have to settle the full amount owed or agree a payment arrangement. You’ll also need to pay any reconnection fees and, if required, any increase to the amount of your deposit. MORE ABOUT DISCONNECTIONS - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"What should I do if I can’t afford to pay my bill?","answer":"<p>We care about our customers and are here to help, so if you’re having problems paying your bills, speak with our support team on 800 2332 or email us immediately. We’ll discuss your situation, and in some cases, we may be able to work out a manageable payment plan.</p>"},{"category":"Disconnecting Your Supply","question":"What is a payment arrangement?","answer":"<p>If you’re having trouble paying your bills, we may be able to work out a manageable payment plan to help you meet the costs of your water and electricity. You will be asked to sign a written payment arrangement, which is a legal agreement between the customer and TAQA Distribution. Speak with our support team at 800 2332 or contact us. MORE ABOUT DISCONNECTION - <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"What is an overdue amount?","answer":"<p>Your bill payment is considered overdue if the outstanding amount is still unpaid 14 days after the date the bill was due to be paid.MORE ABOUT DISCONNECTIONS <a href=\"https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx\">https://www.addc.ae/en-US/business/Pages/Supplydisconnectionrules.aspx</a></p>"},{"category":"Disconnecting Your Supply","question":"What should I do if I can’t afford to pay my bill?","answer":"<p>We care about our customers and are here to help, so if you’re having problems paying your bills, speak with our support team on 800 2332 or email us immediately. We’ll discuss your situation, and in some cases, we may be able to work out a manageable payment plan.</p>"},{"category":"Disconnecting Your Supply","question":"I’m worried I’m going to get cut off. What can I do?","answer":"<p>It’s important that you keep up to date with your bill payments to avoid a disruption to your service. We do everything we can to keep our customers connected and only cut off your supply as a last resort. We send reminders to customers whose bills are overdue, so if you get one, please don’t ignore it. If you’re worried that you’re at risk of being cut off, call our support team on 800 2332 or contact us.</p>"},{"category":"Disconnecting Your Supply","question":"I’ll be out of the country for a while. How can I avoid being cut off?","answer":"<p>You’ll need to make arrangements to have your bills paid while you’re away. The easiest way is to sign up for Autopay, but you can also overpay your account, ask a friend to pay the bills for you or apply for a temporary disconnection if you are going to be away for a long time.</p>"},{"category":"Emergencies","question":"Can I do anything to get ready for an emergency situation?","answer":"<p>Make sure you know where the water stop tap and mains electricity switch are located for your property, so you can turn off the supply quickly if there’s a fire or a flood. Keep a battery-operated flashlight handy, along with a well-stocked first aid kit. It’s a good idea to know some useful emergency numbers, too: medical assistance, a qualified electrician and an accredited plumber. There are other precautions you can take that could save your life, like fitting smoke detectors in your home to warn you in the event of a fire. MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"Emergencies","question":"Who should I call if something goes wrong with my water or electricity?","answer":"<p>If there’s a problem that affects only your property and not the whole neighbourhood, it is usually down to you or your landlord to fix it. If you experience things like leaking pipes in your home, faulty electrical wiring or problems with household appliances, contact a qualified electrician or plumber. Never attempt electrical repairs or maintenance work yourself. It’s our responsibility to look after the water and power distribution networks, so contact us if there’s an unplanned power outage or a flood that affects your whole neighbourhood, or if any TAQA Distribution property or equipment has been damaged. Our support team is on call 24 hours contact us on 800 2332. MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"Emergencies","question":"If there is a power cut, what should I do?","answer":"<p>First, check to see who is affected by the power outage. If your neighbours are in the dark, too, it’s up to us to fix things. Call our support team on 800 2332 to let us know there’s a problem so we can get your electricity back on as soon as possible. If the neighbours aren’t affected, the problem is likely to be in your home. Check the main electricity trip switch and try turning it back on. If it trips again, contact a qualified electrician straight away, as you may have a faulty appliance or a problem with the property’s wiring. Never attempt electrical repairs or maintenance work yourself. MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"Emergencies","question":"What should I do if someone suffers an electric shock?","answer":"<p>If a friend or relative receives a shock from touching a live electricity source, it’s important that you don’t touch them. (If you come into contact with the victim you’re likely to receive a shock too.) Try to turn the power off immediately, either at the plug or the mains switch. If you can’t, use something insulated or made of wood — like a wooden broom handle — to try to break the contact between the live current and the victim. The longer they are being electrocuted, the more danger they are in. Always seek medical advice immediately in cases of shock, even when the victim seems to be fine. MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"Emergencies","question":"What should I do if an electrical appliance causes a fire?","answer":"<p>Electricity and water can be a very dangerous mix so never throw water onto an electrical fire. Try to turn the power supply off immediately, either at the plug or the mains switch, or disconnect the dangerous appliance. Use a multi-purpose fire extinguisher where possible, but if the blaze becomes serious get out of danger immediately and call the civil defence on 997. Following any electrical fire, don’t reuse a faulty appliance and always get your property checked by a qualified electrician in case there is any damage to the wiring. Never attempt electrical repairs or maintenance work yourself. MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"Emergencies","question":"How do I deal with a leak or a flood at my home?","answer":"<p>If your property becomes flooded, the first thing to do is turn off the supply of both water and electricity at the mains. This should help to stop the flooding and keep water away from the electrics, to prevent danger from electrical fires or shocks. Contact a qualified plumber as soon as possible to deal with the situation; don’t touch any wet or damp electrical fittings. Get your property inspected by a qualified electrician once the flooding has stopped. MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"Emergencies","question":"Why is the water at my property discoloured?","answer":"<p>The water we supply to you is regularly tested for quality and is safe to use and drink. However, we have no control over the condition of your property’s pipes and water tank, which may not be cleaned and maintained regularly. Over time, debris and contaminants can build up and affect the quality of the water in your property. A regularly maintained water tank should be cleaned at least every 6 months. <br><br> MORE ABOUT EMERGENCIES - <a href=\"https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx\">https://www.addc.ae/en-US/business/Pages/Whattodoinanemergency.aspx</a></p>"},{"category":"All about Moving Out","question":"I’m moving out of a rented property, what do I need to do?","answer":"<p>We’ve made it really easy to close your TAQA Distribution account for the property you’re moving out of. You can visit one of our branches, Call our contact centre or speed things up and arrange everything online. First, you’ll need to let us know your preferred move out date, We’ll then work out what water and electricity you’ve used and prepare your final bill. Once this is settled, you’ll get your Account closing letter, and that’s it. To get things started, go to our move out request section.</p>"},{"category":"All about Moving Out","question":"How long will it take to complete my move out request?","answer":"<p>You’ll need to give us one or two days’ notice of when you would like to move out. If we have an up-to-date meter reading, we can usually arrange to close your account for the property you’re moving out of immediately. If not, we’ll need one or two days to arrange a meter reading and we’ll be able to complete the process quickly once that’s done.</p>"},{"category":"All about Moving Out","question":"Will I get all my deposit back?","answer":"<p>We’ll arrange to refund your deposit as part of the moveout process, once you’ve settled your final bill. If your account is in credit, we’ll refund the whole amount to you; if you have a debit balance, we’ll use the deposit to pay the bill and refund anything that’s left over.</p>"},{"category":"All about Moving Out","question":"Can I collect my deposit from a branch?","answer":"<p>We only refund deposits by bank transfer, although you can choose whether to have it refunded into your bank account or into the TAQA Distribution account of another property. We also offer the option of donating your deposit to Emirates Red Crescent, to help with their local charity work.</p>"},{"category":"All about Moving Out","question":"What’s the difference between an estimated bill and a final bill?","answer":"<p>Your final bill tells you the amount you need to pay to clear the outstanding balance on the property you are moving out of. It is usually ready for you within a few days of your move out date. Once this has been settled, you will be able to get your Account Closing Letter. If you need your letter straight away, we can sometimes issue an estimated bill based on your previous usage. Once this is paid, you’ll be able to download the letter immediately. As this payment will differ from the final bill amount, any balance will have to be settled before we can close your account.</p>"},{"category":"All about Moving Out","question":"How do I get my Account Closing Letter when I move out?","answer":"<p>After your bills have been settled, we will email you are an online user, you can download the letter at any time from the website or the mobile app.</p>"},{"category":"All about Moving Out","question":"How do I get an Account Closing Letter for the property I’m moving into?","answer":"<p>An Account Closing Letter was issued when the previous TAQA Distribution account for your property was closed. To obtain a copy, please contact your landlord.</p>"},{"category":"All about Moving Out","question":"Is an Account Closing Letter the same as a Clearance Certificate?","answer":"<p>Yes, what used to be known as a Clearance Certificate is now called an Account Closing Letter.</p>"},{"category":"All about Moving Out","question":"What is an Account Closing Letter?","answer":"<p>Previously known as a Clearance certificate, an Account Closing Letter is issued when a tenant moves out of a property once the final bill has been settled. When you receive this letter, you’re no longer responsible for the water and electricity accounts at the property. The new tenant will also need a copy of the previous Account Closing Letter to begin the move-in process.</p>"},{"category":"All about Moving Out","question":"What is an Account Settlement Letter?","answer":"<p>An Account Settlement Letter will be issued to you once your final bill is settled with TAQA Distribution. It confirms that you’ve held an active water or electricity account and there is now no outstanding balance.</p>"}];
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "accordion-faq" holds items
 * "accordion-faq-item" (blocks/accordion-faq/_accordion-faq.json).
 * Item model fields (authoritative for this variant):
 *   - question (text)     -> the question label      (cell 0, hinted)
 *   - answer   (richtext) -> the answer body         (cell 1, hinted)
 *   - category (text)     -> category tab name        (cell 2, hinted)
 * The block JS (blocks/accordion-faq/accordion-faq.js) reads three cells per
 * row (question / answer / category) and filters rows by the active category
 * pill. ONE ROW PER question.
 *
 * The SPA loads FAQ answers lazily and swaps the whole question set per category
 * tab, so the scraped DOM only exposes the 4 default question labels with no
 * answers. The full dataset (104 Q&A across the 5 tabs: All / All About Metering
 * / Disconnecting Your Supply / Emergencies / All about Moving Out) was
 * extracted by expanding every item in every tab and is embedded in
 * tools/importer/faq-data.js. We emit one block row per FAQ entry from that
 * dataset so all questions, answers, and category tags are migrated.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */

// Parse an answer HTML fragment into DOM nodes for the richtext cell.
function answerNodes(document, html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';
  const nodes = Array.from(wrapper.childNodes);
  return nodes.length ? nodes : [document.createElement('p')];
}

return function parse(element, { document }) {
  const cells = [];
  FAQ_DATA.forEach((item) => {
    const questionEl = document.createElement('p');
    questionEl.textContent = item.question;

    const categoryEl = document.createElement('p');
    categoryEl.textContent = item.category;

    // cell 0: question (hinted) | cell 1: answer richtext (hinted) |
    // cell 2: category (hinted)
    cells.push([
      [document.createComment(' field:question '), questionEl],
      [document.createComment(' field:answer '), ...answerNodes(document, item.answer)],
      [document.createComment(' field:category '), categoryEl],
    ]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });

  // Hoist the section default content out of the block container so it survives
  // adjacent to the accordion: the "LOOKING FOR ANSWERS ?" heading + intro
  // paragraph. The category filter tabs are NOT hoisted — they must be
  // interactive (they filter the list), so the block JS renders them itself
  // from the per-row `category` field.
  const defaultNodes = [];
  const header = element.querySelector("[class*='faqsection_header']");
  if (header) {
    const h = header.querySelector('h1, h2, h3, h4, h5, h6');
    if (h) {
      const heading = document.createElement('h2');
      heading.textContent = h.textContent.trim();
      defaultNodes.push(heading);
    }
    header.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  // The intro paragraph lives in a sibling subheader container, not inside the
  // header — capture it too so it survives as default content.
  const subHeader = element.querySelector("[class*='faqsection_subHeader']");
  if (subHeader) {
    subHeader.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  element.replaceWith(...defaultNodes, block);
}

})();
  var __mod_5 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-support. Base: cards.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "cards-support" holds items
 * "cards-support-card" (blocks/cards-support/_cards-support.json).
 * Card model fields (authoritative for this variant):
 *   - image (reference) -> the card icon        (cell 0, hinted)
 *   - text  (richtext)  -> title + description  (cell 1, hinted)
 * Convention: each row = one card; cell 0 = image/icon, cell 1 = rich text
 * (heading + description + optional CTA). An empty image cell must still be
 * included. ONE ROW PER support card.
 * The whole source card is an anchor; its href is preserved by wrapping the
 * title heading in a link so the CTA target survives into the text richtext.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    if (!present.length) return '';
    return [document.createComment(` field:${name} `), ...present];
  };

  const cards = Array.from(element.querySelectorAll("a[class*='supportOption_supportDiv'], [class*='subContainer'] > a[href]"));

  // Empty-block guard
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector("[class*='iconContainer'] img, img");
    const href = (card.getAttribute('href') || '').trim();

    // Title (h6) — wrap in an anchor so the card's link target is preserved.
    const titleEl = card.querySelector("[class*='supportText'] h6, h6");
    let titleNode = null;
    if (titleEl) {
      const h = document.createElement('h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleEl.textContent.trim();
        h.append(a);
      } else {
        h.textContent = titleEl.textContent.trim();
      }
      titleNode = h;
    }

    // Description — the body paragraph (skip the empty subHeader wrappers).
    let descNode = null;
    const descP = Array.from(card.querySelectorAll("[class*='supportText'] p"))
      .find((p) => p.textContent.trim());
    if (descP) {
      descNode = document.createElement('p');
      descNode.textContent = descP.textContent.trim();
    }

    // cell 0: image (hinted, empty cell allowed) | cell 1: text (hinted)
    cells.push([
      fieldCell('image', image),
      fieldCell('text', titleNode, descNode),
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-support', cells });
  element.replaceWith(block);
}

})();
  var __mod_6 = (function () {
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com) site-wide cleanup.
 *
 * Source is a React/Next.js SPA with hashed CSS-module class names
 * (e.g. header_header__9OzUC). The live-rendered DOM hash suffixes differ from
 * cleaned.html, so all class-based removal selectors use substring/attribute
 * matching [class*='...'].
 *
 * All selectors verified against migration-work/cleaned.html.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

return function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // OneTrust cookie consent widgets (found: #onetrust-consent-sdk, #onetrust-banner-sdk,
    // #onetrust-pc-sdk, .onetrust-pc-dark-filter)
    // Empty SPA host / infrastructure nodes (found: .dameg-shadow-root-host,
    // next-route-announcer, #modalRoot)
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '.onetrust-pc-dark-filter',
      '.dameg-shadow-root-host',
      'next-route-announcer',
      '#modalRoot',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Remove non-content chrome and structural/non-content nodes.
    // Class selectors use [class*='...'] because CSS-module hash suffixes are
    // volatile between the captured DOM and the live render.
    WebImporter.DOMUtils.remove(element, [
      // Skip link
      'a[href="#main-content"]',
      // Header + top nav bar (found: header_header__, header_navigationbar__SYK)
      "[class*='header_header']",
      "[class*='header_navigationbar']",
      'header',
      // Primary navigation, desktop AND mobile
      // (found: primaryNavigation_container__NM_X, primaryNavigationMobile_container__fMcyp,
      //  primaryNavigationMobile_mainContainer__aRwkP)
      "[class*='primaryNavigation_container']",
      "[class*='primaryNavigationMobile_container']",
      "[class*='primaryNavigationMobile_mainContainer']",
      // Mega-menu dropdown panels (found: dropdown_dropdown__)
      "[class*='dropdown_dropdown']",
      // Global footer (found: footer_footer__Im)
      "[class*='footer_footer']",
      // DAMEG accessibility widget (found: .dameg-shadow-root-host, .damegCursor, .damegReadingLine)
      '.dameg-shadow-root-host',
      '.damegCursor',
      '.damegReadingLine',
      // Mobile-only duplicate copies rendered alongside desktop layout
      // (found: tipCarouselMobile__oR, weAreHereToHelpMobile__oOO, primaryNavigationMobile_*)
      "[class*='tipCarouselMobile']",
      "[class*='weAreHereToHelpMobile']",
      "[class*='primaryNavigationMobile']",
      // Structural / non-content nodes
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
    ]);

    // Strip AOS scroll-animation artifacts so they don't leak into the import.
    // (found: aos-init, aos-animate classes; data-aos-delay/duration/easing attributes)
    element.querySelectorAll('.aos-init, .aos-animate, [data-aos], [data-aos-delay], [data-aos-duration], [data-aos-easing]').forEach((el) => {
      el.classList.remove('aos-init', 'aos-animate');
      [...el.attributes].forEach((attr) => {
        if (attr.name === 'data-aos' || attr.name.startsWith('data-aos-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }
}

})();
  var __mod_7 = (function () {
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com) section breaks + Section Metadata.
 *
 * Inserts <hr> section breaks between the template's sections and appends a
 * Section Metadata block (key "Style") for each section that declares a style.
 * For the help-and-support template, the rc6 "Customer Support" section has
 * style "dark".
 *
 * Section list and styles are read from payload.template.sections; each section
 * is matched by its selector array (first matching selector wins). Selectors are
 * CSS-module substring matches ([class*='...']) because the SPA's hashed class
 * suffixes are volatile between the captured DOM and the live render.
 *
 * Both hooks are used deliberately: block parsers run between beforeTransform
 * and afterTransform and replace section container elements, so <hr> breaks are
 * inserted in beforeTransform (while every section element still exists) with a
 * marker attribute, and Section Metadata is anchored to that marker in
 * afterTransform.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order, first match wins.
function querySection(root, selectors) {
  for (const sel of selectors || []) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

return function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break, no metadata
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker) the original element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { Style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}

})();
/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS







// TRANSFORMER IMPORTS



// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'help-and-support',
  description: 'Help & Support interior page: hero, quick-link carousel, app-promo + tips, FAQ + help panel, dark support bar.',
  urls: [
    'https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services',
  ],
  blocks: [
    {
      name: 'hero-support',
      instances: ["div[class*='headerFrame_herosection']"],
    },
    {
      name: 'carousel-quicklink',
      instances: ["div[class*='customCarousel_container']"],
    },
    {
      name: 'columns-appbanner',
      instances: [
        "div[class*='downloadAppHelpSupport_appSectionContainer']",
        "div[class*='downloadApp_appsectioncontainer']",
      ],
    },
    {
      name: 'carousel-tips',
      instances: ["div[class*='tipsCarousel_container']"],
    },
    {
      name: 'accordion-faq',
      instances: ["div[class*='faqsection_container']"],
    },
    {
      name: 'cards-support',
      instances: ["div[class*='customerSupport_container']"],
    },
  ],
  sections: [
    {
      id: 'rc2',
      name: 'Hero',
      selector: ["div[class*='headerFrame_herosection']"],
      style: null,
      blocks: ['hero-support'],
      defaultContent: [],
    },
    {
      id: 'rc3',
      name: 'Find Your Solution',
      selector: ["div[class*='customCarousel_container']"],
      style: null,
      blocks: ['carousel-quicklink'],
      defaultContent: ["div[class*='customCarousel_leftHeaderContainer']"],
    },
    {
      id: 'rc4',
      name: 'App Promo And Tips',
      selector: ["div[class*='solutionsCarousel_appsectioncontainer']"],
      style: null,
      blocks: ['columns-appbanner', 'carousel-tips'],
      defaultContent: [],
    },
    {
      id: 'rc5',
      name: 'Looking For Answers',
      selector: ["div[class*='faqPanel_container']"],
      style: null,
      blocks: ['accordion-faq'],
      defaultContent: [
        "div[class*='faqsection_header']",
        "div[class*='faqPanel_weAreHereToHelp']:not([class*='Mobile'])",
      ],
    },
    {
      id: 'rc6',
      name: 'Customer Support',
      selector: ["div[class*='customerSupport_container']"],
      style: 'dark',
      blocks: ['cards-support'],
      defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-support': __mod_0,
  'carousel-quicklink': __mod_1,
  'columns-appbanner': __mod_2,
  'carousel-tips': __mod_3,
  'accordion-faq': __mod_4,
  'cards-support': __mod_5,
};

// TRANSFORMER REGISTRY - cleanup first, then sections (template has 5 sections)
const transformers = [
  __mod_6,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [__mod_7] : []),
];

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

window.CustomImportScript = { default: {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. discover blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. parse each block (skip elements already replaced)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: this single source page IS the site index (main page).
    //    Always emit /index — never the deep source path, never empty.
    const path = WebImporter.FileUtils.sanitizePath('/index');

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
} };

})();
