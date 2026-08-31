// prefixParser.js

import { resolveSubcommandAlias } from '../config/commands/commandAliases.js';
import { logger } from './logger.js';

export function parsePrefixCommand(content, prefix) {
  if (!content || !content.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = content.slice(prefix.length).trim();
  
  if (!withoutPrefix) {
    return null;
  }

  const args = parseArguments(withoutPrefix);
  
  if (args.length === 0) {
    return null;
  }

  const commandName = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  return {
    commandName,
    args: commandArgs
  };
}

function parseArguments(input) {
  const args = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuote) {
      if (char === quoteChar) {
        
        inQuote = false;
        args.push(current);
        current = '';
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
        inQuote = true;
        quoteChar = char;
      } else if (char === ' ') {
        
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}
export function mapArgumentsToOptions(args, commandData) {
  const options = {};
  let subcommandName = null;
  let subcommandGroupName = null;

  const cmdData = commandData?.toJSON
    ? commandData.toJSON()
    : commandData;

  if (!cmdData || !cmdData.options) {
    return {
      _positional: args,
      get: (name) => args[0] || null,
      getString: (name) => args.join(' ') || null,
      getUser: (name) => null,
      getInteger: (name) => parseInt(args[0]) || null,
      getBoolean: (name) => args[0] === 'true',
      getSubcommand: () => null,
      getSubcommandGroup: () => null,
      validateRequired: () => ({ valid: true, missing: [] })
    };
  }

  const subcommandGroup = cmdData.options.find(
    (opt) => opt.type === 2
  );

  const subcommands = cmdData.options.filter(
    (opt) => opt.type === 1
  );

  const hasSubcommands =
    subcommands.length > 0 && !subcommandGroup;

  let currentArgs = args;
  let optionDefs = [];

  /*
   * SUBCOMMAND GROUP
   */
  if (subcommandGroup) {
    if (args.length > 0) {
      subcommandGroupName = args[0].toLowerCase();

      const group = subcommandGroup.options?.find(
        (g) => g.name === subcommandGroupName
      );

      if (group && args.length > 1) {
        subcommandName = resolveSubcommandAlias(args[1]);

        const sub = group.options?.find(
          (s) => s.name === subcommandName
        );

        if (sub) {
          optionDefs =
            sub.options?.filter(
              (opt) => opt.type !== 1 && opt.type !== 2
            ) || [];

          currentArgs = args.slice(2);
        }
      }
    }
  }

  /*
   * NORMAL SUBCOMMAND
   */
  else if (hasSubcommands) {
    if (args.length > 0) {
      const resolvedSubcommand =
        resolveSubcommandAlias(args[0]);

      const sub = subcommands.find(
        (s) => s.name === resolvedSubcommand
      );

      if (sub) {
        subcommandName = resolvedSubcommand;

        optionDefs =
          sub.options?.filter(
            (opt) => opt.type !== 1 && opt.type !== 2
          ) || [];

        currentArgs = args.slice(1);
      }
    }
  }

  /*
   * NORMAL COMMAND
   */
  else {
    optionDefs = cmdData.options.filter(
      (opt) => opt.type !== 1 && opt.type !== 2
    );
  }

  /*
   * MAP ARGUMENTS
   */
  for (
    let i = 0;
    i < optionDefs.length;
    i++
  ) {
    const optionDef = optionDefs[i];

    if (!currentArgs[i]) {
      continue;
    }

    /*
     * IMPORTANT:
     * If this is the last string option,
     * join ALL remaining words.
     *
     * Example:
     * play love nwantiti
     *
     * becomes:
     * query = "love nwantiti"
     */
    if (
      optionDef.type === 3 &&
      i === optionDefs.length - 1
    ) {
      options[optionDef.name] =
        currentArgs.slice(i).join(' ');
    } else {
      options[optionDef.name] =
        currentArgs[i];
    }
  }

  /*
   * REQUIRED OPTIONS
   */
  const missing = [];

  if (
    subcommandName ||
    (!hasSubcommands && !subcommandGroup)
  ) {
    for (const opt of optionDefs) {
      if (
        opt.required &&
        !options[opt.name]
      ) {
        missing.push({
          name: opt.name,
          description: opt.description,
          type: opt.type,
        });
      }
    }
  }

  /*
   * MISSING SUBCOMMAND
   */
  if (
    (hasSubcommands || subcommandGroup) &&
    !subcommandName &&
    !subcommandGroupName
  ) {
    const availableSubcommands =
      hasSubcommands
        ? subcommands.map((s) => s.name).join(', ') || 'none'
        : subcommandGroup?.options
            ?.map((g) => g.name)
            .join(', ') || 'none';

    missing.push({
      name: subcommandGroup
        ? 'subcommand group'
        : 'subcommand',
      description:
        `Available: ${availableSubcommands}`,
      type: 1,
    });
  }

  /*
   * INVALID SUBCOMMAND
   */
  else if (
    hasSubcommands &&
    args.length > 0 &&
    !subcommandName
  ) {
    missing.push({
      name: 'subcommand',
      description:
        `Available: ${subcommands
          .map((s) => s.name)
          .join(', ')}`,
      type: 1,
    });
  }

  /*
   * INVALID GROUP SUBCOMMAND
   */
  else if (
    subcommandGroup &&
    subcommandGroupName &&
    !subcommandName
  ) {
    const group =
      subcommandGroup.options?.find(
        (g) => g.name === subcommandGroupName
      );

    const availableSubcommands =
      group?.options
        ?.map((s) => s.name)
        .join(', ') || 'none';

    missing.push({
      name: 'subcommand',
      description:
        `Available: ${availableSubcommands}`,
      type: 1,
    });
  }

  return {
    ...options,

    _positional: args,

    get: (name) =>
      options[name] || null,

    getString: (name) =>
      options[name] || null,

    getUser: (name) =>
      options[name] || null,

    getMember: (name) =>
      options[name] || null,

    getChannel: (name) =>
      options[name] || null,

    getRole: (name) =>
      options[name] || null,

    getInteger: (name) =>
      options[name]
        ? parseInt(options[name])
        : null,

    getBoolean: (name) =>
      options[name] === 'true',

    getSubcommand: () =>
      subcommandName,

    getSubcommandGroup: () =>
      subcommandGroupName,

    validateRequired: () => ({
      valid: missing.length === 0,
      missing,
      subcommandName,
      subcommandGroupName,
      optionDefs
    })
  };
}
