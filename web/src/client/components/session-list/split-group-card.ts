/**
 * Split Group Card Component
 *
 * Displays a grouped card showing two sessions that are in split view.
 * Provides controls to focus on either session or unsplit them.
 *
 * @fires unsplit - When the user wants to exit split mode (detail: { sessionId: string })
 * @fires split-session-focus - When the user clicks a session name to focus it (detail: { sessionId: string })
 */
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Session } from '../../../shared/types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('split-group-card');

@customElement('split-group-card')
export class SplitGroupCard extends LitElement {
  // Disable shadow DOM to use Tailwind
  createRenderRoot() {
    return this;
  }

  @property({ type: Object }) leftSession!: Session;
  @property({ type: Object }) rightSession!: Session;

  private handleClickLeft() {
    logger.debug(`Focus left session: ${this.leftSession.id}`);
    this.dispatchEvent(
      new CustomEvent('split-session-focus', {
        detail: { sessionId: this.leftSession.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleClickRight() {
    logger.debug(`Focus right session: ${this.rightSession.id}`);
    this.dispatchEvent(
      new CustomEvent('split-session-focus', {
        detail: { sessionId: this.rightSession.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleUnsplit(e: Event) {
    e.stopPropagation();
    logger.log('Unsplit requested');
    this.dispatchEvent(
      new CustomEvent('unsplit', {
        detail: { sessionId: this.leftSession.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getDisplayName(session: Session): string {
    return (
      session.name || (Array.isArray(session.command) ? session.command.join(' ') : session.command)
    );
  }

  render() {
    if (!this.leftSession || !this.rightSession) return html``;

    const leftName = this.getDisplayName(this.leftSession);
    const rightName = this.getDisplayName(this.rightSession);

    return html`
      <div
        class="group flex items-center gap-2 p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/30 shadow-card-hover"
        style="margin-bottom: 12px;"
        id="split-group-card"
      >
        <!-- Split icon -->
        <div class="flex-shrink-0 text-accent-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
          </svg>
        </div>

        <!-- Left session name -->
        <button
          class="flex-1 min-w-0 text-xs font-mono text-accent-primary truncate text-left hover:underline cursor-pointer"
          title="${leftName} - Click to focus"
          @click=${this.handleClickLeft}
        >
          ${leftName}
        </button>

        <!-- Divider -->
        <div class="w-px h-4 bg-accent-primary/30 flex-shrink-0"></div>

        <!-- Right session name -->
        <button
          class="flex-1 min-w-0 text-xs font-mono text-accent-primary truncate text-left hover:underline cursor-pointer"
          title="${rightName} - Click to focus"
          @click=${this.handleClickRight}
        >
          ${rightName}
        </button>

        <!-- Unsplit button -->
        <button
          class="flex-shrink-0 p-1 rounded-md text-text-muted hover:text-status-error hover:bg-bg-elevated transition-all"
          title="Exit split view"
          @click=${this.handleUnsplit}
          id="unsplit-button"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }
}
