import { MessageFlags } from 'discord.js';
import { closeTicket } from '../../services/ticket.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
  handleInteractionError,
} from '../../utils/errorHandler.js';

export default {
  name: 'ticket_close',

  async execute(interaction, client, args) {
    try {
      const reason =
        args?.length
          ? args.join(':')
          : 'Closed via ticket button without a specific reason.';

      const deferred = await InteractionHelper.safeDefer(interaction, {
        flags: MessageFlags.Ephemeral,
      });

      if (!deferred) {
        return;
      }

      await closeTicket(
        interaction.channel,
        interaction.user,
        reason
      );

      await InteractionHelper.safeEditReply(interaction, {
        content: '🔒 Ticket closed successfully.',
      });
    } catch (error) {
      await handleInteractionError(
        interaction,
        error,
        {
          type: 'button',
          customId: interaction.customId,
          handler: 'ticket_close',
        }
      );
    }
  },
};
