import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import * as executeUnifiedWorkflowFunction from './workflow-orchestrator/execute-unified-workflow.function';

jest.mock('../../logging/logger.service');
jest.mock('../config/config-parser.service');
jest.mock('../copying/copy-manager.service');
jest.mock('../discovery');
jest.mock('../execution/command-executor.service');
jest.mock('../linking/link-manager.service');
jest.mock('../file-attribute');
jest.mock('./workflow-orchestrator/execute-unified-workflow.function');

describe('workflow-orchestrator.service', () => {
    let serviceUnderTest: WorkflowOrchestratorService;
    let mockExecuteUnifiedWorkflow: jest.MockedFunction<
        typeof executeUnifiedWorkflowFunction.executeUnifiedWorkflow
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the executeUnifiedWorkflow function
        mockExecuteUnifiedWorkflow =
            executeUnifiedWorkflowFunction.executeUnifiedWorkflow as jest.MockedFunction<
                typeof executeUnifiedWorkflowFunction.executeUnifiedWorkflow
            >;

        // Create service instance with mocked dependencies
        serviceUnderTest = new WorkflowOrchestratorService(
            {} as any, // fileDiscoveryService
            {} as any, // loggerService
            {} as any, // configParserService
            {} as any, // copyManagerService
            {} as any, // linkManagerService
            {} as any, // commandExecutorService
            {} as any // attributeAdjustmentService
        );
    });

    describe('Construction', () => {
        test('should construct successfully', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(WorkflowOrchestratorService);
        });
    });

    describe('executeFromSettings', () => {
        test('should execute workflow from settings successfully', async () => {
            // Arrange
            mockExecuteUnifiedWorkflow.mockResolvedValue(true);

            // Act
            const result = await serviceUnderTest.executeFromSettings();

            // Assert
            expect(result).toBe(true);
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configSource: 'settings',
                })
            );
        });

        test('should return false when workflow execution fails', async () => {
            // Arrange
            mockExecuteUnifiedWorkflow.mockResolvedValue(false);

            // Act
            const result = await serviceUnderTest.executeFromSettings();

            // Assert
            expect(result).toBe(false);
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configSource: 'settings',
                })
            );
        });

        test('should propagate errors from workflow execution', async () => {
            // Arrange
            const testError = new Error('Workflow execution failed');
            mockExecuteUnifiedWorkflow.mockRejectedValue(testError);

            // Act & Assert
            await expect(serviceUnderTest.executeFromSettings()).rejects.toThrow(
                'Workflow execution failed'
            );
        });
    });

    describe('executeFromConfigFile', () => {
        test('should execute workflow from config file successfully', async () => {
            // Arrange
            const configPath = '/test/config.json';
            mockExecuteUnifiedWorkflow.mockResolvedValue(true);

            // Act
            const result = await serviceUnderTest.executeFromConfigFile(configPath);

            // Assert
            expect(result).toBe(true);
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configPath: configPath,
                    configSource: 'file',
                })
            );
        });

        test('should return false when workflow execution fails', async () => {
            // Arrange
            const configPath = '/test/config.json';
            mockExecuteUnifiedWorkflow.mockResolvedValue(false);

            // Act
            const result = await serviceUnderTest.executeFromConfigFile(configPath);

            // Assert
            expect(result).toBe(false);
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configPath: configPath,
                    configSource: 'file',
                })
            );
        });

        test('should propagate errors from workflow execution', async () => {
            // Arrange
            const configPath = '/test/config.json';
            const testError = new Error('Config file not found');
            mockExecuteUnifiedWorkflow.mockRejectedValue(testError);

            // Act & Assert
            await expect(serviceUnderTest.executeFromConfigFile(configPath)).rejects.toThrow(
                'Config file not found'
            );
        });

        test('should handle empty config path', async () => {
            // Arrange
            const configPath = '';
            mockExecuteUnifiedWorkflow.mockResolvedValue(true);

            // Act
            const result = await serviceUnderTest.executeFromConfigFile(configPath);

            // Assert
            expect(result).toBe(true);
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configPath: configPath,
                    configSource: 'file',
                })
            );
        });
    });

    describe('Service orchestration logic', () => {
        test('should pass all required services to executeUnifiedWorkflow', async () => {
            // Arrange
            mockExecuteUnifiedWorkflow.mockResolvedValue(true);

            // Act
            await serviceUnderTest.executeFromSettings();

            // Assert
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    logger: expect.anything(),
                    configParserService: expect.anything(),
                    copyManagerService: expect.anything(),
                    linkManagerService: expect.anything(),
                    commandExecutorService: expect.anything(),
                    fileDiscoveryService: expect.anything(),
                    attributeAdjustmentService: expect.anything(),
                })
            );
        });

        test('should pass correct configSource for settings workflow', async () => {
            // Arrange
            mockExecuteUnifiedWorkflow.mockResolvedValue(true);

            // Act
            await serviceUnderTest.executeFromSettings();

            // Assert
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configSource: 'settings',
                })
            );
        });

        test('should pass correct configSource and configPath for file workflow', async () => {
            // Arrange
            const testConfigPath = '/path/to/config.json';
            mockExecuteUnifiedWorkflow.mockResolvedValue(true);

            // Act
            await serviceUnderTest.executeFromConfigFile(testConfigPath);

            // Assert
            expect(mockExecuteUnifiedWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    configSource: 'file',
                    configPath: testConfigPath,
                })
            );
        });
    });
});
