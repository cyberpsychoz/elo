import { Controller } from '@hotwired/stimulus';

export default class BlogController extends Controller {
  static targets = ['post'];

  declare postTargets: HTMLElement[];

  connect() {
    // First post is open by default, others are closed
    this.postTargets.forEach((post, index) => {
      if (index === 0) {
        post.classList.add('open');
      } else {
        post.classList.remove('open');
      }
    });
  }

  toggle(event: Event) {
    const header = event.currentTarget as HTMLElement;
    const post = header.closest('[data-blog-target="post"]') as HTMLElement;

    if (post) {
      post.classList.toggle('open');
    }
  }
}
