/**
 * Prefixless command restrictions.
 *
 * All commands can now be used without a prefix.
 * Slash commands continue to work normally as well.
 */

export const SLASH_ONLY_COMMANDS = new Set();

export const GLOBAL_BLOCKED_SUBCOMMANDS = new Set();

export const GLOBAL_BLOCKED_SUBCOMMAND_GROUPS = new Set();

export const COMMAND_BLOCKED_SUBCOMMANDS = {};

function collectSubcommandNames(commandJson) {
  const subcommandGroup = commandJson.options?.find((opt) => opt.type === 2);

  if (subcommandGroup) {
    const names = [];

    for (const group of subcommandGroup.options || []) {
      names.push(...(group.options?.map((opt) => opt.name) || []));
    }

    return names;
  }

  return (
    commandJson.options
      ?.filter((opt) => opt.type === 1)
      .map((sub) => sub.name) || []
  );
}

function isSubcommandBlocked(commandName, subcommandName) {
  if (!subcommandName) {
    return false;
  }

  if (GLOBAL_BLOCKED_SUBCOMMANDS.has(subcommandName)) {
    return true;
  }

  const commandBlocked = COMMAND_BLOCKED_SUBCOMMANDS[commandName];

  return commandBlocked?.has(subcommandName) ?? false;
}

/**
 * Returns whether a prefixless invocation should be rejected.
 */
export function getPrefixRestriction(command, args, resolveSubcommandAlias) {
  // All commands are allowed prefixless.
  return { blocked: false };
}

export function isPrefixRestrictedCommand(
  command,
  args,
  resolveSubcommandAlias
) {
  return false;
}
