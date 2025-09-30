import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = 'whatsapp:+14155238886'; // número Twilio verificado
const templateSid = process.env.TWILIO_TEMPLATE_SID!; // ID do template aprovado

const client = twilio(accountSid, authToken);

export async function POST(req: Request) {
  try {
    const { telefone, pin } = await req.json();

    if (!telefone || !pin) {
      return NextResponse.json(
        { success: false, error: 'Telefone ou PIN faltando' },
        { status: 400 }
      );
    }

    // Garantir formato E.164
    let telefoneFormatado = telefone;
    if (!telefone.startsWith('+')) {
      telefoneFormatado = `+${telefone.replace(/\D/g, '')}`;
    }

    console.log('Enviando WhatsApp para:', telefoneFormatado, 'PIN:', pin);

    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${telefoneFormatado}`,
      contentSid: templateSid,
      contentVariables: JSON.stringify({ "1": pin }),
    });

    return NextResponse.json({ success: true, sid: message.sid }, { status: 200 });
  } catch (error: any) {
    console.error('Erro Twilio:', error);

    // Mensagem de erro mais clara
    let msg = 'Erro ao enviar WhatsApp';
    if (error.code === 63016 || error.code === 63014) {
      msg = 'Número não permitido ou template não aprovado';
    } else if (error.code === 20404) {
      msg = 'Número de destino inválido ou não registrado no WhatsApp';
    } else if (error.message) {
      msg = error.message;
    }

    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
