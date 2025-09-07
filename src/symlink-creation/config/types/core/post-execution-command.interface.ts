/**
 * Configuration for post-execution shell commands.
 */
export interface PostExecutionCommand {
    /** Shell command to execute. */
    command: string;
    /** If set and the path exists, this command will be skipped. */
    skipIfPathExists?: string;
    /** Working directory for command execution */
    cwd?: string;
    /** Command timeout in milliseconds (default: 300000 = 5 minutes) */
    timeoutInMs?: number;
    /** Environment variables for command execution */
    env?: Record<string, string>;
	/**
	 * If `true`, runs the command inside of a [shell](https://en.wikipedia.org/wiki/Shell_(computing)).
	 * Uses [`/bin/sh`](https://en.wikipedia.org/wiki/Unix_shell) on UNIX and [`cmd.exe`](https://en.wikipedia.org/wiki/Cmd.exe) on Windows. A different shell can be specified as a string. The shell should understand the `-c` switch on UNIX or `/d /s /c` on Windows.
	*/
    shell?: boolean | string | URL;
}