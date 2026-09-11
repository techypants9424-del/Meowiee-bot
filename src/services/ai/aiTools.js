import { PermissionFlagsBits } from 'discord.js';

export const aiTools = [
    {
        type: 'function',
        name: 'play_music',
        description:
            'Play a song, artist, album, or music search query in the user voice channel. ALWAYS use this when the user asks to play music.',
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
        name: 'join_voice',
        description:
            'Join the voice channel the user is currently in. Use when the user asks Meowiee to join their voice channel.',
        strict: true,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
        },
    },

    {
        type: 'function',
        name: 'skip_music',
        description:
            'Skip the currently playing song and move to the next song in the queue.',
        strict: true,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
        },
    },

    {
        type: 'function',
        name: 'leave_voice',
        description:
            'Leave the current voice channel and stop music playback.',
        strict: true,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
        },
    },

    {
        type: 'function',
        name: 'loop_music',
        description:
            'Control music looping. Use "song" to repeat the current song, "queue" to repeat the entire queue, or "off" to disable looping.',
        strict: true,
        parameters: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: [
                        'song',
                        'queue',
                        'off',
                    ],
                    description:
                        'Loop mode: song, queue, or off.',
                },
            },
            required: ['mode'],
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
                        'The exact name of the channel to create.',
                },
                type: {
                    type: 'string',
                    enum: [
                        'text',
                        'voice',
                        'category',
                        'announcement',
                    ],
                    description:
                        'The type of Discord channel to create.',
                },
            },
            required: ['name', 'type'],
            additionalProperties: false,
        },
    },

    {
        type: 'function',
        name: 'rename_channel',
        description:
            'Rename an existing Discord channel. Only users with Manage Channels permission may use this action.',
        strict: true,
        parameters: {
            type: 'object',
            properties: {
                channelName: {
                    type: 'string',
                    description:
                        'The current name of the channel to rename.',
                },
                newName: {
                    type: 'string',
                    description:
                        'The new name for the channel.',
                },
            },
            required: [
                'channelName',
                'newName',
            ],
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
                    description:
                        'The name of the role to create.',
                },
                color: {
                    type: 'string',
                    description:
                        'Optional hexadecimal role color such as #ff0000. Use an empty string if no color was requested.',
                },
            },
            required: [
                'name',
                'color',
            ],
            additionalProperties: false,
        },
    },

    {
        type: 'function',
        name: 'delete_channel',
        description:
            'Delete a Discord channel. Only users with Manage Channels permission may use this action. Never use unless the user clearly asks to delete a channel.',
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
            'Delete a Discord role. Only users with Manage Roles permission may use this action. Never use unless the user clearly asks to delete a role.',
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

export function hasPermission(
    member,
    permission,
) {
    if (!member?.permissions) {
        return false;
    }

    return member.permissions.has(
        permission,
    );
}

export const AI_TOOL_PERMISSIONS = {
    play_music: null,
    join_voice: null,
    skip_music: null,
    leave_voice: null,
    loop_music: null,

    create_channel:
        PermissionFlagsBits.ManageChannels,

    rename_channel:
        PermissionFlagsBits.ManageChannels,

    create_role:
        PermissionFlagsBits.ManageRoles,

    delete_channel:
        PermissionFlagsBits.ManageChannels,

    delete_role:
        PermissionFlagsBits.ManageRoles,
};
