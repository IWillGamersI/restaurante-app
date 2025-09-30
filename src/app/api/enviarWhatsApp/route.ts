import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = 'whatsapp:+14155238886'; // número oficial Twilio
const templateSid = process.env.TWILIO_TEMPLATE_SID!; // ID do template aprovado no Twilio

const client = twilio(accountSid, authToken);

export async function POST(req: Request) {
  try {
    const { telefone, pin } = await req.json();

    if (!telefone || !pin) {
      return NextResponse.json({ success: false, error: 'Telefone ou PIN faltando' }, { status: 400 });
    }

    // Envia mensagem WhatsApp usando template
    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${telefone}`, // telefone já deve vir no formato +351XXXXXXXXX
      contentSid: templateSid,
      contentVariables: JSON.stringify({ "1": pin }), // {{1}} = PIN
    });

    return NextResponse.json({ success: true, sid: message.sid }, { status: 200 });
  } catch (error: any) {
    console.error('Erro Twilio:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao enviar WhatsApp' }, { status: 500 });
  }
}
