/**
 * Shared contract for high-throughput particle systems.
 *
 * Two implementations exist:
 * - BunnymarkParticleSystem — CPU physics (SoA arrays, unrolled loops),
 *   renders via the instanced sprite path. Bound by config.maxEntities
 *   (static GPU buffer sizing).
 * - GpuParticleSystem — GPU physics (WebGL2 transform feedback),
 *   self-contained VRAM state, unbounded by engine config.
 *
 * Both are drop-in interchangeable behind this interface; the bunnymark
 * harness switches between them with ?cpu=1.
 */
export interface IParticleSystem {
  /** Number of live particles. */
  getActiveCount(): number;

  /** Spawn `count` particles in a burst around (centerX, centerY). */
  burst(count: number, centerX: number, centerY: number): void;

  /** Advance the simulation by dt seconds. */
  update(dt: number): void;

  /** Draw all live particles. */
  render(
    renderer: any,
    textureManager: any,
    cameraX?: number,
    cameraY?: number,
    cameraZoom?: number
  ): void;

  /** Remove all particles. */
  clear(): void;
}
