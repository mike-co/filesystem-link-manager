/**
 * Configuration source types for unified workflow execution.
 * 
 * Defines the possible sources from which workflow configuration can be loaded.
 * Used to determine the appropriate loading strategy for configuration data.
 */
export type ConfigSource = 
    /** Load configuration from an external JSON file */
    | 'file' 
    /** Load configuration from VS Code workspace/user settings */
    | 'settings';
