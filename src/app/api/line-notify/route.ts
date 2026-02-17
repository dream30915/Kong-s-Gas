import { NextRequest, NextResponse } from 'next/server';

const LINE_API = 'https://api.line.me/v2/bot/message/push';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, groupId } = body;
        const channelToken = process.env.LINE_CHANNEL_TOKEN;
        const targetGroup = groupId || process.env.LINE_GROUP_ID;
        if (!channelToken || !targetGroup) {
            return NextResponse.json({ error: 'LINE credentials not configured' }, { status: 400 });
        }
        const response = await fetch(LINE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${channelToken}` },
            body: JSON.stringify({ to: targetGroup, messages: [{ type: 'text', text: message }] }),
        });
        if (!response.ok) {
            const error = await response.text();
            console.error('LINE API error:', error);
            return NextResponse.json({ error: 'LINE API failed' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('LINE notification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
