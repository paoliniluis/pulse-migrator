// you need to run this with NODE_TLS_REJECT_UNAUTHORIZED=0 as an env variable
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const host = process.env.HOST;
const session_cookie = process.env.SESSION_COOKIE;

const auth_endpoint = `${host}/api/session`;
const collections_endpoint = `${host}/api/collection`;
const pulse_endpoint = `${host}/api/pulse`;
const dashboard_endpoint = `${host}/api/dashboard`;
let token = "";

const main = async () => {
    if (session_cookie) {
        console.log("Bypassing auth");
        token = session_cookie;
    } else {
        console.log("Authenticating");
        token = await authenticate();
    }
    console.log("Authenticated, now getting collections");
    const collections = await getAllCollections(token);
    console.log("Got collections, now getting pulses");
    let pulses = await Promise.all(collections.map(async (collection) => await getAllPulses(collection, token)));
    // Let's clean out a bit the response to work with it
    pulses = pulses.filter(pulse => pulse.length > 0).flat();
    console.log("Got pulses, now getting cards");
    // Now we have all the pulses, let's get the cards with all details to create the dashboards
    let pulseData = await Promise.all(pulses.map(async (pulse) => await getCards(pulse.id, token)))
    
    await Promise.all(pulseData.map(async (pulse) => {
        let dashboardId = await createDashboard(token, pulse.name, pulse.collection)
        const dashboardUrl = `${host}/dashboard/${dashboardId}`
        console.log(`Migrated Pulse: ${pulse.name} (ID: ${pulse.id})`)
        console.log(`Created dashboard: ${pulse.name} (ID: ${dashboardId})`)
        console.log(`Dashboard URL: ${dashboardUrl}`)
        await Promise.all(pulse.cards.map(async (card) => await addCardToDashboard(card, dashboardId, token)));
        console.log(`Added ${pulse.cards.length} cards to dashboard ${dashboardId}`)
        await createSubscription(dashboardId, pulse, token);
        console.log(`Created subscription for dashboard ${dashboardId}`)
        console.log(`Original Pulse URL: ${host}/pulse/${pulse.id}`)
        console.log("---")
    }))
}

const createSubscription = async (dashboard_id: Number, pulse:any, session_cookie: String) => {
    return await fetch(`${pulse_endpoint}`, {
        method: "POST",
        body: JSON.stringify({
            dashboard_id: dashboard_id,
            channels: pulse.channels,
            cards: pulse.cards,
            name: `Migration of pulse ${pulse.name}`,
        }),
        headers: { "Content-Type": "application/json", "Cookie": `metabase.SESSION=${session_cookie}` },
    })
}

const addCardToDashboard = async (card_data: any, dashboard_id: Number, session_cookie: String) => {
    return await fetch(`${dashboard_endpoint}/${dashboard_id}/cards`, {
        method: "PUT",
        body: JSON.stringify({
            cards: [{
                id: -1,
                size_x: 12,
                size_y: 6,
                // we don't care about where the card is placed, let's place all them one of top of each other
                row: 0,
                col: 0,
                card_id: card_data.id,
            }]}),
        headers: { "Content-Type": "application/json", "Cookie": `metabase.SESSION=${session_cookie}` },
    })
};

const authenticate = async (): Promise<string> => {
    const response = await fetch(auth_endpoint, {
        method: "POST",
        body: JSON.stringify({ username: username, password: password }),
        headers: { "Content-Type": "application/json" },
    });

    const data: any = await response.json();
    return data.id;
}

interface PulseData {
    id: number;
    name: string;
    channels: any;
    cards: any;
    collection: Number;

}

const getCards = async (pulse_id: Number, session_cookie: String): Promise<PulseData> => {
    const response = await fetch(`${pulse_endpoint}/${pulse_id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Cookie": `metabase.SESSION=${session_cookie}` },
    });

    let pulseCards: any = await response.json();

    pulseCards.channels.map(channel => {
        delete channel['created_at'];
        delete channel['entity_id'];
        delete channel['created_at'];
        delete channel['updated_at'];
    })

    pulseCards.cards.map(card => {
        delete card['collection_card_id']
    })

    return {
        id: pulseCards.id,
        name: pulseCards.name,
        channels: pulseCards.channels,
        cards: pulseCards.cards,        
        collection: pulseCards.collection_id,
    }

}

const createDashboard = async (session_cookie: String, name: String, collection_id: String): Promise<Number> => {
    const response = await fetch(dashboard_endpoint, {
        method: "POST",
        body: JSON.stringify({
            name: name,
            collection_id: collection_id
        }),
        headers: { "Content-Type": "application/json", "Cookie": `metabase.SESSION=${session_cookie}` },
    });

    const body: any = await response.json();
    return body.id;
}

interface Pulse {
    name: string;
    id: string;
    collection: any;
}


const getAllPulses = async (collection_id: Number, session_cookie: String): Promise<Pulse> => {
    const response = await fetch(`${collections_endpoint}/${collection_id}/items?models=pulse`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Cookie": `metabase.SESSION=${session_cookie}` },
    });
    let pulses: any = await response.json();
    
    if (pulses.total > 0) {
        pulses.data.map(pulse => pulse.collection = collection_id)
    }

    pulses.data.map(pulse => {
        delete pulse['collection_position'];
        delete pulse['database_id'];
        delete pulse['entity_id'];
        delete pulse['model'];
    })
    
    return pulses.data;

}

interface Collections {
    id: string;
}

const getAllCollections = async (session_cookie: String): Promise<Collections> => {
    const response = await fetch(collections_endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Cookie": `metabase.SESSION=${session_cookie}` },
    });
    let data: any = await response.json();
    data = data.map(collection => collection.id)
    return data;
}

main()