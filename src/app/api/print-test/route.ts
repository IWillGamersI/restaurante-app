// src/app/api/print-test/route.ts
import path from 'path';
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pedido, vias = 1 } = body;

    console.log('==========================');
    console.log(`Pedido recebido: ${pedido.codigo}`);
    console.log(`Cliente: ${pedido.cliente}`);
    console.log(`Data: ${new Date(pedido.data).toLocaleString('pt-PT',{
                            timeZone: 'Europe/Lisbon',
                            day:'2-digit',
                            month:'2-digit',
                            year:'numeric',
                            hour:'2-digit',
                            minute:'2-digit'
                        })}`);
    console.log('Produtos:');
    pedido.produtos.forEach((p: any) => {
      console.log(`- ${p.quantidade} x ${p.nome} - €${(p.quantidade * p.preco).toFixed(2)}`);
    });
    if (pedido.extras?.length) {
      console.log('Extras:');
      pedido.extras.forEach((e: any) => console.log(`- ${e.nome}`));
    }
    console.log(`Total: €${Number(pedido.valor).toFixed(2)}`);
    console.log(`Vias: ${vias}`);
    console.log('==========================');

    // Simulação da logo
    const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
    const logoBuffer = await sharp(logoPath)
      .resize(200)
      .flatten({ background: '#FFFFFF' })
      .threshold(128)
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log('Logo processada para impressão (simulação):', {
      width: logoBuffer.info.width,
      height: logoBuffer.info.height,
      length: logoBuffer.data.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Simulação de impressão concluída',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Erro no endpoint print-test:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
