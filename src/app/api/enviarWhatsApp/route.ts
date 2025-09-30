// app/api/enviarWhatsApp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const templateSid = process.env.TWILIO_TEMPLATE_SID!;
const whatsappFrom = 'whatsapp:+14155238886';

const client = twilio(accountSid, authToken);

export async function POST(req: NextRequest) {
  try {
    const { telefone, pin } = await req.json();

    if (!telefone || !pin) {
      return NextResponse.json({ error: 'Telefone ou PIN faltando' }, { status: 400 });
    }

    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${telefone}`,
      contentSid: templateSid,
      contentVariables: JSON.stringify({ "1": pin }),
    });

    return NextResponse.json({ success: true, sid: message.sid });
  } catch (err: any) {
    console.error('Erro Twilio:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao enviar WhatsApp' }, { status: 500 });
  }
}
