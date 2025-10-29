/**
 * Options that control filesystem discovery behavior.
 */
export interface FileDiscoveryOptions {
    /**
     * When true, symbolic links encountered during discovery will be traversed.
     * Defaults to {@code false} to preserve existing behavior and avoid
     * inadvertently scanning large or unintended directory trees.
     */
    readonly followSymbolicLinks?: boolean;
}
