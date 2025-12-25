import { Controller } from '@hotwired/stimulus';

export default class StdlibSearchController extends Controller {
  static targets = ['input', 'grid'];

  declare inputTarget: HTMLInputElement;
  declare gridTarget: HTMLElement;

  filter() {
    const query = this.inputTarget.value.toLowerCase().trim();
    const cards = this.gridTarget.querySelectorAll('.stdlib-fn');

    cards.forEach((card) => {
      const name = card.querySelector('.fn-name')?.textContent?.toLowerCase() || '';
      const desc = card.querySelector('.fn-desc')?.textContent?.toLowerCase() || '';

      const matches = query === '' || name.includes(query) || desc.includes(query);
      (card as HTMLElement).style.display = matches ? '' : 'none';
    });
  }
}
