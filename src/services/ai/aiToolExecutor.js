import {
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import { playQuery } from '../../services/music/musicActions.js';
import { hasPermission, AI_TOOL_PERMISSIONS } from './aiTools.js';

export async function executeAITool(toolName, args, message, client) {
    try {
        const member = message.member;
        const guild = message.guild;

        if (!guild) {
            return {
                success: false,
                message: 'This action can only be used inside a server.',
            };
        }

        // =========================
        // PLAY MUSIC
        // =========================

        if (toolName === 'play_music') {
            if (!member?.voice?.channel) {
                return {
                    success: false,
                    message: 'The user is not in a voice channel.',
                };
            }

            const query = String(args?.query || '').trim();

            if (!query) {
                return {
                    success: false,
                    message: 'No music query was provided.',
                };
            }

            /*
             * playQuery expects an interaction-like object.
             *
             * We create a small adapter around the Discord message
             * so the existing music system can be reused.
             */
            const interactionAdapter = {
                guild,
                guildId: guild.id,
                channel: message.channel,
                channelId: message.channel.id,
                member,
                user: message.author,
                client,
                voice: member.voice,

                reply: async (options) => {
                    return message.reply(options);
                },

                editReply: async (options) => {
                    return message.editReply?.(options);
                },

                followUp: async (options) => {
                    return message.channel.send(options);
                },

                deferred: false,
                replied: false,
            };

            try {
                const result = await playQuery(
                    client,
                    interactionAdapter,
                    query,
                );

                if (!result) {
                    return {
                        success: false,
                        message: 'The music system did not return a result.',
                    };
                }

                return {
                    success: true,
                    message: `Music request started for "${query}".`,
                    result,
                };
            } catch (error) {
                console.error('AI play_music error:', error);

                return {
                    success: false,
                    message: 'The music system failed to play that request.',
                };
            }
        }

        // =========================
        // CREATE CHANNEL
        // =========================

        if (toolName === 'create_channel') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.create_channel,
                )
            ) {
                return {
                    success: false,
                    message: 'The user does not have Manage Channels permission.',
                };
            }

            const name = String(args?.name || '').trim();
            const type = String(args?.type || 'text').toLowerCase();

            if (!name) {
                return {
                    success: false,
                    message: 'No channel name was provided.',
                };
            }

            const channelTypeMap = {
                text: ChannelType.GuildText,
                voice: ChannelType.GuildVoice,
                category: ChannelType.GuildCategory,
                announcement: ChannelType.GuildAnnouncement,
            };

            const channelType = channelTypeMap[type];

            if (!channelType) {
                return {
                    success: false,
                    message: 'Invalid channel type.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return {
                    success: false,
                    message: 'Meowiee does not have Manage Channels permission.',
                };
            }

            const channel = await guild.channels.create({
                name,
                type: channelType,
            });

            return {
                success: true,
                message: `Created channel #${channel.name}.`,
                channelId: channel.id,
            };
        }

        // =========================
        // CREATE ROLE
        // =========================

        if (toolName === 'create_role') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.create_role,
                )
            ) {
                return {
                    success: false,
                    message: 'The user does not have Manage Roles permission.',
                };
            }

            const name = String(args?.name || '').trim();
            const color = String(args?.color || '').trim();

            if (!name) {
                return {
                    success: false,
                    message: 'No role name was provided.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageRoles,
                )
            ) {
                return {
                    success: false,
                    message: 'Meowiee does not have Manage Roles permission.',
                };
            }

            const roleData = {
                name,
            };

            if (color) {
                roleData.color = color;
            }

            const role = await guild.roles.create(roleData);

            return {
                success: true,
                message: `Created the role "${role.name}".`,
                roleId: role.id,
            };
        }

        // =========================
        // DELETE CHANNEL
        // =========================

        if (toolName === 'delete_channel') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.delete_channel,
                )
            ) {
                return {
                    success: false,
                    message: 'The user does not have Manage Channels permission.',
                };
            }

            const channelName = String(args?.channelName || '').trim();

            if (!channelName) {
                return {
                    success: false,
                    message: 'No channel name was provided.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageChannels,
                )
            ) {
                return {
                    success: false,
                    message: 'Meowiee does not have Manage Channels permission.',
                };
            }

            const channel = guild.channels.cache.find(
                item =>
                    item.name.toLowerCase() === channelName.toLowerCase(),
            );

            if (!channel) {
                return {
                    success: false,
                    message: `I couldn't find a channel named "${channelName}".`,
                };
            }

            const deletedName = channel.name;

            await channel.delete();

            return {
                success: true,
                message: `Deleted channel #${deletedName}.`,
            };
        }

        // =========================
        // DELETE ROLE
        // =========================

        if (toolName === 'delete_role') {
            if (
                !hasPermission(
                    member,
                    AI_TOOL_PERMISSIONS.delete_role,
                )
            ) {
                return {
                    success: false,
                    message: 'The user does not have Manage Roles permission.',
                };
            }

            const roleName = String(args?.roleName || '').trim();

            if (!roleName) {
                return {
                    success: false,
                    message: 'No role name was provided.',
                };
            }

            if (
                !guild.members.me?.permissions.has(
                    PermissionFlagsBits.ManageRoles,
                )
            ) {
                return {
                    success: false,
                    message: 'Meowiee does not have Manage Roles permission.',
                };
            }

            const role = guild.roles.cache.find(
                item =>
                    item.name.toLowerCase() === roleName.toLowerCase(),
            );

            if (!role) {
                return {
                    success: false,
                    message: `I couldn't find a role named "${roleName}".`,
                };
            }

            if (role.managed) {
                return {
                    success: false,
                    message: 'That role is managed by Discord and cannot be deleted.',
                };
            }

            const deletedName = role.name;

            await role.delete();

            return {
                success: true,
                message: `Deleted the role "${deletedName}".`,
            };
        }

        return {
            success: false,
            message: `Unknown AI tool: ${toolName}`,
        };
    } catch (error) {
        console.error(`AI tool "${toolName}" failed:`, error);

        return {
            success: false,
            message: 'The Discord action failed unexpectedly.',
        };
    }
}
