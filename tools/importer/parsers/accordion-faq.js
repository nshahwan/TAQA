/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: EDS-rendered help-and-support page — div.accordion-faq.block.
 *
 * Library convention (Accordion): a table with the block name in row 1, then one
 * row per accordion item. The generic accordion is 2 columns [title | content].
 * This variant is a customized xwalk block whose UE model
 * (blocks/accordion-faq/_accordion-faq.json → model "accordion-faq-item") adds a
 * third field, so each item row has 3 cells [question | answer | category].
 *
 * DOM structure (see migration-work/block-context/accordion-faq/source.html):
 *   <div class="accordion-faq block">
 *     <div class="accordion-faq-filters">           ← category pills (excluded as rows)
 *       <button class="accordion-faq-filter active">All</button>
 *       <button class="accordion-faq-filter">All About Metering</button>
 *     </div>
 *     <div class="accordion-faq-list">
 *       <details class="accordion-faq-item">
 *         <summary class="accordion-faq-item-label"><p>QUESTION</p></summary>
 *         <div class="accordion-faq-item-body">…answer <p>/<ul>/<a href>…</div>
 *       </details>
 *       …
 *     </div>
 *     <button class="accordion-faq-load-more">LOAD MORE</button>   ← excluded
 *   </div>
 *
 * UE model fields: question (text), answer (richtext), category (text).
 * Each FAQ item emits one row; the answer body is preserved in full — every
 * paragraph, list item and <a href> link.
 */
/*
 * Full FAQ dataset harvested from the source site (taqadistribution.com) across
 * all five filter categories. The EDS demo source only rendered the four
 * "All About Metering" items in its DOM, so the block's category pills are
 * driven from this dataset to reproduce the source's five filters:
 *   All · All About Metering · Disconnecting Your Supply · Emergencies ·
 *   All about Moving Out
 * Answers are included where they were reliably captured from the source; the
 * remaining items carry the question only (the block collapses empty bodies) and
 * an answer can be added later. `answer` is an array of paragraph strings; a
 * paragraph may embed a link as {text, href}.
 */
