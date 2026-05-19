/**
 * Split Group Card Component
 *
 * Displays a grouped card showing two sessions that are in split view.
 * Supports two modes:
 * - 'active': Compact sidebar view with session names and unsplit button (original behavior)
 * - 'persisted': Home screen card with two terminal previews side by side (iTerm2 style)
 *
 * @fires unsplit - When the user wants to exit split mode (detail: { sessionId: string })
 * @fires split-session-focus - When the user clicks a session name to focus it (detail: { sessionId: string })
 * @fires restore-split-group - When a persisted group card is clicked to restore split view (detail: { groupId: string })
 */
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Session } from '../../../shared/types.js';
import { createLogger } from '../../utils/logger.js';
import '../vibe-terminal-buffer.js';

const logger = createLogger('split-group-card');

@customElement('split-group-card')
export class SplitGroupCard extends LitElement {
  // Disable shadow DOM to use Tailwind
  createRenderRoot() {
    return this;
  }

  @property({ type: Object }) leftSession!: Session;
  @property({ type: Object }) rightSession!: Session;
  @property({ type: String }) mode: 'active' | 'persisted' = 'active';
  @property({ type: String }) groupId = '';

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

  private handleRestoreClick() {
    if (this.mode !== 'persisted' || !this.groupId) return;
    logger.log(`Restore split group: ${this.groupId}`);
    this.dispatchEvent(
      new CustomEvent('restore-split-group', {
        detail: { groupId: this.groupId },
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

  private renderActiveMode() {
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

  private renderPersistedMode() {
    const leftName = this.getDisplayName(this.leftSession);
    const rightName = this.getDisplayName(this.rightSession);

    return html`
      <div
        class="session-card group cursor-pointer rounded-xl border border-accent-primary/30 bg-gradient-to-b from-bg-secondary to-bg-tertiary shadow-card hover:shadow-card-hover hover:border-accent-primary/50 transition-all overflow-hidden"
        style="min-width: 280px; max-width: 100%;"
        @click=${this.handleRestoreClick}
        title="Click to restore split view"
        id="split-group-card-persisted-${this.groupId}"
      >
        <!-- Header with split icon and session names -->
        <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-accent-primary/5">
          <div class="flex-shrink-0 text-accent-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
            </svg>
          </div>
          <span class="text-xs font-mono text-accent-primary truncate flex-1">${leftName}</span>
          <div class="w-px h-3 bg-accent-primary/30 flex-shrink-0"></div>
          <span class="text-xs font-mono text-accent-primary truncate flex-1">${rightName}</span>
        </div>

        <!-- Terminal preview area: two terminals side by side -->
        <div class="flex" style="height: 160px;">
          <!-- Left terminal preview -->
          <div class="flex-1 overflow-hidden relative" style="border-right: 1px solid rgb(var(--color-border));">
            <vibe-terminal-buffer
              .sessionId=${this.leftSession.id}
              .theme=${'auto'}
              class="w-full h-full"
              style="pointer-events: none;"
            ></vibe-terminal-buffer>
          </div>

          <!-- Right terminal preview -->
          <div class="flex-1 overflow-hidden relative">
            <vibe-terminal-buffer
              .sessionId=${this.rightSession.id}
              .theme=${'auto'}
              class="w-full h-full"
              style="pointer-events: none;"
            ></vibe-terminal-buffer>
          </div>
        </div>

        <!-- Footer with status -->
        <div class="px-3 py-2 text-text-muted text-xs border-t border-border bg-gradient-to-r from-bg-tertiary to-bg-secondary">
          <div class="flex justify-between items-center">
            <span class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full ${this.getGroupStatusColor()}"></div>
              Split Group
            </span>
            <span class="text-text-dim text-[10px]">Click to restore</span>
          </div>
        </div>
      </div>
    `;
  }

  private getGroupStatusColor(): string {
    const leftRunning = this.leftSession.status === 'running';
    const rightRunning = this.rightSession.status === 'running';
    if (leftRunning && rightRunning) return 'bg-status-success';
    if (leftRunning || rightRunning) return 'bg-status-warning';
    return 'bg-status-error';
  }

  render() {
    if (!this.leftSession || !this.rightSession) return html``;

    if (this.mode === 'persisted') {
      return this.renderPersistedMode();
    }

    return this.renderActiveMode();
  }
}
