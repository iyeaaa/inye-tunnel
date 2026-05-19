/**
 * Split Pane Container Component
 *
 * Renders multiple session-view instances side by side in a horizontal split layout.
 * Supports draggable divider for resizing panes and focus management.
 *
 * @fires pane-focus - When a pane gains focus (detail: { index })
 * @fires pane-close - When a pane requests to close (detail: { index })
 * @fires split-resize - When the divider is dragged (detail: { ratio })
 */
import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import type { Session } from '../../shared/types.js';
import { SPLIT_PANE } from '../utils/constants.js';
import { createLogger } from '../utils/logger.js';
import { triggerTerminalResize } from '../utils/terminal-utils.js';

import './session-view.js';

const logger = createLogger('split-pane-container');

export interface SplitPane {
  sessionId: string;
  session: Session | undefined;
}

@customElement('split-pane-container')
export class SplitPaneContainer extends LitElement {
  // Disable shadow DOM to use Tailwind
  createRenderRoot() {
    return this;
  }

  // Pane configuration
  @property({ type: Array }) panes: SplitPane[] = [];
  @property({ type: Number }) activePaneIndex = 0;
  @property({ type: Number }) splitRatio = SPLIT_PANE.DEFAULT_RATIO;

  // Pass-through props for session-view
  @property({ type: Boolean }) showBackButton = false;
  @property({ type: Boolean }) showSidebarToggle = true;
  @property({ type: Boolean }) sidebarCollapsed = false;
  @property({ type: Boolean }) disableFocusManagement = false;
  @property({ type: Boolean }) keyboardCaptureActive = true;

  // Internal drag state
  @state() private isDragging = false;
  private dragStartX = 0;
  private dragStartRatio = 0;
  private containerWidth = 0;

  // Bound handlers for cleanup
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundPaneMouseDown = this.handlePaneMouseDown.bind(this);

  connectedCallback() {
    super.connectedCallback();
    // Ensure the custom element itself fills its parent
    this.style.display = 'block';
    this.style.height = '100%';
    this.style.width = '100%';

    // Use capture phase mousedown to detect pane clicks before terminal consumes the event
    this.addEventListener('mousedown', this.boundPaneMouseDown, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up global listeners if dragging was interrupted
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.removeEventListener('mousedown', this.boundPaneMouseDown, true);
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    // When splitRatio changes (after drag), refit terminals
    if (changedProperties.has('splitRatio') && !this.isDragging) {
      this.refitAllTerminals();
    }
  }

  private refitAllTerminals() {
    requestAnimationFrame(() => {
      for (const pane of this.panes) {
        const container = this.querySelector(`#split-pane-${pane.sessionId}`) as HTMLElement;
        if (container) {
          triggerTerminalResize(pane.sessionId, container);
        }
      }
    });
  }

  /**
   * Capture-phase mousedown handler to detect which pane was clicked.
   * This fires before the terminal element can consume the event.
   */
  private handlePaneMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // Don't change focus when clicking the divider
    const divider = this.querySelector('#split-divider');
    if (divider && divider.contains(target)) return;

    // Determine which pane was clicked by checking if target is inside left or right pane
    for (let i = 0; i < this.panes.length; i++) {
      const pane = this.panes[i];
      if (!pane) continue;
      const paneEl = this.querySelector(`#split-pane-${pane.sessionId}`);
      if (paneEl && paneEl.contains(target)) {
        if (this.activePaneIndex !== i) {
          logger.debug(`Pane focus changed to index ${i} (mousedown capture)`);
          this.dispatchEvent(
            new CustomEvent('pane-focus', {
              detail: { index: i },
              bubbles: true,
              composed: true,
            })
          );
        }
        return;
      }
    }
  }

  private handleDividerMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartRatio = this.splitRatio;

    // Get container width for ratio calculation
    const container = this.querySelector('#split-pane-root') as HTMLElement;
    if (container) {
      this.containerWidth = container.clientWidth - SPLIT_PANE.DIVIDER_WIDTH;
    }

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    logger.debug('Divider drag started');
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaRatio = deltaX / this.containerWidth;
    let newRatio = this.dragStartRatio + deltaRatio;