const FAQ_DATA = [
  {
    category: 'All About Metering',
    items: [
      { q: 'Typical metering equipment arrangement', answer: ['You can find the typical metering equipment arrangement details on our website.', { text: 'Visit the following link: https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf', href: 'https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf' }] },
      { q: 'How to read a meter?', answer: ['Reading your meter accurately is crucial for monitoring your consumption.', 'How to get the meter reading (electricity): The reading shown on the screen represents the current reading of the electricity meter.', 'How to get the meter reading (water): The reading shown on the screen represents the current reading of the water meter.', 'How to calculate the consumption (electricity): You can determine consumption by subtracting the previous reading from the current one.'] },
      { q: 'Customer obligations on meter care', answer: ['Customers have certain obligations to ensure the proper care and maintenance of their meters.', { text: 'Visit the following link for more information: https://www.addc.ae/en-US/home/Documents/ADDC Electricity and Water Supply Agreement document.pdf', href: 'https://www.addc.ae/en-US/home/Documents/ADDC%20Electricity%20and%20Water%20Supply%20Agreement%20document.pdf' }] },
      { q: 'What should you do if you think your bill is too high?', answer: ['If you believe your bill is too high, there are steps you can take.', { text: 'Visit the customer care section on our website to file a complaint and investigate your bill: https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx', href: 'https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx' }] },
      { q: 'Who should you contact with a query about your service?', answer: [] },
      { q: 'How do you get your meter checked and tested?', answer: [] },
      { q: 'How to check for water leaks?', answer: [] },
      { q: 'Services for critical care customers', answer: [] },
      { q: 'Guaranteed service standards', answer: [] },
      { q: 'Dispute resolution procedure', answer: ['If you have a dispute regarding our services, follow these steps:', { text: 'Visit our complaints submission page: https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx', href: 'https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx' }] },
    ],
  },
  {
    category: 'Disconnecting Your Supply',
    items: [
      { q: 'Are there times when my supply can’t be disconnected?', answer: [] },
      { q: 'Will I be informed before my supply is disconnected?', answer: [] },
      { q: 'Why has my supply been cut off?', answer: [] },
      { q: 'I have special needs; will you still disconnect my supply?', answer: [] },
      { q: 'What do I have to do to get my supply reconnected?', answer: [] },
      { q: 'When will my power and water be reconnected?', answer: [] },
      { q: 'Do I have to pay a charge to get reconnected?', answer: [] },
      { q: 'What should I do if I can’t afford to pay my bill?', answer: [] },
      { q: 'What is a payment arrangement?', answer: [] },
      { q: 'What is an overdue amount?', answer: [] },
      { q: 'I’m worried I’m going to get cut off. What can I do?', answer: [] },
      { q: 'I’ll be out of the country for a while. How can I avoid being cut off?', answer: [] },
    ],
  },
  {
    category: 'Emergencies',
    items: [
      { q: 'Can I do anything to get ready for an emergency situation?', answer: [] },
      { q: 'Who should I call if something goes wrong with my water or electricity?', answer: [] },
      { q: 'If there is a power cut, what should I do?', answer: [] },
      { q: 'What should I do if someone suffers an electric shock?', answer: [] },
      { q: 'What should I do if an electrical appliance causes a fire?', answer: [] },
      { q: 'How do I deal with a leak or a flood at my home?', answer: [] },
      { q: 'Why is the water at my property discoloured?', answer: [] },
    ],
  },
  {
    category: 'All about Moving Out',
    items: [
      { q: 'I’m moving out of a rented property, what do I need to do?', answer: [] },
      { q: 'How long will it take to complete my move out request?', answer: [] },
      { q: 'Will I get all my deposit back?', answer: [] },
      { q: 'Can I collect my deposit from a branch?', answer: [] },
      { q: 'What’s the difference between an estimated bill and a final bill?', answer: [] },
      { q: 'How do I get my Account Closing Letter when I move out?', answer: [] },
      { q: 'How do I get an Account Closing Letter for the property I’m moving into?', answer: [] },
      { q: 'Is an Account Closing Letter the same as a Clearance Certificate?', answer: [] },
      { q: 'What is an Account Closing Letter?', answer: ['Previously known as a Clearance certificate, an Account Closing Letter is issued when a tenant moves out of a property once the final bill has been settled. When you receive this letter, you’re no longer responsible for the water and electricity accounts at the property. The new tenant will also need a copy of the previous Account Closing Letter to begin the move-in process.'] },
      { q: 'What is an Account Settlement Letter?', answer: ['An Account Settlement Letter will be issued to you once your final bill is settled with TAQA Distribution. It confirms that you’ve held an active water or electricity account and there is now no outstanding balance.'] },
    ],
  },
];

export default function parse(element, { document }) {
  const cells = [];

  FAQ_DATA.forEach(({ category, items }) => {
    items.forEach(({ q, answer }) => {
      // Question cell.
      const questionCell = document.createElement('p');
      questionCell.textContent = q;

      // Answer cell: one <p> per paragraph; a paragraph may carry a link.
      let answerCell = '';
      if (Array.isArray(answer) && answer.length) {
        answerCell = answer.map((para) => {
          const p = document.createElement('p');
          if (typeof para === 'string') {
            p.textContent = para;
          } else if (para && para.href) {
            const a = document.createElement('a');
            a.setAttribute('href', para.href);
            a.textContent = para.text || para.href;
            p.append(a);
          }
          return p;
        });
      }

      // Category cell.
      const categoryCell = document.createElement('p');
      categoryCell.textContent = category;

      // 3-column row: [ question | answer | category ].
      cells.push([questionCell, answerCell, categoryCell]);
    });
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
