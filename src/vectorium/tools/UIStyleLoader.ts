/**
 * Vectorium UI Style Loader
 * Injects consolidated UI stylesheet into the document
 * Ensures styles are loaded only once
 */

export class UIStyleLoader {
  private static injected = false;

  /**
   * Inject UI styles into the document
   * Safe to call multiple times - only injects once
   */
  public static injectStyles(): void {
    if (this.injected) {
      return;
    }

    // Since we can't use ?inline in TypeScript, load the CSS file dynamically
    // The CSS will be bundled by Vite and injected automatically
    // For now, we'll create a link element to load it
    const styleLink = document.createElement('link');
    styleLink.id = 'vectorium-ui-styles';
    styleLink.rel = 'stylesheet';
    styleLink.href = '/src/vectorium/tools/ui-controls.css';
    document.head.appendChild(styleLink);

    this.injected = true;
  }

  /**
   * Check if styles have been injected
   */
  public static isInjected(): boolean {
    return this.injected;
  }

  /**
   * Force reload styles (for development)
   */
  public static reload(): void {
    const existing = document.getElementById('vectorium-ui-styles');
    if (existing) {
      existing.remove();
    }
    this.injected = false;
    this.injectStyles();
  }
}
