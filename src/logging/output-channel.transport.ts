import { OutputChannel } from 'vscode';
import Transport from 'winston-transport';
import { injectable, inject } from 'tsyringe';

/**
 * Winston transport that writes log entries to a VS Code OutputChannel.
 * This allows users to view extension logs in the VS Code Output panel.
 */
@injectable()
export class OutputChannelTransport extends Transport {
    /** VS Code OutputChannel instance for displaying logs in the Output panel. */
    private readonly channel: OutputChannel;

    /**
     * Creates a new OutputChannelTransport instance for VS Code output panel logging.
     * Integrates with Winston's transport system to display logs in user-visible format.
     * @param channel The VS Code OutputChannel injected by DI container for log display
     */
    public constructor(@inject('OutputChannel') channel: OutputChannel) {
        super({});
        this.channel = channel;
    }

    /**
     * Logs an entry to the VS Code OutputChannel with formatted display.
     * Formats log entries as: [timestamp] [LEVEL] message [context]
     * @param info The log info object from Winston containing level, message, and context
     * @param callback Callback function to signal logging completion
     */
    public log(info: Record<string, unknown>, callback: () => void): void {
        setImmediate(() => {
            try {
                const timestamp = info.timestamp || new Date().toISOString();
                const level = String(info.level || 'info').toUpperCase();
                const message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
                
                // Format context if present
                let contextStr = '';
                if (info.context && typeof info.context === 'object') {
                    const contextEntries = Object.entries(info.context)
                        .filter(([, value]) => value !== undefined)
                        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                        .join(', ');
                    
                    if (contextEntries) {
                        contextStr = ` [${contextEntries}]`;
                    }
                }

                // Format the log line: [timestamp] [LEVEL] message [context]
                const logLine = `[${timestamp}] [${level}] ${message}${contextStr}`;
                
                this.channel.appendLine(logLine);
                
                // Emit the logged event
                this.emit('logged', info);
            } catch (error) {
                // If there's an error formatting or writing, emit an error event
                this.emit('error', error);
            }
            
            callback();
        });
    }
}