import {Args, Flags} from '@oclif/core';
import {BaseCommand} from '../base/command.js';

export default class Config extends BaseCommand {
  static override description = 'Manage mastro configuration (defaults to interactive mode)';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --init',
    '<%= config.bin %> <%= command.id %> --global'
  ];

  static override args = {
    action: Args.string({
      description: 'configuration action',
      options: ['interactive', 'init'],
      required: false,
      default: 'interactive'
    })
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    global: Flags.boolean({
      char: 'g',
      description: 'configure global settings',
      default: false
    }),
    init: Flags.boolean({
      char: 'i',
      description: 'initialize configuration instead of interactive mode',
      default: false
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'force overwrite existing configuration (for init)',
      default: false
    })
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Config);

    try {
      // Determine which subcommand to run
      let action = args.action || 'interactive';
      
      // Override with flags if specified
      if (flags.init) {
        action = 'init';
      }

      // Build the command and arguments to execute
      const commandParts: string[] = ['config:' + action];
      
      // Add flags to the command parts
      if (flags.global) commandParts.push('--global');
      if (flags.force) commandParts.push('--force');
      if (flags.verbose) commandParts.push('--verbose');
      if (flags['no-cache']) commandParts.push('--no-cache');
      if (flags['dry-run']) commandParts.push('--dry-run');
      if (flags.config) {
        commandParts.push('--config');
        commandParts.push(flags.config);
      }

      // Use OCLIF's proper command execution
      switch (action) {
        case 'init': {
          this.log('Initializing mastro configuration...', 'info');
          break;
        }
        case 'interactive':
        default: {
          this.log('Starting interactive configuration wizard...', 'info');
          break;
        }
      }

      // Execute the subcommand using the config object
      await this.config.runCommand(commandParts[0], commandParts.slice(1));
      
    } catch (error) {
      await this.handleError(error, 'manage configuration');
    }
  }
}