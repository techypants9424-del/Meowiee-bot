import {
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import {
    playQuery,
    skipTrack,
    leaveVoiceChannel,
    setLoopMode,
    getPlayer,
} from '../../services/music/musicActions.js';

import {
    hasPermission,
    AI_TOOL_PERMISSIONS,
} from './aiTools.js';

function createInteractionAdapter(
    message,
    guild,
    member,
    client,
) {
    return {
        guild,
        guildId: guild.id,
        channel: message.channel,
        channelId: message.channel.id,
        member,
        user: message.author,
        client,
        voice: member?.voice,

        reply: async options => {
            return message.reply(options);
        },

        editReply: async options => {
            if (
                typeof message.editReply ===
                'function'
            ) {
                return message.editReply(options);
            }

            return null;
        },

        followUp: async options => {
            return message.channel.send(options);
        },

        deferred: false,
        replied: false,
    };
}

function getDiscordErrorMessage(error) {
    const code = error?.code;

    if (code === 50013) {
        return 'Meowiee does not have the required Discord permissions.';
    }

    if (code === 50001) {
        return 'Meowiee does not have access to that Discord resource.';
    }

    if (code === 50035) {
        return 'Discord rejected the request because some of the provided information is invalid.';
    }

    if (code === 10003) {
        return 'That Discord channel no longer exists.';
    }

    if (code === 10011) {
        return 'That Discord role no longer exists.';
    }

    return (
        error?.userMessage ||
        error?.message ||
        'The Discord action failed.'
    );
}

export async function executeAITool(
    toolName,
    args,
    message,
    client,
) {
    try {
        const member = message.member;
        const guild = message.guild;

        if (!guild) {
            return {
                success: false,
                message:
                    'This action can only be used inside a server.',
            };
        }

        /*
         * PLAY MUSIC
         */
        if (toolName === 'play_music') {
            if (!member?.voice?.channel) {
                return {
                    success: false,
                    message:
                        'You need to be in a voice channel first.',
                };
            }

            const query = String(
                args?.query || '',
            ).trim();

            if (!query) {
                return {
                    success: false,
                    message:
                        'No music query was provided.',
                };
            }

            const adapter =
                createInteractionAdapter(
                    message,
                    guild,
                    member,
                    client,
                );

            try {
                const result =
                    await playQuery(
                        client,
                        adapter,
                        query,
                    );

                if (!result) {
                    return {
                        success: false,
                        message:
                            'The music system did not return a result.',
                    };
                }

                return {
                    success: true,
                    action: 'play_music',
                    message:
                        `Started playing "${query}" 🎵`,
                    result,
                };
            } catch (error) {
                console.error(
                    '[AI] play_music error:',
                    error,
                );

                if (
                    error?.type ===
                        'user_input' ||
                    error?.userMessage
                ) {
                    return {
                        success: true,
                        action: 'play_music',
                        alreadyPlaying: true,
                        message:
                            error.userMessage ||
                            'That song is already playing or queued.',
                    };
                }

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * JOIN VOICE
         */
        if (toolName === 'join_voice') {
            const voiceChannel =
                member?.voice?.channel;

            if (!voiceChannel) {
                return {
                    success: false,
                    message:
                        'You need to be in a voice channel first.',
                };
            }

            if (
                !client.riffy ||
                typeof client.riffy
                    .createConnection !==
                    'function'
            ) {
                return {
                    success: false,
                    message:
                        'The music system is unavailable right now.',
                };
            }

            const existingPlayer =
                getPlayer(client, guild.id);

            if (
                existingPlayer?.connected &&
                existingPlayer.voiceChannel ===
                    voiceChannel.id
            ) {
                return {
                    success: true,
                    action: 'join_voice',
                    message:
                        `I'm already in ${voiceChannel.name} 🔊`,
                };
            }

            try {
                client.riffy.createConnection({
                    guildId: guild.id,
                    voiceChannel:
                        voiceChannel.id,
                    textChannel:
                        message.channel.id,
                    deaf: true,
                });

                return {
                    success: true,
                    action: 'join_voice',
                    message:
                        `Joined ${voiceChannel.name} 🔊`,
                };
            } catch (error) {
                console.error(
                    '[AI] join_voice error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * SKIP MUSIC
         */
        if (toolName === 'skip_music') {
            const player =
                getPlayer(client, guild.id);

            if (!player) {
                return {
                    success: false,
                    message:
                        'There is no active music player in this server.',
                };
            }

            const adapter =
                createInteractionAdapter(
                    message,
                    guild,
                    member,
                    client,
                );

            try {
                const result =
                    await skipTrack(
                        client,
                        adapter,
                    );

                return {
                    success: true,
                    action: 'skip_music',
                    message:
                        'Skipped the song ⏭️',
                    result,
                };
            } catch (error) {
                console.error(
                    '[AI] skip_music error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * LEAVE VOICE
         */
        if (toolName === 'leave_voice') {
            const player =
                getPlayer(client, guild.id);

            if (!player) {
                return {
                    success: true,
                    action: 'leave_voice',
                    message:
                        'I am not in a voice channel right now.',
                };
            }

            const adapter =
                createInteractionAdapter(
                    message,
                    guild,
                    member,
                    client,
                );

            try {
                const result =
                    await leaveVoiceChannel(
                        client,
                        adapter,
                    );

                return {
                    success: true,
                    action: 'leave_voice',
                    message:
                        'Left the voice channel 👋',
                    result,
                };
            } catch (error) {
                console.error(
                    '[AI] leave_voice error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * LOOP MUSIC
         */
        if (toolName === 'loop_music') {
            const player =
                getPlayer(client, guild.id);

            if (!player) {
                return {
                    success: false,
                    message:
                        'There is no active music player in this server.',
                };
            }

            const mode = String(
                args?.mode || '',
            ).toLowerCase();

            const loopModes = {
                song: 'track',
                queue: 'queue',
                off: 'none',
            };

            const loopMode =
                loopModes[mode];

            if (!loopMode) {
                return {
                    success: false,
                    message:
                        'Invalid loop mode.',
                };
            }

            const adapter =
                createInteractionAdapter(
                    message,
                    guild,
                    member,
                    client,
                );

            try {
                const result =
                    await setLoopMode(
                        client,
                        adapter,
                        loopMode,
                    );

                let response;

                if (mode === 'song') {
                    response =
                        'Song loop enabled 🔁';
                } else if (
                    mode === 'queue'
                ) {
                    response =
                        'Queue loop enabled 🔁';
                } else {
                    response =
                        'Loop disabled 🔁';
                }

                return {
                    success: true,
                    action: 'loop_music',
                    message: response,
                    result,
                };
            } catch (error) {
                console.error(
                    '[AI] loop_music error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * CREATE CHANNEL
         */
        if (toolName === 'create_channel') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.create_channel,
                )
            ) {
                return {
                    success: false,
                    message:
                        'You do not have Manage Channels permission.',
                };
            }

            const name = String(
                args?.name || '',
            ).trim();

            const type = String(
                args?.type || 'text',
            ).toLowerCase();

            if (!name) {
                return {
                    success: false,
                    message:
                        'No channel name was provided.',
                };
            }

            const channelTypeMap = {
                text: ChannelType.GuildText,
                voice: ChannelType.GuildVoice,
                category:
                    ChannelType.GuildCategory,
                announcement:
                    ChannelType.GuildAnnouncement,
            };

            const channelType =
                channelTypeMap[type];

            if (!channelType) {
                return {
                    success: false,
                    message:
                        'Invalid channel type.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return {
                    success: false,
                    message:
                        'Meowiee does not have Manage Channels permission.',
                };
            }

            try {
                const channel =
                    await guild.channels.create({
                        name,
                        type: channelType,
                    });

                return {
                    success: true,
                    action: 'create_channel',
                    message:
                        `Created channel #${channel.name}.`,
                    channelId: channel.id,
                };
            } catch (error) {
                console.error(
                    '[AI] create_channel error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * RENAME CHANNEL
         */
        if (toolName === 'rename_channel') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.rename_channel,
                )
            ) {
                return {
                    success: false,
                    message:
                        'You do not have Manage Channels permission.',
                };
            }

            const channelName = String(
                args?.channelName || '',
            ).trim();

            const newName = String(
                args?.newName || '',
            ).trim();

            if (
                !channelName ||
                !newName
            ) {
                return {
                    success: false,
                    message:
                        'Both the current channel name and new name are required.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return {
                    success: false,
                    message:
                        'Meowiee does not have Manage Channels permission.',
                };
            }

            const channel =
                guild.channels.cache.find(
                    item =>
                        item.name.toLowerCase() ===
                        channelName.toLowerCase(),
                );

            if (!channel) {
                return {
                    success: false,
                    message:
                        `I couldn't find a channel named "${channelName}".`,
                };
            }

            try {
                const oldName =
                    channel.name;

                await channel.setName(
                    newName,
                );

                return {
                    success: true,
                    action: 'rename_channel',
                    message:
                        `Renamed #${oldName} to #${channel.name}.`,
                    channelId: channel.id,
                };
            } catch (error) {
                console.error(
                    '[AI] rename_channel error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * CREATE ROLE
         */
        if (toolName === 'create_role') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.create_role,
                )
            ) {
                return {
                    success: false,
                    message:
                        'You do not have Manage Roles permission.',
                };
            }

            const name = String(
                args?.name || '',
            ).trim();

            const color = String(
                args?.color || '',
            ).trim();

            if (!name) {
                return {
                    success: false,
                    message:
                        'No role name was provided.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageRoles,
                )
            ) {
                return {
                    success: false,
                    message:
                        'Meowiee does not have Manage Roles permission.',
                };
            }

            try {
                const roleData = {
                    name,
                };

                if (color) {
                    roleData.color = color;
                }

                const role =
                    await guild.roles.create(
                        roleData,
                    );

                return {
                    success: true,
                    action: 'create_role',
                    message:
                        `Created the role "${role.name}".`,
                    roleId: role.id,
                };
            } catch (error) {
                console.error(
                    '[AI] create_role error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * DELETE CHANNEL
         */
        if (toolName === 'delete_channel') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.delete_channel,
                )
            ) {
                return {
                    success: false,
                    message:
                        'You do not have Manage Channels permission.',
                };
            }

            const channelName = String(
                args?.channelName || '',
            ).trim();

            if (!channelName) {
                return {
                    success: false,
                    message:
                        'No channel name was provided.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return {
                    success: false,
                    message:
                        'Meowiee does not have Manage Channels permission.',
                };
            }

            const channel =
                guild.channels.cache.find(
                    item =>
                        item.name.toLowerCase() ===
                        channelName.toLowerCase(),
                );

            if (!channel) {
                return {
                    success: false,
                    message:
                        `I couldn't find a channel named "${channelName}".`,
                };
            }

            try {
                const deletedName =
                    channel.name;

                await channel.delete();

                return {
                    success: true,
                    action: 'delete_channel',
                    message:
                        `Deleted channel #${deletedName}.`,
                };
            } catch (error) {
                console.error(
                    '[AI] delete_channel error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        /*
         * DELETE ROLE
         */
        if (toolName === 'delete_role') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.delete_role,
                )
            ) {
                return {
                    success: false,
                    message:
                        'You do not have Manage Roles permission.',
                };
            }

            const roleName = String(
                args?.roleName || '',
            ).trim();

            if (!roleName) {
                return {
                    success: false,
                    message:
                        'No role name was provided.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageRoles,
                )
            ) {
                return {
                    success: false,
                    message:
                        'Meowiee does not have Manage Roles permission.',
                };
            }

            const role =
                guild.roles.cache.find(
                    item =>
                        item.name.toLowerCase() ===
                        roleName.toLowerCase(),
                );

            if (!role) {
                return {
                    success: false,
                    message:
                        `I couldn't find a role named "${roleName}".`,
                };
            }

            if (role.managed) {
                return {
                    success: false,
                    message:
                        'That role is managed by Discord and cannot be deleted.',
                };
            }

            try {
                const deletedName =
                    role.name;

                await role.delete();

                return {
                    success: true,
                    action: 'delete_role',
                    message:
                        `Deleted the role "${deletedName}".`,
                };
            } catch (error) {
                console.error(
                    '[AI] delete_role error:',
                    error,
                );

                return {
                    success: false,
                    message:
                        getDiscordErrorMessage(
                            error,
                        ),
                };
            }
        }

        return {
            success: false,
            message:
                `Unknown AI tool: ${toolName}`,
        };
    } catch (error) {
        console.error(
            `AI tool "${toolName}" failed:`,
            error,
        );

        return {
            success: false,
            message:
                getDiscordErrorMessage(error),
        };
    }
}
