import { injectable } from 'tsyringe';
import { LoggerService } from '../../logging/logger.service';
import { ConfigParserService } from '../config/config-parser.service';
import { CopyManagerService } from '../copying/copy-manager.service';
import { FileDiscoveryService } from '../discovery';
import { CommandExecutorService } from '../execution/command-executor.service';
import { LinkManagerService } from '../linking/link-manager.service';
import { executeUnifiedWorkflow } from './workflow-orchestrator/execute-unified-workflow.function';
import { AttributeAdjustmentService } from '../file-attribute';

/**
 * Service class for workflow orchestration operations.
 */
@injectable()
export class WorkflowOrchestratorService {
    //private readonly fileDiscoveryService: FileDiscoveryService;

    /**
     * Constructs a new WorkflowOrchestratorService with injected dependencies.
     * 
     * @param loggerService - LoggerService instance injected via DI container
     * @param configParserService - ConfigParserService instance injected via DI container
     * @param copyManagerService - CopyManagerService instance injected via DI container
     * @param linkManagerService - LinkManagerService instance injected via DI container
     * @param commandExecutorService - CommandExecutorService instance injected via DI container
     * @param attributeAdjustmentService - AttributeAdjustmentService instance injected via DI container
     */
    public constructor(
        private readonly fileDiscoveryService: FileDiscoveryService,
        private readonly loggerService: LoggerService,
        private readonly configParserService: ConfigParserService,
        private readonly copyManagerService: CopyManagerService,
        private readonly linkManagerService: LinkManagerService,
        private readonly commandExecutorService: CommandExecutorService,
        private readonly attributeAdjustmentService: AttributeAdjustmentService
    ) {}

    /**
     * Execute workflow using configuration from VS Code settings.
     * Coordinates complete symlink creation workflow from workspace/user settings.
     * 
     * @returns Promise resolving to workflow execution result
     * @throws DomainError when workflow execution fails
     */
    public async executeFromSettings(): Promise<boolean> {
        const params = {
            logger: this.loggerService,
            configParserService: this.configParserService,
            copyManagerService: this.copyManagerService,
            linkManagerService: this.linkManagerService,
            commandExecutorService: this.commandExecutorService,
            fileDiscoveryService: this.fileDiscoveryService,
            attributeAdjustmentService: this.attributeAdjustmentService,
        };

        return executeUnifiedWorkflow({
            ...params,
            configSource: 'settings'
        });
    }

    /**
     * Execute workflow using configuration from external JSON file.
     * Coordinates complete symlink creation workflow from file-based configuration.
     * 
     * @param configPath - Absolute path to configuration JSON file
     * @returns Promise resolving to workflow execution result
     * @throws DomainError when workflow execution fails
     */
    public async executeFromConfigFile(configPath: string): Promise<boolean> {
        const params = {
            logger: this.loggerService,
            configParserService: this.configParserService,
            copyManagerService: this.copyManagerService,
            linkManagerService: this.linkManagerService,
            commandExecutorService: this.commandExecutorService,
            fileDiscoveryService: this.fileDiscoveryService,
            attributeAdjustmentService: this.attributeAdjustmentService,
            configPath,
        };
        return executeUnifiedWorkflow({
            ...params,
            configSource: 'file'
        });
    }
}