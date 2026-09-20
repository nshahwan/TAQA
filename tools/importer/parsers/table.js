/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the baggage-allowance data table.
 * Source: table.table.table-striped (thead header row + tbody data rows).
 * Emits a `table (striped)` EDS block (blocks/table). First row = block name +
 * variant; subsequent rows = the table's header + data rows.
 */
export default function parse(element, { document }) {
  const table = element.matches('table') ? element : element.querySelector('table');
  if (!table) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  table.querySelectorAll('tr').forEach((tr) => {
    const rowCells = [...tr.children].map((cell) => cell.textContent.trim());
    if (rowCells.some((t) => t)) cells.push(rowCells);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'table',
    variants: ['striped'],
    cells,
  });
  element.replaceWith(block);
}
