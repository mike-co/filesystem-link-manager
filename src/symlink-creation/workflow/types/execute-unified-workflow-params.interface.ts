import type { LoggerService } from '../../../logging';
import type { ConfigParserService } from '../../config';
import type { CopyManagerService } from '../../copying';
import type { FileDiscoveryService } from '../../discovery';
import type { CommandExecutorService } from '../../execution';
import type { AttributeAdjustmentService } from '../../file-attribute';
import type { LinkManagerService } from '../../linking';
import type { ConfigSource } from './config-source.type';

/**
 * Parameters for unified workflow execution.
 * 
 * Contains all required services and configuration data needed to execute a workflow
 * from either a configuration file or VS Code settings.
 */
export interface ExecuteUnifiedWorkflowParams {
    /** Path to configuration file (required when configSource is 'file') */
    configPath?: string;
    /** Source of configuration data ('file' or 'settings') */
    configSource: ConfigSource;
    /** Logger service for operation logging and debugging */
    logger: LoggerService;
    /** Service for parsing and validating configuration data */
    configParserService: ConfigParserService;
    /** Service for handling file and directory copy operations */
    copyManagerService: CopyManagerService;
    /** Service for creating symlinks and hardlinks */
    linkManagerService: LinkManagerService;
    /** Service for executing post-workflow commands */
    commandExecutorService: CommandExecutorService;
    /** Service for discovering files and directories matching patterns */
    fileDiscoveryService: FileDiscoveryService;
    /** Service for adjusting file attributes after operations */
    attributeAdjustmentService: AttributeAdjustmentService;
}
