const ECONOMY_PREFIX = 'economy:';

export function getEconomyKey(guildId, userId) {
    return `${ECONOMY_PREFIX}${guildId}:${userId}`;
}

export async function getEconomyData(client, guildId, userId) {
    const key = getEconomyKey(guildId, userId);

    let data = await client.db.get(key, null);

    if (!data) {
        data = {
            wallet: 0,
            bank: 0,
            bankCapacity: 1000,
            lastDaily: 0,
            lastWork: 0,
        };

        await client.db.set(key, data);
    }

    return data;
}

export async function saveEconomyData(client, guildId, userId, data) {
    const key = getEconomyKey(guildId, userId);
    await client.db.set(key, data);
}

export async function addMoney(client, guildId, userId, amount, type = 'wallet') {
    const data = await getEconomyData(client, guildId, userId);

    if (type === 'bank') {
        data.bank += amount;
    } else {
        data.wallet += amount;
    }

    await saveEconomyData(client, guildId, userId, data);

    return {
        newBalance: type === 'bank' ? data.bank : data.wallet,
        data,
    };
}

export async function removeMoney(client, guildId, userId, amount, type = 'wallet') {
    const data = await getEconomyData(client, guildId, userId);

    if (type === 'bank') {
        data.bank = Math.max(0, data.bank - amount);
    } else {
        data.wallet = Math.max(0, data.wallet - amount);
    }

    await saveEconomyData(client, guildId, userId, data);

    return {
        newBalance: type === 'bank' ? data.bank : data.wallet,
        data,
    };
}

export function getMaxBankCapacity(data) {
    return data.bankCapacity || 1000;
}
