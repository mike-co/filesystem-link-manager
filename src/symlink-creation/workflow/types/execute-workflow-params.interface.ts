import { Progress } from 'vscode';
import { LoggerService } from '../../../logging';
import { ConfigParserService } from '../../config';
import { CopyManagerService } from '../../copying';
import { FileDiscoveryService } from '../../discovery';
import { CommandExecutorService } from '../../execution';
import { AttributeAdjustmentService } from '../../file-attribute';
import { LinkManagerService } from '../../linking';


/**
 * Parameters required for workflow execution.
 * 
 * Contains all services, configuration data, and execution context needed
 * to perform the core workflow operations including progress reporting.
 */
export interface ExecuteWorkflowParams {
    /** Raw configuration data to be parsed and validated */
    configData: unknown;
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
    /** VS Code progress reporter for user feedback during execution */
    progress: Progress<{ increment?: number; message?: string }>;
    /** Initial progress percentage to start from */
    initialProgressIncrement: number;
    /** Workspace root directory for resolving relative paths */
    workspaceRoot: string;
}