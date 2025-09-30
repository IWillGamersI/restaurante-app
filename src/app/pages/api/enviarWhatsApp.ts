import type { NextApiRequest, NextApiResponse } from 'next';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = 'whatsapp:+14155238886'; // número Twilio
const client = twilio(accountSid, authToken);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { telefone, pin } = req.body;
  if (!telefone || !pin) return res.status(400).json({ error: 'Telefone ou PIN faltando' });

  try {
    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${telefone}`,
      contentSid: process.env.TWILIO_TEMPLATE_SID!, // 🔹 template aprovado no Twilio
      contentVariables: JSON.stringify({ "1": pin }) // substitui {{1}} no template
    });

    res.status(200).json({ sid: message.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar WhatsApp' });
  }
}