    // Enforce minimum pane width
    const minRatio = SPLIT_PANE.MIN_WIDTH / this.containerWidth;
    const maxRatio = 1 - minRatio;
    newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));

    this.splitRatio = newRatio;
  }

  private handleMouseUp() {
    if (!this.isDragging) return;

    this.isDragging = false;

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    // Restore text selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Dispatch resize event with final ratio
    this.dispatchEvent(
      new CustomEvent('split-resize', {
        detail: { ratio: this.splitRatio },
        bubbles: true,
        composed: true,
      })
    );

    // Refit terminals after drag ends
    this.refitAllTerminals();

    logger.debug(`Divider drag ended, ratio: ${this.splitRatio.toFixed(3)}`);
  }

  render() {
    if (this.panes.length < 2) {
      logger.warn('split-pane-container requires at least 2 panes');
      return html``;
    }

    const leftPane = this.panes[0];
    const rightPane = this.panes[1];

    if (!leftPane || !rightPane) {
      return html``;
    }

    const leftWidthPercent = this.splitRatio * 100;

    return html`
      <div
        id="split-pane-root"
        class="flex h-full w-full overflow-hidden"
        style="position: relative;"
      >
        <!-- Left pane -->
        <div
          id="split-pane-${leftPane.sessionId}"
          class="relative overflow-hidden h-full ${this.activePaneIndex === 0 ? 'split-pane-active' : ''}"
          style="width: ${leftWidthPercent}%; flex-shrink: 0;"
        >
          ${keyed(
            leftPane.sessionId,
            html`
              <session-view
                .session=${leftPane.session ?? null}
                .showBackButton=${this.showBackButton}
                .showSidebarToggle=${this.showSidebarToggle}
                .sidebarCollapsed=${this.sidebarCollapsed}
                .disableFocusManagement=${this.disableFocusManagement}
                .keyboardCaptureActive=${this.activePaneIndex === 0 && this.keyboardCaptureActive}
                .containedMode=${true}
                @navigate-to-list=${this.forwardEvent}
                @toggle-sidebar=${this.forwardEvent}
                @create-session=${this.forwardEvent}
                @session-status-changed=${this.forwardEvent}
                @open-settings=${this.forwardEvent}
                @capture-toggled=${this.forwardEvent}
              ></session-view>
            `
          )}
        </div>

        <!-- Divider -->
        <div
          id="split-divider"
          class="split-divider ${this.isDragging ? 'dragging' : ''}"
          style="width: ${SPLIT_PANE.DIVIDER_WIDTH}px; flex-shrink: 0;"
          @mousedown=${this.handleDividerMouseDown}
        ></div>

        <!-- Right pane -->
        <div
          id="split-pane-${rightPane.sessionId}"
          class="relative overflow-hidden flex-1 h-full ${this.activePaneIndex === 1 ? 'split-pane-active' : ''}"
        >
          ${keyed(
            rightPane.sessionId,
            html`
              <session-view
                .session=${rightPane.session ?? null}
                .showBackButton=${this.showBackButton}
                .showSidebarToggle=${false}
                .sidebarCollapsed=${this.sidebarCollapsed}
                .disableFocusManagement=${this.disableFocusManagement}
                .keyboardCaptureActive=${this.activePaneIndex === 1 && this.keyboardCaptureActive}
                .containedMode=${true}
                @navigate-to-list=${this.forwardEvent}
                @toggle-sidebar=${this.forwardEvent}
                @create-session=${this.forwardEvent}
                @session-status-changed=${this.forwardEvent}
                @open-settings=${this.forwardEvent}
                @capture-toggled=${this.forwardEvent}
              ></session-view>
            `
          )}
        </div>
      </div>
    `;
  }

  /**
   * Forward events from child session-views to the parent app
   */
  private forwardEvent = (e: Event) => {
    const clone = new CustomEvent(e.type, {
      detail: (e as CustomEvent).detail,
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(clone);
  };
}
