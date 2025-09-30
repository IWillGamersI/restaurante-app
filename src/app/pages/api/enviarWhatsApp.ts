// /pages/api/send-whatsapp.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const templateSid = process.env.TWILIO_TEMPLATE_SID!;
const whatsappFrom = 'whatsapp:+14155238886'; // número oficial Twilio

const client = twilio(accountSid, authToken);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { telefone, pin } = req.body;

  if (!telefone || !pin) return res.status(400).json({ error: 'Telefone ou PIN faltando' });

  try {
    // Envia o template Twilio com variável {{1}} sendo o PIN
    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${telefone}`,
      contentSid: templateSid,
      contentVariables: JSON.stringify({ "1": pin }),
    });

    // Retorna um JSON consistente
    return res.status(200).json({ success: true, sid: message.sid });
  } catch (err: any) {
    console.error('Erro Twilio:', err);
    // Retorna mensagem detalhada de erro
    return res.status(500).json({ error: err?.message || 'Erro ao enviar WhatsApp' });
  }
}
