import { PermissionFlagsBits } from 'discord.js';

/**
 * AI tools available to Meowiee.
 *
 * These definitions tell the AI what actions it is allowed
 * to request. The actual Discord actions are executed by our
 * bot code, not by OpenAI.
 */

export const aiTools = [
  {
    type: 'function',
    name: 'play_music',
    description:
      'Play a song, artist, album, or music search query in the user voice channel. Use this when a user asks Meowiee to play music.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The song, artist, album, or music search query to play.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  {
    type: 'function',
    name: 'create_channel',
    description:
      'Create a new Discord channel in the current server. Only users with Manage Channels permission may use this action.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'The name of the channel to create. Use lowercase words separated by hyphens when appropriate.',
        },
        type: {
          type: 'string',
          enum: ['text', 'voice', 'category', 'announcement'],
          description: 'The type of Discord channel to create.',
        },
      },
      required: ['name', 'type'],
      additionalProperties: false,
    },
  },

  {
    type: 'function',
    name: 'create_role',
    description:
      'Create a new Discord role in the current server. Only users with Manage Roles permission may use this action.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the role to create.',
        },
        color: {
          type: 'string',
          description:
            'Optional hexadecimal role color such as #ff0000. Use an empty string if no color was requested.',
        },
      },
      required: ['name', 'color'],
      additionalProperties: false,
    },
  },

  {
    type: 'function',
    name: 'delete_channel',
    description:
      'Delete a Discord channel. Only users with Manage Channels permission may use this action. Never use this unless the user clearly asks to delete a channel.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        channelName: {
          type: 'string',
          description:
            'The name of the channel that should be deleted.',
        },
      },
      required: ['channelName'],
      additionalProperties: false,
    },
  },

  {
    type: 'function',
    name: 'delete_role',
    description:
      'Delete a Discord role. Only users with Manage Roles permission may use this action. Never use this unless the user clearly asks to delete a role.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        roleName: {
          type: 'string',
          description:
            'The name of the role that should be deleted.',
        },
      },
      required: ['roleName'],
      additionalProperties: false,
    },
  },
];

/**
 * Check whether a member has the required permission.
 */
export function hasPermission(member, permission) {
  if (!member?.permissions) {
    return false;
  }

  return member.permissions.has(permission);
}

/**
 * Permission required for each AI action.
 */
export const AI_TOOL_PERMISSIONS = {
  play_music: null,

  create_channel:
    PermissionFlagsBits.ManageChannels,

  create_role:
    PermissionFlagsBits.ManageRoles,

  delete_channel:
    PermissionFlagsBits.ManageChannels,

  delete_role:
    PermissionFlagsBits.ManageRoles,
};
