const ECONOMY_PREFIX = 'economy:';

export function getEconomyKey(guildId, userId) {
    // Global economy — guildId is intentionally NOT used
    return `${ECONOMY_PREFIX}${userId}`;
}

export async function getEconomyData(client, guildId, userId) {
    const key = getEconomyKey(guildId, userId);

    let data = await client.db.get(key, null);

    if (!data) {
        data = {
            wallet: 0,
            lastDaily: 0,
            lastWork: 0,
        };

        await client.db.set(key, data);
    }

    // Remove old bank data
    if ('bank' in data) delete data.bank;
    if ('bankCapacity' in data) delete data.bankCapacity;

    return data;
}

export async function saveEconomyData(client, guildId, userId, data) {
    const key = getEconomyKey(guildId, userId);

    // Make sure bank data can never come back
    delete data.bank;
    delete data.bankCapacity;

    await client.db.set(key, data);
}

export async function addMoney(client, guildId, userId, amount) {
    const data = await getEconomyData(client, guildId, userId);

    data.wallet = (data.wallet || 0) + amount;

    await saveEconomyData(client, guildId, userId, data);

    return {
        newBalance: data.wallet,
        data,
    };
}

export async function removeMoney(client, guildId, userId, amount) {
    const data = await getEconomyData(client, guildId, userId);

    data.wallet = Math.max(0, (data.wallet || 0) - amount);

    await saveEconomyData(client, guildId, userId, data);

    return {
        newBalance: data.wallet,
        data,
    };
}
